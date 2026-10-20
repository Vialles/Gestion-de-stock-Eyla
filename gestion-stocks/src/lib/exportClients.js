import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db, ensureAuth } from "../firebase";

// Construit la liste des clients à partir des commandes saisies dans l'appli
// (un même client est regroupé via son email, sinon son téléphone, sinon son nom).
function clientKey(c) {
  const email = (c.clientEmail || "").trim().toLowerCase();
  const tel = (c.clientTelephone || "").replace(/\D/g, "");
  const nom = (c.clientNom || "").trim().toLowerCase();
  return email || tel || nom;
}

export async function exportClientsToExcel() {
  await ensureAuth();
  const snap = await getDocs(collection(db, "commandes"));
  const commandes = snap.docs.map((d) => d.data());

  const clients = new Map();
  for (const c of commandes) {
    const key = clientKey(c);
    if (!key) continue; // commande sans aucune info client

    if (!clients.has(key)) {
      clients.set(key, {
        nom: c.clientNom || "",
        telephone: c.clientTelephone || "",
        email: c.clientEmail || "",
        commandes: 0,
        produits: [],
        total: 0,
        derniere: "",
      });
    }
    const cl = clients.get(key);
    // complète les infos manquantes avec celles d'une autre commande du même client
    cl.nom = cl.nom || c.clientNom || "";
    cl.telephone = cl.telephone || c.clientTelephone || "";
    cl.email = cl.email || c.clientEmail || "";
    cl.commandes += 1;
    if (c.produit) cl.produits.push(c.produit);
    cl.total += Number(c.prixVente) || 0;
    if ((c.dateDebut || "") > cl.derniere) cl.derniere = c.dateDebut || "";
  }

  const rows = [...clients.values()]
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
    .map((cl) => ({
      "Nom": cl.nom,
      "Téléphone": cl.telephone,
      "Email": cl.email,
      "Nombre de commandes": cl.commandes,
      "Produits commandés": cl.produits.join(", "),
      "Montant total (€)": cl.total,
      "Dernière commande": cl.derniere,
    }));

  const ws = XLSX.utils.json_to_sheet(rows);
  if (rows.length) {
    const keys = Object.keys(rows[0]);
    ws["!cols"] = keys.map((k) => ({
      wch: Math.min(60, Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2),
    }));
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `gestion-stocks_clients_${date}.xlsx`);
  return rows.length;
}
