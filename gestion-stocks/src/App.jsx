import { useState } from "react";
import Header from "./components/Header";
import ProduitsTab from "./components/ProduitsTab";
import AchatsTab from "./components/AchatsTab";
import VentesTab from "./components/VentesTab";

export default function App() {
  const [tab, setTab] = useState("produits");

  return (
    <div className="min-h-screen bg-[#fbf6f1]">
      <Header tab={tab} setTab={setTab} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "produits" && <ProduitsTab />}
        {tab === "achats" && <AchatsTab />}
        {tab === "ventes" && <VentesTab />}
      </main>
    </div>
  );
}
