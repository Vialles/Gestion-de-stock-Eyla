import { useMemo, useState } from "react";
import { Store, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useCollection } from "../lib/useCollection";

export default function MagasinsTab() {
  const { rows: magasins, add: addMagasin, update: updateMagasin, remove: removeMagasin } = useCollection("magasins", "nom");
  const { rows: stocks, add: addStock, update: updateStock, remove: removeStock } = useCollection("stocksMagasins", "produit");
  const { rows: produits } = useCollection("produits");

  const [form, setForm] = useState({ nom: "", adresse: "", telephone: "", contact: "" });
  const [openId, setOpenId] = useState(null);

  async function handleAddMagasin() {
    if (!form.nom) return;
    await addMagasin(form);
    setForm({ nom: "", adresse: "", telephone: "", contact: "" });
  }

  async function handleRemoveMagasin(magasinId) {
    if (!confirm("Supprimer ce magasin et tout son stock associé ?")) return;
    const lignes = stocks.filter((s) => s.magasinId === magasinId);
    await Promise.all(lignes.map((l) => removeStock(l.id)));
    await removeMagasin(magasinId);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl p-2.5 bg-peche/40">
          <Store size={22} color="#a83b0b" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-display text-[#3a2318]">Magasins</h2>
          <p className="text-sm opacity-60 text-[#3a2318]">{magasins.length} magasin(s) référencé(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 rounded-xl bg-[#fdf8f5] border border-[#f2e6df]">
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Nom du magasin</span>
          <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Adresse</span>
          <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Téléphone</span>
          <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Contact</span>
          <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <div className="col-span-2 md:col-span-4 flex justify-end">
          <button onClick={handleAddMagasin} className="rounded-md px-4 py-2 text-sm font-medium text-white flex items-center justify-center gap-1.5 bg-rouille hover:opacity-90 transition">
            <Plus size={15} /> Ajouter le magasin
          </button>
        </div>
      </div>

      {magasins.length === 0 && (
        <p className="text-sm opacity-50 text-center py-10 text-[#3a2318]">Aucun magasin pour le moment</p>
      )}

      <div className="flex flex-col gap-3">
        {magasins.map((m) => (
          <MagasinCard
            key={m.id}
            magasin={m}
            open={openId === m.id}
            onToggle={() => setOpenId(openId === m.id ? null : m.id)}
            onRemove={() => handleRemoveMagasin(m.id)}
            stocks={stocks.filter((s) => s.magasinId === m.id)}
            produits={produits}
            addStock={addStock}
            updateStock={updateStock}
            removeStock={removeStock}
          />
        ))}
      </div>
    </div>
  );
}

function MagasinCard({ magasin, open, onToggle, onRemove, stocks, produits, addStock, updateStock, removeStock }) {
  const [newLine, setNewLine] = useState({ reference: "", quantite: "1" });
  const [editingId, setEditingId] = useState(null);
  const [editQuantite, setEditQuantite] = useState("");

  const totalArticles = stocks.reduce((s, l) => s + (Number(l.quantite) || 0), 0);

  async function handleAddLine() {
    if (!newLine.reference) return;
    const produit = produits.find((p) => p.reference === newLine.reference);
    if (!produit) return;

    // Si le produit est déjà en stock dans ce magasin, on cumule la quantité plutôt que dupliquer la ligne
    const existante = stocks.find((s) => s.reference === newLine.reference);
    if (existante) {
      await updateStock(existante.id, { quantite: (Number(existante.quantite) || 0) + (Number(newLine.quantite) || 0) });
    } else {
      await addStock({
        magasinId: magasin.id,
        reference: newLine.reference,
        produit: produit.produit,
        quantite: Number(newLine.quantite) || 0,
      });
    }
    setNewLine({ reference: "", quantite: "1" });
  }

  function startEdit(line) {
    setEditingId(line.id);
    setEditQuantite(String(line.quantite));
  }

  async function saveEdit(line) {
    await updateStock(line.id, { quantite: Number(editQuantite) || 0 });
    setEditingId(null);
  }

  return (
    <div className="rounded-xl border border-[#eee0d8] bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-[#fdf8f5] hover:bg-[#f4e2da] transition text-left">
        <div>
          <p className="font-semibold text-[#3a2318]">{magasin.nom}</p>
          <p className="text-xs opacity-60 text-[#3a2318]">
            {magasin.adresse || "—"} {magasin.telephone && `· ${magasin.telephone}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded-full bg-peche/40 text-rouille font-medium">{totalArticles} article(s)</span>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-40 hover:opacity-100 transition">
            <Trash2 size={15} color="#a83b0b" />
          </button>
          {open ? <ChevronUp size={18} color="#a83b0b" /> : <ChevronDown size={18} color="#a83b0b" />}
        </div>
      </button>

      {open && (
        <div className="p-4">
          {magasin.contact && <p className="text-xs opacity-60 mb-3 text-[#3a2318]">Contact : {magasin.contact}</p>}

          <div className="flex flex-wrap items-end gap-2 mb-4 p-3 rounded-lg bg-[#fdf8f5] border border-[#f2e6df]">
            <label className="flex flex-col gap-1 text-xs text-[#3a2318]">
              <span className="font-medium opacity-70">Produit</span>
              <select value={newLine.reference} onChange={(e) => setNewLine({ ...newLine, reference: e.target.value })} className="rounded-md border border-[#e8d9d1] px-2 py-1.5 text-sm min-w-[180px]">
                <option value="">—</option>
                {produits.map((p) => <option key={p.id} value={p.reference}>{p.reference} — {p.produit}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#3a2318]">
              <span className="font-medium opacity-70">Quantité</span>
              <input type="number" value={newLine.quantite} onChange={(e) => setNewLine({ ...newLine, quantite: e.target.value })} className="rounded-md border border-[#e8d9d1] px-2 py-1.5 text-sm w-20" />
            </label>
            <button onClick={handleAddLine} className="rounded-md px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5 bg-rouille hover:opacity-90 transition">
              <Plus size={14} /> Ajouter au stock
            </button>
          </div>

          {stocks.length === 0 ? (
            <p className="text-sm opacity-50 text-center py-4 text-[#3a2318]">Aucun produit en stock dans ce magasin</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#f2e6df]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-peche/40">
                    <th className="text-left px-3 py-2 font-medium text-[#8a3d0c]">Référence</th>
                    <th className="text-left px-3 py-2 font-medium text-[#8a3d0c]">Produit</th>
                    <th className="text-left px-3 py-2 font-medium text-[#8a3d0c]">Quantité</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((l, i) => (
                    <tr key={l.id} className={`border-t border-[#f2e6df] ${i % 2 ? "bg-[#fffdfb]" : "bg-white"}`}>
                      <td className="px-3 py-2 text-[#3a2318]">{l.reference}</td>
                      <td className="px-3 py-2 text-[#3a2318]">{l.produit}</td>
                      <td className="px-3 py-2 text-[#3a2318]">
                        {editingId === l.id ? (
                          <input type="number" value={editQuantite} onChange={(e) => setEditQuantite(e.target.value)} className="w-20 rounded border border-[#e8d9d1] px-2 py-1 text-sm" />
                        ) : (
                          l.quantite
                        )}
                      </td>
                      <td className="px-2 text-center whitespace-nowrap">
                        {editingId === l.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => saveEdit(l)} className="p-1"><Check size={14} color="#2f7a3d" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1"><X size={14} color="#a83b0b" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => startEdit(l)} className="opacity-40 hover:opacity-100 transition p-1"><Pencil size={13} color="#a83b0b" /></button>
                            <button onClick={() => removeStock(l.id)} className="opacity-40 hover:opacity-100 transition p-1"><Trash2 size={13} color="#a83b0b" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
