import { useMemo, useState } from "react";
import { Store, Plus, Trash2, ChevronDown, ChevronUp, PackagePlus, ReceiptText, Undo2, Download, X, Check, Loader2 } from "lucide-react";
import { useCollection } from "../lib/useCollection";
import { stockMagasin, totauxParReference, stockAtelier, releveMagasin, TYPE_LABELS } from "../lib/stock";
import { exportReleveExcel } from "../lib/exportReleve";

const inputCls = "rounded-md border border-[#e8d9d1] px-3 py-2 text-sm";
const EMPTY_MAGASIN = { nom: "", adresse: "", telephone: "", contact: "", commission: "0" };

function currency(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("fr-CA");
}

export default function MagasinsTab() {
  const { rows: magasins, add: addMagasin, update: updateMagasin, remove: removeMagasin } = useCollection("magasins", "nom");
  const { rows: mouvements, add: addMouvement, remove: removeMouvement } = useCollection("mouvements");
  const { rows: ancienStock, remove: removeAncienStock } = useCollection("stocksMagasins", "produit");
  const { rows: produits } = useCollection("produits");

  const [form, setForm] = useState(EMPTY_MAGASIN);
  const [openId, setOpenId] = useState(null);
  const [importing, setImporting] = useState(false);

  // Stock atelier par référence (pour prévenir un dépôt supérieur au stock disponible)
  const atelierParRef = useMemo(() => {
    const { atelierDelta } = totauxParReference(mouvements);
    return Object.fromEntries(produits.map((p) => [p.reference, stockAtelier(p, atelierDelta)]));
  }, [produits, mouvements]);

  async function handleAddMagasin() {
    if (!form.nom) return;
    await addMagasin({ ...form, commission: Number(form.commission) || 0 });
    setForm(EMPTY_MAGASIN);
  }

  async function handleRemoveMagasin(magasin) {
    if (!confirm(`Supprimer le magasin « ${magasin.nom} » et tout son historique de mouvements ?`)) return;
    await Promise.all(mouvements.filter((m) => m.magasinId === magasin.id).map((m) => removeMouvement(m.id)));
    await removeMagasin(magasin.id);
  }

  // Reprend le stock saisi à la main dans l'ancienne version de l'onglet Magasins
  async function importAncienStock() {
    setImporting(true);
    try {
      for (const l of ancienStock) {
        const magasin = magasins.find((m) => m.id === l.magasinId);
        if (!magasin) continue;
        await addMouvement({
          date: today(), type: "ajustement", magasinId: magasin.id, magasinNom: magasin.nom,
          reference: l.reference, produit: l.produit, quantite: Number(l.quantite) || 0,
          note: "Stock existant importé",
        });
      }
      await Promise.all(ancienStock.map((l) => removeAncienStock(l.id)));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl p-2.5 bg-peche/40">
          <Store size={22} color="#a83b0b" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-display text-[#3a2318]">Magasins</h2>
          <p className="text-sm opacity-60 text-[#3a2318]">{magasins.length} magasin(s) · dépôts, ventes et relevés</p>
        </div>
      </div>

      {ancienStock.length > 0 && (
        <div className="mb-5 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-[#f0d7a8] bg-[#fdf3dc] p-3 text-sm text-[#7a5206]">
          <span>{ancienStock.length} ligne(s) de stock saisies avec l'ancienne version sont à reprendre dans le nouveau suivi.</span>
          <button onClick={importAncienStock} disabled={importing} className="rounded-md px-3 py-1.5 text-sm font-medium text-white bg-rouille hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-50">
            {importing && <Loader2 size={13} className="animate-spin" />} Reprendre le stock existant
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 p-4 rounded-xl bg-[#fdf8f5] border border-[#f2e6df]">
        {[["nom", "Nom du magasin", "text"], ["adresse", "Adresse", "text"], ["telephone", "Téléphone", "text"], ["contact", "Contact", "text"], ["commission", "Commission (%)", "number"]].map(([key, label, type]) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-[#3a2318]">
            <span className="font-medium opacity-70">{label}</span>
            <input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.1" : undefined} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputCls} />
          </label>
        ))}
        <div className="col-span-2 md:col-span-5 flex items-center justify-between gap-3">
          <span className="text-xs opacity-60 text-[#3a2318]">Commission à 0 % : le magasin ne prélève rien pour le moment (modifiable plus tard).</span>
          <button onClick={handleAddMagasin} className="rounded-md px-4 py-2 text-sm font-medium text-white flex items-center gap-1.5 bg-rouille hover:opacity-90 transition">
            <Plus size={15} /> Ajouter le magasin
          </button>
        </div>
      </div>

      {magasins.length === 0 && <p className="text-sm opacity-50 text-center py-10 text-[#3a2318]">Aucun magasin pour le moment</p>}

      <div className="flex flex-col gap-3">
        {magasins.map((m) => (
          <MagasinCard
            key={m.id}
            magasin={m}
            open={openId === m.id}
            onToggle={() => setOpenId(openId === m.id ? null : m.id)}
            onRemove={() => handleRemoveMagasin(m)}
            onUpdate={(data) => updateMagasin(m.id, data)}
            mouvements={mouvements}
            produits={produits}
            atelierParRef={atelierParRef}
            addMouvement={addMouvement}
            removeMouvement={removeMouvement}
          />
        ))}
      </div>
    </div>
  );
}

function MagasinCard({ magasin, open, onToggle, onRemove, onUpdate, mouvements, produits, atelierParRef, addMouvement, removeMouvement }) {
  const [modalType, setModalType] = useState(null); // "depot" | "vente" | "retour"
  const [debut, setDebut] = useState(monthStart());
  const [fin, setFin] = useState(today());
  const [commission, setCommission] = useState(String(magasin.commission ?? 0));

  const mesMouvements = useMemo(
    () => mouvements.filter((m) => m.magasinId === magasin.id),
    [mouvements, magasin.id]
  );
  const stock = useMemo(
    () => Object.values(stockMagasin(mouvements, magasin.id)).filter((s) => s.quantite !== 0),
    [mouvements, magasin.id]
  );
  const totalArticles = stock.reduce((s, l) => s + l.quantite, 0);
  const releve = useMemo(() => releveMagasin(mouvements, magasin, debut, fin), [mouvements, magasin, debut, fin]);
  const stockParRef = useMemo(() => stockMagasin(mouvements, magasin.id), [mouvements, magasin.id]);

  const btn = "rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition";

  return (
    <div className="rounded-xl border border-[#eee0d8] bg-white overflow-hidden">
      <div onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-[#fdf8f5] hover:bg-[#f4e2da] transition text-left cursor-pointer">
        <div>
          <p className="font-semibold text-[#3a2318]">{magasin.nom}</p>
          <p className="text-xs opacity-60 text-[#3a2318]">
            {magasin.adresse || "—"} {magasin.telephone && `· ${magasin.telephone}`} · commission {Number(magasin.commission) || 0} %
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded-full bg-peche/40 text-rouille font-medium">{totalArticles} article(s) en stock</span>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-40 hover:opacity-100 transition">
            <Trash2 size={15} color="#a83b0b" />
          </button>
          {open ? <ChevronUp size={18} color="#a83b0b" /> : <ChevronDown size={18} color="#a83b0b" />}
        </div>
      </div>

      {open && (
        <div className="p-4 flex flex-col gap-5">
          {magasin.contact && <p className="text-xs opacity-60 text-[#3a2318]">Contact : {magasin.contact}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setModalType("depot")} className={`${btn} text-white bg-rouille hover:opacity-90`}><PackagePlus size={15} /> Déposer des produits</button>
            <button onClick={() => setModalType("vente")} className={`${btn} text-white bg-[#2f7a3d] hover:opacity-90`}><ReceiptText size={15} /> Saisir un relevé de ventes</button>
            <button onClick={() => setModalType("retour")} className={`${btn} border border-[#e8d9d1] text-[#3a2318] hover:bg-[#fdf8f5]`}><Undo2 size={15} /> Retour d'invendus</button>
            <label className="flex items-center gap-2 text-xs text-[#3a2318] ml-auto">
              Commission (%)
              <input
                type="number" min="0" step="0.1" value={commission}
                onChange={(e) => setCommission(e.target.value)}
                onBlur={() => onUpdate({ commission: Number(commission) || 0 })}
                className="w-20 rounded-md border border-[#e8d9d1] px-2 py-1 text-sm"
              />
            </label>
          </div>

          <section>
            <h4 className="text-sm font-semibold mb-2 text-[#3a2318]">Stock actuel dans ce magasin</h4>
            {stock.length === 0 ? (
              <p className="text-sm opacity-50 py-3 text-[#3a2318]">Aucun produit en stock — fais un dépôt pour commencer.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#f2e6df]">
                <table className="w-full text-sm">
                  <thead><tr className="bg-peche/40">
                    {["Référence", "Produit", "Quantité"].map((h) => <th key={h} className="text-left px-3 py-2 font-medium text-[#8a3d0c]">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {stock.map((l, i) => (
                      <tr key={l.reference} className={`border-t border-[#f2e6df] ${i % 2 ? "bg-[#fffdfb]" : "bg-white"}`}>
                        <td className="px-3 py-2 text-[#3a2318]">{l.reference}</td>
                        <td className="px-3 py-2 text-[#3a2318]">{l.produit}</td>
                        <td className="px-3 py-2 font-semibold text-[#3a2318]">{l.quantite}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h4 className="text-sm font-semibold mb-2 text-[#3a2318]">Relevé de ventes</h4>
            <div className="flex flex-wrap items-end gap-3 mb-3">
              <label className="flex flex-col gap-1 text-xs text-[#3a2318]"><span className="font-medium opacity-70">Du</span>
                <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className="rounded-md border border-[#e8d9d1] px-2 py-1.5 text-sm" /></label>
              <label className="flex flex-col gap-1 text-xs text-[#3a2318]"><span className="font-medium opacity-70">Au</span>
                <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="rounded-md border border-[#e8d9d1] px-2 py-1.5 text-sm" /></label>
              <button onClick={() => exportReleveExcel(mouvements, magasin, debut, fin)} className={`${btn} border border-rouille text-rouille hover:bg-rouille hover:text-white`}>
                <Download size={14} /> Exporter le relevé (Excel)
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                ["Articles vendus", releve.quantite],
                ["Chiffre d'affaires", currency(releve.ca)],
                [`Commission (${releve.pct} %)`, currency(releve.commission)],
                ["Net à percevoir", currency(releve.net)],
              ].map(([label, value], i) => (
                <div key={label} className={`rounded-lg border p-3 ${i === 3 ? "border-[#bfe0c5] bg-[#e9f5ea]" : "border-[#f2e6df] bg-[#fdf8f5]"}`}>
                  <p className="text-xs opacity-60 text-[#3a2318]">{label}</p>
                  <p className="text-base font-semibold text-[#3a2318]">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold mb-2 text-[#3a2318]">Historique des mouvements</h4>
            {mesMouvements.length === 0 ? (
              <p className="text-sm opacity-50 py-2 text-[#3a2318]">Aucun mouvement pour le moment</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#f2e6df] max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0"><tr className="bg-peche/40">
                    {["Date", "Type", "Référence", "Produit", "Qté", "Montant"].map((h) => <th key={h} className="text-left px-3 py-2 font-medium text-[#8a3d0c] whitespace-nowrap">{h}</th>)}
                    <th className="w-8"></th>
                  </tr></thead>
                  <tbody>
                    {mesMouvements.map((mv, i) => (
                      <tr key={mv.id} className={`border-t border-[#f2e6df] ${i % 2 ? "bg-[#fffdfb]" : "bg-white"}`}>
                        <td className="px-3 py-1.5 text-[#3a2318] whitespace-nowrap">{mv.date}</td>
                        <td className="px-3 py-1.5 text-[#3a2318]">{TYPE_LABELS[mv.type] || mv.type}</td>
                        <td className="px-3 py-1.5 text-[#3a2318]">{mv.reference}</td>
                        <td className="px-3 py-1.5 text-[#3a2318]">{mv.produit}</td>
                        <td className="px-3 py-1.5 text-[#3a2318]">{mv.quantite}</td>
                        <td className="px-3 py-1.5 text-[#3a2318]">{mv.type === "vente" ? currency(mv.montant) : "—"}</td>
                        <td className="px-2 text-center">
                          <button onClick={() => confirm("Supprimer ce mouvement ? Le stock sera recalculé.") && removeMouvement(mv.id)} className="opacity-30 hover:opacity-100 transition">
                            <Trash2 size={13} color="#a83b0b" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {modalType && (
        <MouvementModal
          type={modalType}
          magasin={magasin}
          produits={produits}
          atelierParRef={atelierParRef}
          stockParRef={stockParRef}
          onClose={() => setModalType(null)}
          onSave={async (lignes, date) => {
            await Promise.all(lignes.map((l) => addMouvement({
              date, type: modalType, magasinId: magasin.id, magasinNom: magasin.nom,
              reference: l.reference, produit: l.produit, quantite: l.quantite,
              ...(modalType === "vente" ? { montant: l.montant } : {}),
            })));
            setModalType(null);
          }}
        />
      )}
    </div>
  );
}

const MODAL_TEXT = {
  depot: { title: "Déposer des produits", hint: "Les produits quittent le stock de l'atelier et arrivent dans ce magasin.", cta: "Enregistrer le dépôt" },
  vente: { title: "Relevé de ventes", hint: "Ventes réalisées par le magasin. Elles baissent le stock du magasin et apparaissent dans l'onglet Ventes.", cta: "Enregistrer les ventes" },
  retour: { title: "Retour d'invendus", hint: "Les produits quittent le magasin et reviennent dans le stock de l'atelier.", cta: "Enregistrer le retour" },
};

function MouvementModal({ type, magasin, produits, atelierParRef, stockParRef, onClose, onSave }) {
  const [date, setDate] = useState(today());
  const [lignes, setLignes] = useState([{ reference: "", quantite: "1", montant: "" }]);
  const [saving, setSaving] = useState(false);
  const txt = MODAL_TEXT[type];

  const setLigne = (i, patch) => setLignes(lignes.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const produitDe = (ref) => produits.find((p) => p.reference === ref);
  // Montant d'une ligne de vente : saisi, sinon prix de vente x quantité
  const montantAuto = (l) => (Number(produitDe(l.reference)?.prixVente) || 0) * (Number(l.quantite) || 0);

  async function handleSubmit() {
    const valides = lignes
      .filter((l) => l.reference && Number(l.quantite) > 0)
      .map((l) => ({
        reference: l.reference,
        produit: produitDe(l.reference)?.produit || "",
        quantite: Number(l.quantite),
        montant: l.montant !== "" ? Number(l.montant) : montantAuto(l),
      }));
    if (valides.length === 0) return;

    // Contrôle des quantités disponibles avant d'enregistrer
    const problemes = valides.filter((l) => {
      const dispo = type === "depot" ? atelierParRef[l.reference] : stockParRef[l.reference]?.quantite || 0;
      return l.quantite > (dispo ?? 0);
    });
    if (problemes.length > 0) {
      const source = type === "depot" ? "du stock atelier" : "du stock de ce magasin";
      const detail = problemes.map((l) => `${l.reference} (${l.quantite} demandé)`).join(", ");
      if (!confirm(`Quantité supérieure à celle disponible ${source} pour : ${detail}.\nEnregistrer quand même ?`)) return;
    }

    setSaving(true);
    try {
      await onSave(valides, date);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold font-display text-[#3a2318]">{txt.title} — {magasin.nom}</h3>
          <button onClick={onClose} className="opacity-50 hover:opacity-100 transition"><X size={18} color="#3a2318" /></button>
        </div>
        <p className="text-xs opacity-60 mb-4 text-[#3a2318]">{txt.hint}</p>

        <label className="flex flex-col gap-1 text-sm text-[#3a2318] mb-4 w-48">
          <span className="font-medium opacity-70">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>

        <div className="flex flex-col gap-2">
          {lignes.map((l, i) => {
            const dispo = type === "depot" ? atelierParRef[l.reference] : stockParRef[l.reference]?.quantite;
            return (
              <div key={i} className="flex flex-wrap items-end gap-2 p-2 rounded-lg bg-[#fdf8f5] border border-[#f2e6df]">
                <label className="flex flex-col gap-1 text-xs text-[#3a2318] flex-1 min-w-[160px]">
                  <span className="font-medium opacity-70">Produit</span>
                  <select value={l.reference} onChange={(e) => setLigne(i, { reference: e.target.value, montant: "" })} className={inputCls}>
                    <option value="">—</option>
                    {produits.map((p) => <option key={p.id} value={p.reference}>{p.reference} — {p.produit}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#3a2318] w-20">
                  <span className="font-medium opacity-70">Qté</span>
                  <input type="number" min="1" value={l.quantite} onChange={(e) => setLigne(i, { quantite: e.target.value })} className={inputCls} />
                </label>
                {type === "vente" && (
                  <label className="flex flex-col gap-1 text-xs text-[#3a2318] w-28">
                    <span className="font-medium opacity-70">Montant (€)</span>
                    <input type="number" step="0.01" placeholder={l.reference ? String(montantAuto(l)) : ""} value={l.montant} onChange={(e) => setLigne(i, { montant: e.target.value })} className={inputCls} />
                  </label>
                )}
                {l.reference && dispo !== undefined && (
                  <span className="text-xs opacity-60 pb-2 text-[#3a2318]">Disponible : {dispo}</span>
                )}
                {lignes.length > 1 && (
                  <button onClick={() => setLignes(lignes.filter((_, idx) => idx !== i))} className="pb-2 opacity-50 hover:opacity-100"><Trash2 size={14} color="#a83b0b" /></button>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={() => setLignes([...lignes, { reference: "", quantite: "1", montant: "" }])} className="mt-3 text-sm text-rouille font-medium flex items-center gap-1 hover:underline">
          <Plus size={14} /> Ajouter une ligne
        </button>
        {type === "vente" && <p className="text-xs opacity-50 mt-2 text-[#3a2318]">Montant laissé vide : prix de vente du produit × quantité.</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium border border-[#e8d9d1] text-[#3a2318] hover:bg-[#fdf8f5] transition">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-white bg-rouille hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {txt.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
