import { Scissors, Package, ShoppingBag, Receipt } from "lucide-react";

const TABS = [
  { id: "produits", label: "Produits", icon: Package },
  { id: "achats", label: "Achats", icon: ShoppingBag },
  { id: "ventes", label: "Ventes", icon: Receipt },
];

export default function Header({ tab, setTab }) {
  return (
    <header className="border-b sticky top-0 z-10 bg-[#fbf6f1ee] backdrop-blur border-[#eee0d8]">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
        <div className="rounded-xl p-2 bg-rouille">
          <Scissors size={20} color="white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight font-display text-[#3a2318]">
            Eyla Création
          </h1>
          <p className="text-xs opacity-60 text-[#3a2318]">Suivi de stock</p>
        </div>
      </div>

      <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
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
