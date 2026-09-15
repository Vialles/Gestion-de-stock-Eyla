import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db, ensureAuth } from "../firebase";

async function fetchAll(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => d.data());
}

function formatProduits(rows) {
  return rows.map((r) => ({
    "Date fabrication": r.date || "",
    "Produit": r.produit || "",
    "Catégorie": r.categorie || "",
    "Référence": r.reference || "",
    "Dimension": r.dimension || "",
    "Poids": r.poids || "",
    "Temps de fabrication": r.tempsFabrication || "",
    "Coût matière": Number(r.coutMatiere) || 0,
    "Prix de vente": Number(r.prixVente) || 0,
    "Stock initial": Number(r.stockInitial) || 0,
    "Ventes": Number(r.ventes) || 0,
    "Stock restant": (Number(r.stockInitial) || 0) - (Number(r.ventes) || 0),
  }));
}

function formatAchats(rows) {
  return rows.map((r) => ({
    "Date d'achat": r.date || "",
    "Fournisseur": r.fournisseur || "",
    "Catégorie": r.categorie || "",
    "Identification": r.identification || "",
    "Prix unitaire HT": Number(r.prixUnitaire) || 0,
    "Quantité": Number(r.quantite) || 0,
    "PA total": (Number(r.prixUnitaire) || 0) * (Number(r.quantite) || 0),
    "Pièces fabriquées": Number(r.piecesFab1) || 0,
  }));
}

function formatVentes(rows) {
  return rows.map((r) => ({
    "Date": r.date || "",
    "Référence": r.reference || "",
    "Quantité": Number(r.quantite) || 0,
    "Client": r.client || "",
    "Montant": Number(r.montant) || 0,
    "Moyen de paiement": r.moyenPaiement || "",
    "Source": r.source === "sumup" ? "SumUp" : "Manuel",
  }));
}

function formatCommandes(rows) {
  return rows.map((r) => ({
    "Produit": r.produit || "",
    "Référence": r.reference || "",
    "Client": r.clientNom || "",
    "Téléphone": r.clientTelephone || "",
    "Email": r.clientEmail || "",
    "Temps de réalisation": r.tempsRealisation || "",
    "Coût matière": Number(r.coutMatiere) || 0,
    "Prix de vente": Number(r.prixVente) || 0,
    "Début": r.dateDebut || "",
    "Livraison prévue": r.dateFin || "",
    "Statut": r.statut || "",
  }));
}

function formatMagasins(magasins, stocks) {
  return stocks.map((s) => {
    const magasin = magasins.find((m) => m.id === s.magasinId) || {};
    return {
      "Magasin": magasin.nom || "",
      "Adresse": magasin.adresse || "",
      "Téléphone": magasin.telephone || "",
      "Contact": magasin.contact || "",
      "Référence produit": s.reference || "",
      "Produit": s.produit || "",
      "Quantité en stock": Number(s.quantite) || 0,
    };
  });
}

function autoWidth(sheet, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  sheet["!cols"] = keys.map((k) => ({
    wch: Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2,
  }));
}

function addSheet(wb, rows, name) {
  const ws = XLSX.utils.json_to_sheet(rows);
  autoWidth(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export async function exportToExcel() {
  await ensureAuth();
  const [produitsRaw, achatsRaw, ventesRaw, commandesRaw, magasinsRaw, stocksRaw] = await Promise.all([
    fetchAll("produits"),
    fetchAll("achats"),
    fetchAll("ventes"),
    fetchAll("commandes"),
    fetchAll("magasins"),
    fetchAll("stocksMagasins"),
  ]);

  // fetchAll ne renvoie pas les IDs des documents (nécessaires pour relier magasins <-> stocksMagasins)
  const magasinsSnap = await getDocs(collection(db, "magasins"));
  const magasins = magasinsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const wb = XLSX.utils.book_new();
  addSheet(wb, formatProduits(produitsRaw), "Produits");
  addSheet(wb, formatAchats(achatsRaw), "Achats");
  addSheet(wb, formatVentes(ventesRaw), "Ventes");
  addSheet(wb, formatCommandes(commandesRaw), "Commandes");
  addSheet(wb, formatMagasins(magasins, stocksRaw), "Magasins");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `gestion-stocks_${date}.xlsx`);
}
