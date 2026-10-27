// Calculs de stock à partir de la liste des mouvements (collection "mouvements").
// Types de mouvement :
//   depot       atelier -> magasin   (stock atelier -, stock magasin +)
//   retour      magasin -> atelier   (stock atelier +, stock magasin -)
//   vente       vente en magasin     (stock magasin -, n'affecte pas l'atelier)
//   ajustement  correction/inventaire du stock magasin (quantité signée, n'affecte pas l'atelier)

export const TYPE_LABELS = {
  depot: "Dépôt",
  retour: "Retour",
  vente: "Vente",
  ajustement: "Ajustement",
};

const n = (v) => Number(v) || 0;

// Variation du stock magasin pour un mouvement
function magasinDelta(m) {
  const q = n(m.quantite);
  if (m.type === "depot") return q;
  if (m.type === "retour" || m.type === "vente") return -q;
  if (m.type === "ajustement") return q;
  return 0;
}

// Stock d'un magasin : { [reference]: { reference, produit, quantite } }
export function stockMagasin(mouvements, magasinId) {
  const stock = {};
  for (const m of mouvements) {
    if (m.magasinId !== magasinId) continue;
    const s = (stock[m.reference] ||= { reference: m.reference, produit: m.produit, quantite: 0 });
    s.quantite += magasinDelta(m);
  }
  return stock;
}

// Totaux par référence, tous magasins confondus
export function totauxParReference(mouvements) {
  const atelierDelta = {}; // variation du stock atelier (dépôts -, retours +)
  const enMagasin = {};    // quantité actuellement en magasin
  const venduMagasin = {}; // quantité vendue en magasin
  for (const m of mouvements) {
    const ref = m.reference;
    const q = n(m.quantite);
    if (m.type === "depot") atelierDelta[ref] = (atelierDelta[ref] || 0) - q;
    if (m.type === "retour") atelierDelta[ref] = (atelierDelta[ref] || 0) + q;
    if (m.type === "vente") venduMagasin[ref] = (venduMagasin[ref] || 0) + q;
    enMagasin[ref] = (enMagasin[ref] || 0) + magasinDelta(m);
  }
  return { atelierDelta, enMagasin, venduMagasin };
}

// Stock atelier d'un produit = stock initial - ventes directes + variations liées aux magasins
export function stockAtelier(produit, atelierDelta) {
  return n(produit.stockInitial) - n(produit.ventes) + (atelierDelta[produit.reference] || 0);
}

// Quantité à fabriquer pour atteindre le stock cible (atelier + magasins)
export function aFabriquer(produit, atelierDelta, enMagasin) {
  const cible = n(produit.stockCible);
  if (cible <= 0) return 0;
  const total = stockAtelier(produit, atelierDelta) + (enMagasin[produit.reference] || 0);
  return Math.max(0, cible - total);
}

// Relevé d'un magasin sur une période : ventes, commission, net à percevoir
export function releveMagasin(mouvements, magasin, debut, fin) {
  const ventes = mouvements.filter(
    (m) => m.magasinId === magasin.id && m.type === "vente" &&
      (!debut || m.date >= debut) && (!fin || m.date <= fin)
  );
  const quantite = ventes.reduce((s, m) => s + n(m.quantite), 0);
  const ca = ventes.reduce((s, m) => s + n(m.montant), 0);
  const pct = n(magasin.commission);
  const commission = (ca * pct) / 100;
  return { ventes, quantite, ca, pct, commission, net: ca - commission };
}
