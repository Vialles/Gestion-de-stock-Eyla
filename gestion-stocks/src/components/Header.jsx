import { useState } from "react";
import { Package, ShoppingBag, Receipt, ClipboardList, Download, Loader2 } from "lucide-react";
import { exportToExcel } from "../lib/exportExcel";

const TABS = [
  { id: "achats", label: "Achats", icon: ShoppingBag },
  { id: "produits", label: "Produits", icon: Package },
  { id: "ventes", label: "Ventes", icon: Receipt },
  { id: "commandes", label: "Commandes", icon: ClipboardList },
];

export default function Header({ tab, setTab }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportToExcel();
    } catch (err) {
      console.error(err);
      alert("Échec de l'export Excel, réessaie dans un instant.");
    } finally {
      setExporting(false);
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
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-rouille text-rouille hover:bg-rouille hover:text-white transition disabled:opacity-50"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span className="hidden sm:inline">{exporting ? "Export..." : "Exporter en Excel"}</span>
          </button>
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
