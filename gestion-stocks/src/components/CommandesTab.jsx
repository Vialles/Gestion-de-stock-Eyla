import { useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2, CalendarClock, LayoutGrid, GanttChartSquare, Loader2 } from "lucide-react";
import { useCollection } from "../lib/useCollection";
import { syncCommandeToGoogleCalendar, isGoogleCalendarConfigured } from "../lib/googleCalendar";

const STATUTS = ["À faire", "En cours", "Terminé", "À livrer"];

const STATUT_COLORS = {
  "À faire": { bg: "#f4e2da", text: "#a83b0b", bar: "#e19e88" },
  "En cours": { bg: "#fde7c8", text: "#b8730a", bar: "#e2a63d" },
  "Terminé": { bg: "#e9f5ea", text: "#2f7a3d", bar: "#5aab68" },
  "À livrer": { bg: "#e3ecfb", text: "#2952a3", bar: "#5b83d1" },
};

const EMPTY_FORM = {
  produit: "", reference: "", prixVente: "", coutMatiere: "", tempsRealisation: "",
  clientNom: "", clientTelephone: "", clientEmail: "",
  dateDebut: "", dateFin: "", statut: "À faire",
};

function currency(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
}

export default function CommandesTab() {
  const { rows: commandes, add, update, remove } = useCollection("commandes", "dateDebut");
  const { rows: produits } = useCollection("produits");
  const [form, setForm] = useState(EMPTY_FORM);
  const [view, setView] = useState("kanban");
  const [syncingId, setSyncingId] = useState(null);

  function handleProduitChange(reference) {
    const produit = produits.find((p) => p.reference === reference);
    setForm({
      ...form,
      reference,
      produit: produit ? produit.produit : form.produit,
      prixVente: produit ? String(produit.prixVente || "") : form.prixVente,
      coutMatiere: produit ? String(produit.coutMatiere || "") : form.coutMatiere,
      tempsRealisation: produit ? String(produit.tempsFabrication || "") : form.tempsRealisation,
    });
  }

  async function handleAdd() {
    if (!form.produit || !form.dateDebut || !form.dateFin) return;
    await add({
      ...form,
      prixVente: Number(form.prixVente) || 0,
      coutMatiere: Number(form.coutMatiere) || 0,
    });
    setForm(EMPTY_FORM);
  }

  async function handleStatutChange(commande, statut) {
    await update(commande.id, { statut });
  }

  async function handleSync(commande) {
    if (!isGoogleCalendarConfigured()) {
      alert("La connexion Google Agenda n'est pas encore configurée (VITE_GOOGLE_CLIENT_ID manquant).");
      return;
    }
    setSyncingId(commande.id);
    try {
      const eventId = await syncCommandeToGoogleCalendar(commande);
      await update(commande.id, { googleEventId: eventId });
    } catch (err) {
      console.error(err);
      alert("Échec de la synchronisation Google Agenda, réessaie dans un instant.");
    } finally {
      setSyncingId(null);
    }
  }

  const parDone = commandes.filter((c) => c.statut === "Terminé").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-peche/40">
            <ClipboardList size={22} color="#a83b0b" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-xl font-semibold font-display text-[#3a2318]">Commandes</h2>
            <p className="text-sm opacity-60 text-[#3a2318]">{commandes.length} commande(s) · {parDone} terminée(s)</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-md border border-[#e8d9d1] p-1 bg-white">
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${view === "kanban" ? "bg-rouille text-white" : "text-[#3a2318] opacity-60"}`}
          >
            <LayoutGrid size={14} /> Kanban
          </button>
          <button
            onClick={() => setView("gantt")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${view === "gantt" ? "bg-rouille text-white" : "text-[#3a2318] opacity-60"}`}
          >
            <GanttChartSquare size={14} /> Gantt
          </button>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 rounded-xl bg-[#fdf8f5] border border-[#f2e6df]">
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Produit</span>
          <select value={form.reference} onChange={(e) => handleProduitChange(e.target.value)} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm">
            <option value="">— produit libre —</option>
            {produits.map((p) => <option key={p.id} value={p.reference}>{p.reference} — {p.produit}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Nom du produit</span>
          <input value={form.produit} onChange={(e) => setForm({ ...form, produit: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Prix de vente</span>
          <input type="number" step="0.01" value={form.prixVente} onChange={(e) => setForm({ ...form, prixVente: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Coût matière</span>
          <input type="number" step="0.01" value={form.coutMatiere} onChange={(e) => setForm({ ...form, coutMatiere: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Temps de réalisation</span>
          <input placeholder="ex : 2h30" value={form.tempsRealisation} onChange={(e) => setForm({ ...form, tempsRealisation: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Nom client</span>
          <input value={form.clientNom} onChange={(e) => setForm({ ...form, clientNom: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Téléphone client</span>
          <input value={form.clientTelephone} onChange={(e) => setForm({ ...form, clientTelephone: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Email client</span>
          <input type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Début</span>
          <input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Livraison prévue</span>
          <input type="date" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#3a2318]">
          <span className="font-medium opacity-70">Statut</span>
          <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className="rounded-md border border-[#e8d9d1] px-3 py-2 text-sm">
            {STATUTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button onClick={handleAdd} className="w-full rounded-md px-3 py-2 text-sm font-medium text-white flex items-center justify-center gap-1.5 bg-rouille hover:opacity-90 transition">
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {!isGoogleCalendarConfigured() && (
        <div className="mb-5 text-xs px-3 py-2 rounded-md bg-[#fde7c8] text-[#8a5a06]">
          La synchronisation Google Agenda n'est pas encore configurée — voir le README pour l'activer.
        </div>
      )}

      {view === "kanban" ? (
        <KanbanBoard
          commandes={commandes}
          onStatutChange={handleStatutChange}
          onSync={handleSync}
          onRemove={remove}
          syncingId={syncingId}
        />
      ) : (
        <GanttView commandes={commandes} />
      )}
    </div>
  );
}

function KanbanBoard({ commandes, onStatutChange, onSync, onRemove, syncingId }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUTS.map((statut) => {
        const items = commandes.filter((c) => c.statut === statut);
        const colors = STATUT_COLORS[statut];
        return (
          <div key={statut} className="rounded-xl border border-[#eee0d8] bg-white flex flex-col">
            <div className="px-3 py-2.5 rounded-t-xl flex items-center justify-between" style={{ background: colors.bg }}>
              <span className="text-sm font-semibold" style={{ color: colors.text }}>{statut}</span>
              <span className="text-xs opacity-70" style={{ color: colors.text }}>{items.length}</span>
            </div>
            <div className="p-2 flex flex-col gap-2 flex-1 min-h-[80px]">
              {items.length === 0 && (
                <p className="text-xs opacity-40 text-center py-4 text-[#3a2318]">Aucune commande</p>
              )}
              {items.map((c) => (
                <div key={c.id} className="rounded-lg border border-[#f2e6df] p-3 text-sm bg-[#fffdfb]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#3a2318]">{c.produit}</p>
                    <button onClick={() => onRemove(c.id)} className="opacity-30 hover:opacity-100 transition shrink-0">
                      <Trash2 size={13} color="#a83b0b" />
                    </button>
                  </div>
                  {c.clientNom && <p className="text-xs opacity-70 text-[#3a2318] mt-0.5">{c.clientNom}</p>}
                  <p className="text-xs opacity-60 text-[#3a2318] mt-1">
                    {c.dateDebut} → {c.dateFin}
                  </p>
                  {c.prixVente > 0 && (
                    <p className="text-xs font-medium text-[#3a2318] mt-1">{currency(c.prixVente)}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={c.statut}
                      onChange={(e) => onStatutChange(c, e.target.value)}
                      className="flex-1 text-xs rounded border border-[#e8d9d1] px-1.5 py-1"
                    >
                      {STATUTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button
                      onClick={() => onSync(c)}
                      title="Synchroniser avec Google Agenda"
                      className="p-1.5 rounded border border-[#e8d9d1] hover:bg-[#f4e2da] transition"
                    >
                      {syncingId === c.id ? (
                        <Loader2 size={13} className="animate-spin" color="#a83b0b" />
                      ) : (
                        <CalendarClock size={13} color={c.googleEventId ? "#2f7a3d" : "#a83b0b"} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GanttView({ commandes }) {
  const items = useMemo(
    () => commandes.filter((c) => c.dateDebut && c.dateFin).sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)),
    [commandes]
  );

  if (items.length === 0) {
    return <p className="text-sm opacity-50 text-center py-12 text-[#3a2318]">Aucune commande avec des dates renseignées</p>;
  }

  const starts = items.map((c) => new Date(c.dateDebut).getTime());
  const ends = items.map((c) => new Date(c.dateFin).getTime());
  const rangeStart = Math.min(...starts);
  const rangeEnd = Math.max(...ends);
  const rangeDays = Math.max(1, Math.round((rangeEnd - rangeStart) / 86400000) + 1);

  function offsetPct(dateStr) {
    return ((new Date(dateStr).getTime() - rangeStart) / 86400000 / rangeDays) * 100;
  }
  function widthPct(dateDebut, dateFin) {
    const days = Math.max(1, Math.round((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000) + 1);
    return (days / rangeDays) * 100;
  }

  const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

  return (
    <div className="rounded-xl border border-[#eee0d8] bg-white p-4 overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex justify-between text-xs opacity-50 mb-3 text-[#3a2318]">
          <span>{dateFormat.format(rangeStart)}</span>
          <span>{dateFormat.format(rangeEnd)}</span>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((c) => {
            const colors = STATUT_COLORS[c.statut] || STATUT_COLORS["À faire"];
            return (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-xs text-[#3a2318]">
                  <p className="font-medium truncate">{c.produit}</p>
                  <p className="opacity-50 truncate">{c.clientNom}</p>
                </div>
                <div className="relative flex-1 h-6 bg-[#fdf8f5] rounded">
                  <div
                    className="absolute top-0 h-6 rounded flex items-center px-2 text-[10px] font-medium text-white whitespace-nowrap overflow-hidden"
                    style={{
                      left: `${offsetPct(c.dateDebut)}%`,
                      width: `${widthPct(c.dateDebut, c.dateFin)}%`,
                      background: colors.bar,
                      minWidth: "24px",
                    }}
                    title={`${c.dateDebut} → ${c.dateFin}`}
                  >
                    {c.statut}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 pt-3 border-t border-[#f2e6df]">
          {STATUTS.map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-[#3a2318]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUT_COLORS[s].bar }} />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
