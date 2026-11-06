import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  WidthType, AlignmentType, ShadingType, BorderStyle, VerticalAlign,
} from "docx";

const ENTREPRISE = "Eyla Création";
const ROUILLE = "A83B0B";
const PECHE_CLAIR = "F4E2DA";
const BORD = "E8D9D1";

// Largeurs en DXA (1/20 de point) — page A4 portrait avec marges de 2 cm : 9638
const COLS = [1500, 1300, 3000, 700, 1600, 1538];
const LARGEUR = COLS.reduce((a, b) => a + b, 0);

const n = (v) => Number(v) || 0;
const euro = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v).replace(/[\u202f\u00a0]/g, " ");
const dateFr = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

const bordure = { style: BorderStyle.SINGLE, size: 4, color: BORD };
const bordures = { top: bordure, bottom: bordure, left: bordure, right: bordure };

function cell(text, width, opts = {}) {
  const { bold = false, color, fill, align = AlignmentType.LEFT, span } = opts;
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: span,
    borders: bordures,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : undefined,
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text: String(text ?? ""), bold, color, size: 20, font: "Calibri" })] })],
  });
}

// Lignes de dépôt (une par produit et par date) pour un magasin sur une période
export function lignesDepot(mouvements, magasin, produits, debut, fin) {
  return mouvements
    .filter((m) => m.magasinId === magasin.id && m.type === "depot" && (!debut || m.date >= debut) && (!fin || m.date <= fin))
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.reference || "").localeCompare(b.reference || ""))
    .map((m) => {
      const prix = n(produits.find((p) => p.reference === m.reference)?.prixVente);
      return { date: m.date, reference: m.reference, produit: m.produit, quantite: n(m.quantite), prix, total: prix * n(m.quantite) };
    });
}

export function construireDocument(magasin, lignes, debut, fin) {
  const infos = [
    ["Entreprise", ENTREPRISE],
    ["Magasin", magasin.nom || ""],
    ...(magasin.adresse ? [["Adresse", magasin.adresse]] : []),
    ...(magasin.contact ? [["Contact", magasin.contact + (magasin.telephone ? ` — ${magasin.telephone}` : "")]] : []),
    ["Période", `du ${dateFr(debut) || "…"} au ${dateFr(fin) || "…"}`],
    ["Édité le", dateFr(new Date().toISOString().slice(0, 10))],
  ];

  const tableInfos = new Table({
    width: { size: LARGEUR, type: WidthType.DXA },
    columnWidths: [2200, LARGEUR - 2200],
    rows: infos.map(([label, valeur]) =>
      new TableRow({
        children: [
          cell(label, 2200, { bold: true, fill: PECHE_CLAIR, color: "3A2318" }),
          cell(valeur, LARGEUR - 2200, { bold: label === "Magasin" || label === "Entreprise" }),
        ],
      })
    ),
  });

  const entetes = ["Date de dépôt", "Référence", "Produit", "Qté", "Prix unitaire", "Total"];
  const rowEntete = new TableRow({
    tableHeader: true,
    children: entetes.map((h, i) =>
      cell(h, COLS[i], { bold: true, color: "FFFFFF", fill: ROUILLE, align: i >= 3 ? AlignmentType.RIGHT : AlignmentType.LEFT })
    ),
  });

  const rowsDonnees = lignes.map((l, idx) => {
    const fill = idx % 2 ? "FFFDFB" : undefined;
    return new TableRow({
      cantSplit: true,
      children: [
        cell(dateFr(l.date), COLS[0], { fill }),
        cell(l.reference, COLS[1], { fill }),
        cell(l.produit, COLS[2], { fill }),
        cell(l.quantite, COLS[3], { fill, align: AlignmentType.RIGHT }),
        cell(l.prix > 0 ? euro(l.prix) : "—", COLS[4], { fill, align: AlignmentType.RIGHT }),
        cell(l.prix > 0 ? euro(l.total) : "—", COLS[5], { fill, align: AlignmentType.RIGHT }),
      ],
    });
  });

  const totalQte = lignes.reduce((s, l) => s + l.quantite, 0);
  const totalValeur = lignes.reduce((s, l) => s + l.total, 0);
  const rowTotal = new TableRow({
    children: [
      cell("Total", COLS[0] + COLS[1] + COLS[2], { bold: true, fill: PECHE_CLAIR, span: 3 }),
      cell(totalQte, COLS[3], { bold: true, fill: PECHE_CLAIR, align: AlignmentType.RIGHT }),
      cell("", COLS[4], { fill: PECHE_CLAIR }),
      cell(euro(totalValeur), COLS[5], { bold: true, fill: PECHE_CLAIR, align: AlignmentType.RIGHT }),
    ],
  });

  const tableDepots = new Table({
    width: { size: LARGEUR, type: WidthType.DXA },
    columnWidths: COLS,
    rows: [rowEntete, ...rowsDonnees, rowTotal],
  });

  return new Document({
    creator: ENTREPRISE,
    title: `Relevé de dépôt — ${magasin.nom}`,
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: "RELEVÉ DE DÉPÔT", bold: true, size: 36, color: ROUILLE, font: "Calibri" })],
          }),
          tableInfos,
          new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "Produits déposés", bold: true, size: 24, color: "3A2318", font: "Calibri" })] }),
          tableDepots,
          new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: "Les prix indiqués sont les prix de vente des produits.", italics: true, size: 18, color: "7A6A62", font: "Calibri" })],
          }),
        ],
      },
    ],
  });
}

// Génère et télécharge le relevé de dépôt (Word). Retourne le nombre de lignes exportées.
export async function exportDepotWord(mouvements, magasin, produits, debut, fin) {
  const lignes = lignesDepot(mouvements, magasin, produits, debut, fin);
  if (lignes.length === 0) return 0;

  const blob = await Packer.toBlob(construireDocument(magasin, lignes, debut, fin));
  const nom = (magasin.nom || "magasin").replace(/[^\w-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `releve_depot_${nom}_${debut || "debut"}_${fin || "fin"}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  return lignes.length;
}
