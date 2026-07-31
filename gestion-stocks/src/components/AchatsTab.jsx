import { useMemo, useState } from "react";
import { ShoppingBag, Plus, Trash2 } from "lucide-react";
import { useCollection } from "../lib/useCollection";

const CATEGORIES_ACHAT = ["Tissu au mètre", "Tissu au kg", "Vêtements seconde main", "Outillage"];

function currency(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
}

export default function AchatsTab() {
  const { rows: achats, add, remove } = useCollection("achats");
  const [form, setForm] = useState({
    date: "", fournisseur: "", categorie: CATEGORIES_ACHAT[0],
    identification: "", prixUnitaire: "", quantite: "", piecesFab1: "",
  });

  const rows = useMemo(
    () => achats.map((a) => ({ ...a, paTotal: Number(a.prixUnitaire || 0) * Number(a.quantite || 0) })),
    [achats]
  );
  const totalAchats = rows.reduce((s, r) => s + r.paTotal, 0);

  async function handleAdd() {
    if (!form.fournisseur) return;
    await add({
      ...form,
      prixUnitaire: Number(form.prixUnitaire) || 0,
      quantite: Number(form.quantite) || 0,
      piecesFab1: Number(form.piecesFab1) || 0,
    });
    setForm({ date: "", fournisseur: "", categorie: CATEGORIES_ACHAT[0], identification: "", prixUnitaire: "", quantite: "", piecesFab1: "" });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl p-2.5 bg-peche/40">
          <ShoppingBag size={22} color="#a83b0b" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-display text-[#3a2318]">Achats</h2>
          <p className="text-sm opacity-60 text-[#3a2318]">{rows.length} achat(s) · {currency(totalAchats)} au total</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 rounded-xl bg-[#fdf8f5] border border-[#f2e6df]">
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Date d'achat</span>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Fournisseur</span>
          <input value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Catégorie</span>
          <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm">
            {CATEGORIES_ACHAT.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Identification</span>
          <input value={form.identification} onChange={(e) => setForm({ ...form, identification: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Prix unitaire HT</span>
          <input type="number" step="0.01" value={form.prixUnitaire} onChange={(e) => setForm({ ...form, prixUnitaire: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Quantité</span>
          <input type="number" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Pièces fabriquées</span>
          <input type="number" value={form.piecesFab1} onChange={(e) => setForm({ ...form, piecesFab1: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
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
              {["Date", "Fournisseur", "Catégorie", "Identification", "Prix U. HT", "Quantité", "PA total", "Pièces fab."].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap text-[#8a3d0c]">{h}</th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 opacity-50 text-[#3a2318]">Aucun achat pour le moment</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-t border-[#f2e6df] ${i % 2 ? "bg-[#fffdfb]" : "bg-white"}`}>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.date}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.fournisseur}</td>
                <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-peche/40 text-rouille">{r.categorie}</span></td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.identification}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{currency(r.prixUnitaire)}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.quantite}</td>
                <td className="px-4 py-2.5 font-semibold text-[#3a2318]">{currency(r.paTotal)}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.piecesFab1}</td>
                <td className="px-2 text-center">
                  <button onClick={() => remove(r.id)} className="opacity-30 hover:opacity-100 transition p-1">
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
