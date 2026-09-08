import { useRef, useState } from "react";
import { Package, ShoppingBag, Receipt, ClipboardList, Download, Save, Upload, Loader2, MoreVertical } from "lucide-react";
import { exportToExcel } from "../lib/exportExcel";
import { exportBackupJSON, restoreBackupJSON } from "../lib/backup";

const TABS = [
  { id: "achats", label: "Achats", icon: ShoppingBag },
  { id: "produits", label: "Produits", icon: Package },
  { id: "ventes", label: "Ventes", icon: Receipt },
  { id: "commandes", label: "Commandes", icon: ClipboardList },
];

export default function Header({ tab, setTab }) {
  const [busy, setBusy] = useState(null); // "export" | "backup" | "restore" | null
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  async function handleExport() {
    setBusy("export");
    try {
      await exportToExcel();
    } catch (err) {
      console.error(err);
      alert("Échec de l'export Excel, réessaie dans un instant.");
    } finally {
      setBusy(null);
      setMenuOpen(false);
    }
  }

  async function handleBackup() {
    setBusy("backup");
    try {
      await exportBackupJSON();
    } catch (err) {
      console.error(err);
      alert("Échec de la sauvegarde, réessaie dans un instant.");
    } finally {
      setBusy(null);
      setMenuOpen(false);
    }
  }

  function handleRestoreClick() {
    fileInputRef.current?.click();
  }

  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!confirm("Restaurer cette sauvegarde va recréer les données qu'elle contient (les données existantes avec les mêmes identifiants seront écrasées). Continuer ?")) {
      return;
    }

    setBusy("restore");
    try {
      const result = await restoreBackupJSON(file);
      const detail = Object.entries(result.counts).map(([k, v]) => `${k} : ${v}`).join(", ");
      alert(`Sauvegarde du ${result.createdAt.slice(0, 10)} restaurée.\n${detail}`);
    } catch (err) {
      console.error(err);
      alert("Échec de la restauration — vérifie que le fichier est bien une sauvegarde générée par l'appli.");
    } finally {
      setBusy(null);
      setMenuOpen(false);
    }
  }

  return (
    <header className="border-b sticky top-0 z-10 bg-[#fbf6f1ee] backdrop-blur border-[#eee0d8]">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-1 bg-white border border-[#eee0d8]">
            <img src="/logo-eyla.png" alt="Eyla Création" className="h-9 w-auto" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight font-display text-[#3a2318]">
              Eyla Création
            </h1>
            <p className="text-xs opacity-60 text-[#3a2318]">Suivi de stock</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {import.meta.env.VITE_SUMUP_CONNECT_URL && (
            <a
              href={import.meta.env.VITE_SUMUP_CONNECT_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-[#e8d9d1] text-[#3a2318] hover:bg-white transition"
            >
              Connecter SumUp
            </a>
          )}

          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleRestoreFile} />

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-rouille text-rouille hover:bg-rouille hover:text-white transition disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <MoreVertical size={15} />}
              <span className="hidden sm:inline">
                {busy === "export" ? "Export..." : busy === "backup" ? "Sauvegarde..." : busy === "restore" ? "Restauration..." : "Options"}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-56 rounded-md border border-[#eee0d8] bg-white shadow-lg overflow-hidden z-20">
                <button onClick={handleExport} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#3a2318] hover:bg-[#fdf8f5] transition">
                  <Download size={15} /> Exporter en Excel
                </button>
                <button onClick={handleBackup} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#3a2318] hover:bg-[#fdf8f5] transition border-t border-[#f2e6df]">
                  <Save size={15} /> Sauvegarder les données
                </button>
                <button onClick={handleRestoreClick} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#3a2318] hover:bg-[#fdf8f5] transition border-t border-[#f2e6df]">
                  <Upload size={15} /> Restaurer une sauvegarde
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                active ? "border-rouille text-rouille" : "border-transparent text-[#3a2318] opacity-55"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
