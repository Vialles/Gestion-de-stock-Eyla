/**
 * Cloud Functions - intégration SumUp
 * -------------------------------------------------------------
 * Ces fonctions vivent côté serveur car SUMUP_CLIENT_SECRET ne doit
 * jamais être exposé dans le code client (voir .env.example).
 *
 * Config attendue (firebase functions:config:set ou .env en v2) :
 *   SUMUP_CLIENT_ID, SUMUP_CLIENT_SECRET, SUMUP_REDIRECT_URI
 *
 * Flux :
 *  1. sumupAuthUrl        -> génère l'URL d'autorisation OAuth SumUp
 *  2. sumupAuthCallback   -> échange le code contre un access/refresh token,
 *                            stocké dans Firestore (collection "integrations/sumup")
 *  3. syncSumupCatalog    -> récupère le catalogue produits SumUp et
 *                            met à jour la collection "produits"
 *  4. sumupWebhook        -> reçoit les notifications de vente SumUp et
 *                            ajoute une ligne dans "ventes" (source: "sumup"),
 *                            puis décrémente le stock du produit correspondant
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

const SUMUP_CLIENT_ID = defineSecret("SUMUP_CLIENT_ID");
const SUMUP_CLIENT_SECRET = defineSecret("SUMUP_CLIENT_SECRET");
const SUMUP_REDIRECT_URI = defineSecret("SUMUP_REDIRECT_URI");

const SUMUP_AUTH_BASE = "https://api.sumup.com";

// 1. URL d'autorisation à ouvrir côté client pour connecter le compte SumUp
exports.sumupAuthUrl = onRequest(
  { secrets: [SUMUP_CLIENT_ID, SUMUP_REDIRECT_URI] },
  (req, res) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: SUMUP_CLIENT_ID.value(),
      redirect_uri: SUMUP_REDIRECT_URI.value(),
      scope: "transactions.history products payment_instruments.read",
    });
    res.redirect(`${SUMUP_AUTH_BASE}/authorize?${params.toString()}`);
  }
);

// 2. Callback OAuth : échange le "code" contre des tokens, sauvegardés dans Firestore
exports.sumupAuthCallback = onRequest(
  { secrets: [SUMUP_CLIENT_ID, SUMUP_CLIENT_SECRET, SUMUP_REDIRECT_URI] },
  async (req, res) => {
    try {
      const { code } = req.query;
      const { data } = await axios.post(`${SUMUP_AUTH_BASE}/token`, {
        grant_type: "authorization_code",
        client_id: SUMUP_CLIENT_ID.value(),
        client_secret: SUMUP_CLIENT_SECRET.value(),
        redirect_uri: SUMUP_REDIRECT_URI.value(),
        code,
      });

      await db.collection("integrations").doc("sumup").set({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
        connectedAt: Date.now(),
      });

      res.send("Compte SumUp connecté avec succès. Vous pouvez fermer cette page.");
    } catch (err) {
      console.error(err.response?.data || err.message);
      res.status(500).send("Échec de la connexion SumUp.");
    }
  }
);

// Rafraîchit le token si besoin
async function getValidAccessToken() {
  const ref = db.collection("integrations").doc("sumup");
  const snap = await ref.get();
  if (!snap.exists) throw new Error("SumUp non connecté");
  const data = snap.data();

  if (Date.now() < data.expires_at - 60_000) return data.access_token;

  const { data: refreshed } = await axios.post(`${SUMUP_AUTH_BASE}/token`, {
    grant_type: "refresh_token",
    client_id: SUMUP_CLIENT_ID.value(),
    client_secret: SUMUP_CLIENT_SECRET.value(),
    refresh_token: data.refresh_token,
  });

  await ref.set({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: Date.now() + refreshed.expires_in * 1000,
  }, { merge: true });

  return refreshed.access_token;
}

// 3. Synchronise le catalogue produits SumUp -> Firestore "produits"
// À appeler manuellement (bouton "Synchroniser" côté app) ou via un scheduler.
exports.syncSumupCatalog = onRequest(
  { secrets: [SUMUP_CLIENT_ID, SUMUP_CLIENT_SECRET] },
  async (req, res) => {
    try {
      const token = await getValidAccessToken();
      const { data } = await axios.get(`${SUMUP_AUTH_BASE}/v0.1/me/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const batch = db.batch();
      (data.items || []).forEach((item) => {
        const ref = db.collection("produits").doc(`sumup_${item.id}`);
        batch.set(ref, {
          produit: item.name,
          reference: item.tracking_id || item.id,
          categorie: item.category || "",
          sumupId: item.id,
          source: "sumup",
        }, { merge: true });
      });
      await batch.commit();

      res.json({ synced: data.items?.length || 0 });
    } catch (err) {
      console.error(err.response?.data || err.message);
      res.status(500).json({ error: "Échec de la synchronisation du catalogue" });
    }
  }
);

// 4. Webhook SumUp : appelé par SumUp à chaque transaction.
// Configurer l'URL de cette fonction dans le dashboard développeur SumUp.
exports.sumupWebhook = onRequest(async (req, res) => {
  try {
    const event = req.body;

    if (event.event_type === "TRANSACTION.SUCCESSFUL") {
      const tx = event.payload;

      await db.collection("ventes").add({
        date: new Date(tx.timestamp).toISOString().slice(0, 10),
        reference: tx.product_tracking_id || tx.id,
        quantite: tx.quantity || 1,
        client: tx.customer_name || "",
        montant: tx.amount,
        source: "sumup",
        createdAt: Date.now(),
      });

      // Décrémente le stock du produit correspondant, si trouvé par référence
      const prodSnap = await db.collection("produits")
        .where("reference", "==", tx.product_tracking_id)
        .limit(1)
        .get();

      if (!prodSnap.empty) {
        const doc = prodSnap.docs[0];
        const current = doc.data();
        await doc.ref.update({ ventes: (current.ventes || 0) + (tx.quantity || 1) });
      }
    }

    res.status(200).send("ok");
  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});
