import { useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { useCollection } from "../lib/useCollection";

export default function ProduitsTab() {
  const { rows: produits, add, remove } = useCollection("produits");
  const [form, setForm] = useState({
    date: "", produit: "", categorie: "", reference: "",
    dimension: "", poids: "", stockInitial: "", ventes: "0",
  });

  const rows = useMemo(
    () => produits.map((p) => ({ ...p, stockRestant: Number(p.stockInitial || 0) - Number(p.ventes || 0) })),
    [produits]
  );

  async function handleAdd() {
    if (!form.produit || !form.reference) return;
    await add({
      ...form,
      stockInitial: Number(form.stockInitial) || 0,
      ventes: Number(form.ventes) || 0,
    });
    setForm({ date: "", produit: "", categorie: "", reference: "", dimension: "", poids: "", stockInitial: "", ventes: "0" });
  }

  const lowStock = rows.filter((r) => r.stockRestant <= 1).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl p-2.5 bg-peche/40">
          <Package size={22} color="#a83b0b" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-display text-[#3a2318]">Produits</h2>
          <p className="text-sm opacity-60 text-[#3a2318]">{rows.length} référence(s) · {lowStock} en stock faible</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 rounded-xl bg-[#fdf8f5] border border-[#f2e6df]">
        {[
          ["date", "Date fabrication", "date"],
          ["produit", "Produit", "text"],
          ["categorie", "Catégorie", "text"],
          ["reference", "Référence", "text"],
          ["dimension", "Dimension", "text"],
          ["poids", "Poids", "text"],
          ["stockInitial", "Stock initial", "number"],
        ].map(([key, label, type]) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-[#3a2318]">
            <span className="font-medium opacity-70">{label}</span>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-peche/40 transition"
            />
          </label>
        ))}
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
              {["Fabrication", "Produit", "Catégorie", "Référence", "Dimension", "Poids", "Stock initial", "Ventes", "Stock restant"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap text-[#8a3d0c]">{h}</th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 opacity-50 text-[#3a2318]">Aucun produit pour le moment</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-t border-[#f2e6df] ${i % 2 ? "bg-[#fffdfb]" : "bg-white"}`}>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.date}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.produit}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.categorie}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.reference}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.dimension}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.poids}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.stockInitial}</td>
                <td className="px-4 py-2.5 text-[#3a2318]">{r.ventes}</td>
                <td className="px-4 py-2.5">
                  <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${r.stockRestant <= 1 ? "bg-[#fbe2da] text-rouille" : "bg-[#e9f5ea] text-[#2f7a3d]"}`}>
                    {r.stockRestant}
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
