import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db, ensureAuth } from "../firebase";
import { stockMagasin, totauxParReference, stockAtelier, aFabriquer, TYPE_LABELS } from "./stock";

async function fetchAll(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const n = (v) => Number(v) || 0;

function formatProduits(produits, mouvements) {
  const { atelierDelta, enMagasin, venduMagasin } = totauxParReference(mouvements);
  return produits.map((r) => ({
    "Date fabrication": r.date || "",
    "Produit": r.produit || "",
    "Catégorie": r.categorie || "",
    "Référence": r.reference || "",
    "Dimension": r.dimension || "",
    "Poids": r.poids || "",
    "Temps de fabrication": r.tempsFabrication || "",
    "Coût matière": n(r.coutMatiere),
    "Prix de vente": n(r.prixVente),
    "Stock initial": n(r.stockInitial),
    "Stock cible": n(r.stockCible),
    "Ventes directes": n(r.ventes),
    "Vendu en magasin": venduMagasin[r.reference] || 0,
    "Stock atelier": stockAtelier(r, atelierDelta),
    "En magasin": enMagasin[r.reference] || 0,
    "À fabriquer": aFabriquer(r, atelierDelta, enMagasin),
  }));
}

function formatAchats(rows) {
  return rows.map((r) => ({
    "Date d'achat": r.date || "",
    "Fournisseur": r.fournisseur || "",
    "Catégorie": r.categorie || "",
    "Identification": r.identification || "",
    "Prix unitaire HT": n(r.prixUnitaire),
    "Quantité": n(r.quantite),
    "PA total": n(r.prixUnitaire) * n(r.quantite),
    "Pièces fabriquées": n(r.piecesFab1),
  }));
}

// Ventes directes + ventes en magasin
function formatVentes(ventes, mouvements, magasins) {
  const directes = ventes.map((r) => ({
    "Date": r.date || "",
    "Référence": r.reference || "",
    "Quantité": n(r.quantite),
    "Client": r.client || "",
    "Montant": n(r.montant),
    "Net après commission": "",
    "Moyen de paiement": r.moyenPaiement || "",
    "Lieu de vente": "Direct",
    "Source": r.source === "sumup" ? "SumUp" : "Manuel",
  }));
  const enMagasin = mouvements.filter((m) => m.type === "vente").map((m) => {
    const magasin = magasins.find((x) => x.id === m.magasinId);
    const montant = n(m.montant);
    return {
      "Date": m.date || "",
      "Référence": m.reference || "",
      "Quantité": n(m.quantite),
      "Client": "",
      "Montant": montant,
      "Net après commission": montant - (montant * n(magasin?.commission)) / 100,
      "Moyen de paiement": "",
      "Lieu de vente": m.magasinNom || magasin?.nom || "",
      "Source": "Magasin",
    };
  });
  return [...directes, ...enMagasin].sort((a, b) => String(a["Date"]).localeCompare(String(b["Date"])));
}

function formatCommandes(rows) {
  return rows.map((r) => ({
    "Produit": r.produit || "",
    "Référence": r.reference || "",
    "Client": r.clientNom || "",
    "Téléphone": r.clientTelephone || "",
    "Email": r.clientEmail || "",
    "Temps de réalisation": r.tempsRealisation || "",
    "Coût matière": n(r.coutMatiere),
    "Prix de vente": n(r.prixVente),
    "Début": r.dateDebut || "",
    "Livraison prévue": r.dateFin || "",
    "Statut": r.statut || "",
  }));
}

// Stock actuel de chaque magasin
function formatStockMagasins(magasins, mouvements) {
  return magasins.flatMap((m) =>
    Object.values(stockMagasin(mouvements, m.id))
      .filter((s) => s.quantite !== 0)
      .map((s) => ({
        "Magasin": m.nom || "",
        "Adresse": m.adresse || "",
        "Téléphone": m.telephone || "",
        "Contact": m.contact || "",
        "Commission (%)": n(m.commission),
        "Référence produit": s.reference,
        "Produit": s.produit,
        "Quantité en stock": s.quantite,
      }))
  );
}

function formatMouvements(mouvements) {
  return [...mouvements]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .map((m) => ({
      "Date": m.date || "",
      "Magasin": m.magasinNom || "",
      "Type": TYPE_LABELS[m.type] || m.type || "",
      "Référence": m.reference || "",
      "Produit": m.produit || "",
      "Quantité": n(m.quantite),
      "Montant": m.type === "vente" ? n(m.montant) : "",
      "Note": m.note || "",
    }));
}

function addSheet(wb, rows, name) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (rows.length) {
    const keys = Object.keys(rows[0]);
    ws["!cols"] = keys.map((k) => ({ wch: Math.min(50, Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2) }));
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export async function exportToExcel() {
  await ensureAuth();
  const [produits, achats, ventes, commandes, magasins, mouvements] = await Promise.all([
    fetchAll("produits"), fetchAll("achats"), fetchAll("ventes"),
    fetchAll("commandes"), fetchAll("magasins"), fetchAll("mouvements"),
  ]);

  const wb = XLSX.utils.book_new();
  addSheet(wb, formatProduits(produits, mouvements), "Produits");
  addSheet(wb, formatAchats(achats), "Achats");
  addSheet(wb, formatVentes(ventes, mouvements, magasins), "Ventes");
  addSheet(wb, formatCommandes(commandes), "Commandes");
  addSheet(wb, formatStockMagasins(magasins, mouvements), "Stock magasins");
  addSheet(wb, formatMouvements(mouvements), "Mouvements magasins");

  XLSX.writeFile(wb, `gestion-stocks_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
