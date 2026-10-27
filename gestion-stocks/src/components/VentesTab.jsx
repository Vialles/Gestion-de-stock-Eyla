import { useMemo, useState } from "react";
import { Receipt, Plus, Trash2, TrendingUp } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCollection } from "../lib/useCollection";

function currency(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
}

const MOYENS_PAIEMENT = ["SumUp", "Espèces", "Chèque", "Virement", "Autre"];
const DIRECT = "Direct";
const EMPTY_FORM = { date: "", reference: "", quantite: "1", client: "", montant: "", moyenPaiement: "SumUp", source: "manuel" };
const inputCls = "rounded-md border border-[#e8d9d1] px-3 py-2 text-sm";

export default function VentesTab() {
  const { rows: ventes, add, remove } = useCollection("ventes");
  const { rows: mouvements, remove: removeMouvement } = useCollection("mouvements");
  const { rows: magasins } = useCollection("magasins", "nom");
  const { rows: produits } = useCollection("produits");
  const [form, setForm] = useState(EMPTY_FORM);
  const [filtre, setFiltre] = useState("tous"); // "tous" | "direct" | id d'un magasin

  // Ventes directes + ventes en magasin (issues des mouvements), dans une seule liste
  const toutes = useMemo(() => {
    const directes = ventes.map((v) => ({ ...v, lieu: DIRECT, lieuId: "direct" }));
    const enMagasin = mouvements
      .filter((m) => m.type === "vente")
      .map((m) => {
        const magasin = magasins.find((x) => x.id === m.magasinId);
        const pct = Number(magasin?.commission) || 0;
        const montant = Number(m.montant) || 0;
        return {
          id: `m_${m.id}`,
          mouvementId: m.id,
          date: m.date,
          reference: m.reference,
          quantite: m.quantite,
          client: "",
          montant,
          net: montant - (montant * pct) / 100,
          moyenPaiement: "—",
          lieu: m.magasinNom || magasin?.nom || "Magasin",
          lieuId: m.magasinId,
          source: "magasin",
        };
      });
    return [...directes, ...enMagasin].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [ventes, mouvements, magasins]);

  const affichees = toutes.filter((v) => filtre === "tous" || v.lieuId === filtre);
  const totalVentes = affichees.reduce((s, v) => s + Number(v.montant || 0), 0);

  // Sélection d'un produit : préremplit le montant avec (prix de vente x quantité)
  function handleReferenceChange(reference) {
    const produit = produits.find((p) => p.reference === reference);
    const quantite = Number(form.quantite) || 1;
    setForm({ ...form, reference, montant: produit?.prixVente ? String(Number(produit.prixVente) * quantite) : form.montant });
  }

  function handleQuantiteChange(quantite) {
    const produit = produits.find((p) => p.reference === form.reference);
    setForm({ ...form, quantite, montant: produit?.prixVente ? String(Number(produit.prixVente) * (Number(quantite) || 0)) : form.montant });
  }

  // Vente directe (atelier / SumUp...) : décrémente le stock atelier du produit
  async function handleAdd() {
    if (!form.reference) return;
    const quantiteVendue = Number(form.quantite) || 0;
    await add({ ...form, quantite: quantiteVendue, montant: Number(form.montant) || 0 });

    const produit = produits.find((p) => p.reference === form.reference);
    if (produit) {
      await updateDoc(doc(db, "produits", produit.id), { ventes: (Number(produit.ventes) || 0) + quantiteVendue });
    }
    setForm(EMPTY_FORM);
  }

  function handleRemove(v) {
    if (v.mouvementId) {
      if (!confirm("Cette vente a été saisie dans un magasin : la supprimer remettra l'article en stock dans ce magasin. Continuer ?")) return;
      removeMouvement(v.mouvementId);
    } else {
      remove(v.id);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-peche/40">
            <Receipt size={22} color="#a83b0b" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-xl font-semibold font-display text-[#3a2318]">Ventes</h2>
            <p className="text-sm opacity-60 text-[#3a2318]">{affichees.length} vente(s) · {currency(totalVentes)} de CA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className={`${inputCls} bg-white`}>
            <option value="tous">Tous les lieux de vente</option>
            <option value="direct">{DIRECT} (atelier, SumUp…)</option>
            {magasins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#e9f5ea] text-[#2f7a3d]">
            <TrendingUp size={13} /> Ventes SumUp synchronisées automatiquement
          </div>
        </div>
      </div>

      <div className="mb-2 text-xs opacity-60 text-[#3a2318]">
        Ce formulaire sert aux ventes directes. Les ventes en magasin se saisissent dans l'onglet Magasins (relevé de ventes) et apparaissent ici automatiquement.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 rounded-xl bg-[#fdf8f5] border border-[#f2e6df]">
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Date</span>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Référence produit</span>
          <select value={form.reference} onChange={(e) => handleReferenceChange(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {produits.map((p) => <option key={p.id} value={p.reference}>{p.reference} — {p.produit}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Quantité</span>
          <input type="number" value={form.quantite} onChange={(e) => handleQuantiteChange(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Client</span>
          <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Montant</span>
          <input type="number" step="0.01" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className={inputCls} />
          <span className="text-xs opacity-50">Prérempli depuis le prix de vente, modifiable</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Moyen de paiement</span>
          <select value={form.moyenPaiement} onChange={(e) => setForm({ ...form, moyenPaiement: e.target.value })} className={inputCls}>
            {MOYENS_PAIEMENT.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button onClick={handleAdd} className="w-full rounded-md px-3 py-2 text-sm font-medium text-white flex items-center justify-center gap-1.5 bg-rouille hover:opacity-90 transition">
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#eee0d8]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-peche/40">
              {["Date", "Référence", "Quantité", "Client", "Montant", "Net après commission", "Paiement", "Lieu de vente", "Source"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap text-[#8a3d0c]">{h}</th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {affichees.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 opacity-50 text-[#3a2318]">Aucune vente pour le moment</td></tr>
            )}
            {affichees.map((r, i) => (
              <tr key={r.id} className={`border-t border-[#f2e6df] ${i % 2 ? "bg-[#fffdfb]" : "bg-white"}`}>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.date}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.reference}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.quantite}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.client}</td>
                <td className="px-4 py-2.5 font-semibold text-[#3a2318]">{currency(r.montant)}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.source === "magasin" ? currency(r.net) : "—"}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.moyenPaiement || "—"}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.lieu}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.source === "sumup" ? "bg-[#e9f5ea] text-[#2f7a3d]" : r.source === "magasin" ? "bg-[#e3ecfb] text-[#2952a3]" : "bg-[#f4e2da] text-rouille"}`}>
                    {r.source === "sumup" ? "SumUp" : r.source === "magasin" ? "Magasin" : "Manuel"}
                  </span>
                </td>
                <td className="px-2 text-center">
                  <button onClick={() => handleRemove(r)} className="opacity-30 hover:opacity-100 transition p-1">
                    <Trash2 size={15} color="#a83b0b" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
