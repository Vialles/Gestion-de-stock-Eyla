import { useState } from "react";
import Header from "./components/Header";
import ProduitsTab from "./components/ProduitsTab";
import AchatsTab from "./components/AchatsTab";
import VentesTab from "./components/VentesTab";
import CommandesTab from "./components/CommandesTab";

export default function App() {
  const [tab, setTab] = useState("achats");

  return (
    <div className="min-h-screen bg-[#fbf6f1]">
      <Header tab={tab} setTab={setTab} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "achats" && <AchatsTab />}
        {tab === "produits" && <ProduitsTab />}
        {tab === "ventes" && <VentesTab />}
        {tab === "commandes" && <CommandesTab />}
      </main>
    </div>
  );
}
