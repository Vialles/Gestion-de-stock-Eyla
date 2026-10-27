import * as XLSX from "xlsx";
import { releveMagasin } from "./stock";

// Exporte le relevé de ventes d'un magasin sur une période (Excel)
export function exportReleveExcel(mouvements, magasin, debut, fin) {
  const r = releveMagasin(mouvements, magasin, debut, fin);

  const lignes = r.ventes
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .map((m) => ({
      "Date": m.date || "",
      "Référence": m.reference || "",
      "Produit": m.produit || "",
      "Quantité": Number(m.quantite) || 0,
      "Montant (€)": Number(m.montant) || 0,
    }));

  const resume = [
    { "Indicateur": "Magasin", "Valeur": magasin.nom },
    { "Indicateur": "Période", "Valeur": `${debut || "…"} → ${fin || "…"}` },
    { "Indicateur": "Articles vendus", "Valeur": r.quantite },
    { "Indicateur": "Chiffre d'affaires (€)", "Valeur": r.ca },
    { "Indicateur": `Commission du magasin (${r.pct} %) (€)`, "Valeur": r.commission },
    { "Indicateur": "Net à percevoir (€)", "Valeur": r.net },
  ];

  const wb = XLSX.utils.book_new();
  const wsResume = XLSX.utils.json_to_sheet(resume);
  wsResume["!cols"] = [{ wch: 36 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsResume, "Résumé");
  const wsLignes = XLSX.utils.json_to_sheet(lignes);
  wsLignes["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsLignes, "Ventes");

  const nom = (magasin.nom || "magasin").replace(/[^\w-]+/g, "_");
  XLSX.writeFile(wb, `releve_${nom}_${debut || "debut"}_${fin || "fin"}.xlsx`);
}
