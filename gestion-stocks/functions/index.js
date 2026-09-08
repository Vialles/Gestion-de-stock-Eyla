/**
 * Cloud Functions du projet gestion-stocks
 * -------------------------------------------------------------
 * 1. Intégration SumUp (OAuth, catalogue, webhook ventes)
 * 2. Sauvegarde automatique hebdomadaire de toutes les données Firestore
 *
 * Config attendue (secrets, voir README) :
 *   SUMUP_CLIENT_ID, SUMUP_CLIENT_SECRET, SUMUP_REDIRECT_URI
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

const SUMUP_CLIENT_ID = defineSecret("SUMUP_CLIENT_ID");
const SUMUP_CLIENT_SECRET = defineSecret("SUMUP_CLIENT_SECRET");
const SUMUP_REDIRECT_URI = defineSecret("SUMUP_REDIRECT_URI");

const SUMUP_AUTH_BASE = "https://api.sumup.com";

// ============================================================
// SumUp
// ============================================================

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
        moyenPaiement: "SumUp",
        source: "sumup",
        createdAt: Date.now(),
      });

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

// ============================================================
// Sauvegarde automatique hebdomadaire
// ============================================================

const BACKUP_COLLECTIONS = ["produits", "achats", "ventes", "commandes"];
const KEEP_LAST_N_BACKUPS = 8; // ~2 mois d'historique à raison d'une sauvegarde par semaine

async function runBackup() {
  const backup = { createdAt: new Date().toISOString(), collections: {} };

  for (const name of BACKUP_COLLECTIONS) {
    const snap = await db.collection(name).get();
    backup.collections[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const fileName = `backups/backup-${backup.createdAt.slice(0, 10)}.json`;
  const bucket = admin.storage().bucket();
  const file = bucket.file(fileName);
  await file.save(JSON.stringify(backup, null, 2), {
    contentType: "application/json",
  });

  // Nettoyage : ne garde que les N sauvegardes les plus récentes
  const [files] = await bucket.getFiles({ prefix: "backups/backup-" });
  const sorted = files.sort((a, b) => (a.name < b.name ? 1 : -1)); // plus récent en premier
  const toDelete = sorted.slice(KEEP_LAST_N_BACKUPS);
  await Promise.all(toDelete.map((f) => f.delete().catch(() => {})));

  return fileName;
}

// Sauvegarde automatique tous les lundis à 3h (heure de Paris)
exports.scheduledBackup = onSchedule(
  { schedule: "every monday 03:00", timeZone: "Europe/Paris" },
  async () => {
    const fileName = await runBackup();
    console.log(`Sauvegarde créée : ${fileName}`);
  }
);

// Permet aussi de déclencher une sauvegarde manuellement depuis l'appli (bouton "Sauvegarder")
exports.manualBackup = onRequest(async (req, res) => {
  try {
    const fileName = await runBackup();
    res.json({ ok: true, file: fileName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Échec de la sauvegarde" });
  }
});
