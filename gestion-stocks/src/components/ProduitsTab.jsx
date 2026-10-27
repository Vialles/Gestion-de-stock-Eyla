import { useMemo, useState } from "react";
import { Package, Plus, Trash2, Pencil, X, Check, Hammer } from "lucide-react";
import { useCollection } from "../lib/useCollection";
import { totauxParReference, stockAtelier, aFabriquer } from "../lib/stock";

function currency(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
}

const CATEGORIES_PRODUIT = ["Sac à main", "Vêtement", "Accessoire", "Cabas", "Seconde main", "Ameublement"];

const EMPTY_FORM = {
  date: "", produit: "", categorie: "", reference: "",
  dimension: "", poids: "", tempsFabrication: "", coutMatiere: "", prixVente: "",
  stockInitial: "", stockCible: "", ventes: "0",
};

const FIELDS = [
  ["date", "Date fabrication", "date"],
  ["produit", "Produit", "text"],
  ["categorie", "Catégorie", "select"],
  ["reference", "Référence", "text"],
  ["dimension", "Dimension", "text"],
  ["poids", "Poids", "text"],
  ["tempsFabrication", "Temps de fabrication", "text"],
  ["coutMatiere", "Coût matière", "number"],
  ["prixVente", "Prix de vente", "number"],
  ["stockInitial", "Stock initial", "number"],
  ["stockCible", "Stock cible", "number"],
];

const HEADERS = [
  "Fabrication", "Produit", "Catégorie", "Référence", "Dimension", "Poids", "Temps fab.",
  "Coût matière", "Prix de vente", "Stock initial", "Stock cible",
  "Ventes directes", "Vendu en magasin", "En atelier", "En magasin", "À fabriquer",
];

function FieldInput({ type, value, onChange, className }) {
  if (type === "select") {
    return (
      <select value={value} onChange={onChange} className={className}>
        <option value="">—</option>
        {CATEGORIES_PRODUIT.map((c) => <option key={c}>{c}</option>)}
      </select>
    );
  }
  return <input type={type} step={type === "number" ? "0.01" : undefined} value={value} onChange={onChange} className={className} />;
}

export default function ProduitsTab() {
  const { rows: produits, add, update, remove } = useCollection("produits");
  const { rows: mouvements } = useCollection("mouvements");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const rows = useMemo(() => {
    const { atelierDelta, enMagasin, venduMagasin } = totauxParReference(mouvements);
    return produits.map((p) => ({
      ...p,
      enAtelier: stockAtelier(p, atelierDelta),
      enMagasin: enMagasin[p.reference] || 0,
      venduMagasin: venduMagasin[p.reference] || 0,
      aFabriquer: aFabriquer(p, atelierDelta, enMagasin),
    }));
  }, [produits, mouvements]);

  const aProduire = rows.filter((r) => r.aFabriquer > 0);
  const lowStock = rows.filter((r) => r.enAtelier <= 1).length;

  const toNumbers = (f) => ({
    ...f,
    coutMatiere: Number(f.coutMatiere) || 0,
    prixVente: Number(f.prixVente) || 0,
    stockInitial: Number(f.stockInitial) || 0,
    stockCible: Number(f.stockCible) || 0,
    ventes: Number(f.ventes) || 0,
  });

  async function handleAdd() {
    if (!form.produit || !form.reference) return;
    await add(toNumbers(form));
    setForm(EMPTY_FORM);
  }

  async function saveEdit(id) {
    await update(id, toNumbers(editForm));
    setEditingId(null);
  }

  const inputCls = "rounded-md border border-[#e8d9d1] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-peche/40 transition";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl p-2.5 bg-peche/40">
          <Package size={22} color="#a83b0b" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-display text-[#3a2318]">Produits</h2>
          <p className="text-sm opacity-60 text-[#3a2318]">{rows.length} référence(s) · {lowStock} en stock atelier faible</p>
        </div>
      </div>

      {aProduire.length > 0 && (
        <div className="mb-5 rounded-xl border border-[#f0c9b8] bg-[#fdf0e9] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-rouille mb-2">
            <Hammer size={15} /> À fabriquer en priorité (stock cible non atteint)
          </p>
          <div className="flex flex-wrap gap-2">
            {aProduire.map((r) => (
              <span key={r.id} className="text-xs px-2.5 py-1 rounded-full bg-white border border-[#f0c9b8] text-[#3a2318]">
                <b>{r.aFabriquer}</b> × {r.produit} ({r.reference})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 rounded-xl bg-[#fdf8f5] border border-[#f2e6df]">
        {FIELDS.map(([key, label, type]) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-[#3a2318]">
            <span className="font-medium opacity-70">{label}</span>
            <FieldInput type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputCls} />
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
              {HEADERS.map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap text-[#8a3d0c]">{h}</th>
              ))}
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={HEADERS.length + 1} className="text-center py-8 opacity-50 text-[#3a2318]">Aucun produit pour le moment</td></tr>
            )}
            {rows.map((r, i) => {
              const isEditing = editingId === r.id;
              return (
                <tr key={r.id} className={`border-t border-[#f2e6df] ${i % 2 ? "bg-[#fffdfb]" : "bg-white"}`}>
                  {FIELDS.map(([key, , type]) => (
                    <td key={key} className="px-4 py-2 text-[#3a2318]">
                      {isEditing ? (
                        <FieldInput
                          type={type}
                          value={editForm[key]}
                          onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                          className="w-full rounded border border-[#e8d9d1] px-2 py-1 text-sm"
                        />
                      ) : key === "coutMatiere" || key === "prixVente" ? currency(r[key]) : r[key]}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-[#3a2318]">{r.ventes}</td>
                  <td className="px-4 py-2.5 text-[#3a2318]">{r.venduMagasin}</td>
                  <td className="px-4 py-2.5">
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${r.enAtelier <= 1 ? "bg-[#fbe2da] text-rouille" : "bg-[#e9f5ea] text-[#2f7a3d]"}`}>
                      {r.enAtelier}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#3a2318]">{r.enMagasin}</td>
                  <td className="px-4 py-2.5">
                    {r.aFabriquer > 0 ? (
                      <span className="font-semibold px-2 py-0.5 rounded-full text-xs bg-[#fdf0e9] text-rouille">{r.aFabriquer}</span>
                    ) : (
                      <span className="opacity-30">—</span>
                    )}
                  </td>
                  <td className="px-2 text-center whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => saveEdit(r.id)} className="p-1 opacity-70 hover:opacity-100"><Check size={15} color="#2f7a3d" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 opacity-70 hover:opacity-100"><X size={15} color="#a83b0b" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => { setEditingId(r.id); setEditForm(Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, r[k] ?? EMPTY_FORM[k]]))); }} className="opacity-30 hover:opacity-100 transition p-1">
                          <Pencil size={14} color="#a83b0b" />
                        </button>
                        <button onClick={() => remove(r.id)} className="opacity-30 hover:opacity-100 transition p-1">
                          <Trash2 size={15} color="#a83b0b" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
