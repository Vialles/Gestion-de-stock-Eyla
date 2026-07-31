import { useState } from "react";
import { Receipt, Plus, Trash2, TrendingUp } from "lucide-react";
import { useCollection } from "../lib/useCollection";

function currency(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
}

export default function VentesTab() {
  const { rows: ventes, add, remove } = useCollection("ventes");
  const { rows: produits } = useCollection("produits");
  const [form, setForm] = useState({ date: "", reference: "", quantite: "1", client: "", montant: "", source: "manuel" });

  const totalVentes = ventes.reduce((s, v) => s + Number(v.montant || 0), 0);

  async function handleAdd() {
    if (!form.reference) return;
    await add({ ...form, quantite: Number(form.quantite) || 0, montant: Number(form.montant) || 0 });
    setForm({ date: "", reference: "", quantite: "1", client: "", montant: "", source: "manuel" });
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
            <p className="text-sm opacity-60 text-[#3a2318]">{ventes.length} vente(s) · {currency(totalVentes)} de CA</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#e9f5ea] text-[#2f7a3d]">
          <TrendingUp size={13} /> Ventes SumUp synchronisées automatiquement
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 rounded-xl bg-[#fdf8f5] border border-[#f2e6df]">
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Date</span>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Référence produit</span>
          <select value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm">
            <option value="">—</option>
            {produits.map((p) => <option key={p.id} value={p.reference}>{p.reference} — {p.produit}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Quantité</span>
          <input type="number" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Client</span>
          <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Montant</span>
          <input type="number" step="0.01" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
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
              {["Date", "Référence", "Quantité", "Client", "Montant", "Source"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap text-[#8a3d0c]">{h}</th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {ventes.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 opacity-50 text-[#3a2318]">Aucune vente pour le moment</td></tr>
            )}
            {ventes.map((r, i) => (
              <tr key={r.id} className={`border-t border-[#f2e6df] ${i % 2 ? "bg-[#fffdfb]" : "bg-white"}`}>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.date}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.reference}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.quantite}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.client}</td>
                <td className="px-4 py-2.5 font-semibold text-[#3a2318]">{currency(r.montant)}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.source === "sumup" ? "bg-[#e9f5ea] text-[#2f7a3d]" : "bg-[#f4e2da] text-rouille"}`}>
                    {r.source === "sumup" ? "SumUp" : "Manuel"}
                  </span>
                </td>
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
