import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db, ensureAuth } from "../firebase";

const BACKUP_COLLECTIONS = ["produits", "achats", "ventes", "commandes"];

// Télécharge un fichier JSON contenant toutes les données de l'appli.
// Ce fichier peut être réimporté plus tard avec restoreBackupJSON().
export async function exportBackupJSON() {
  await ensureAuth();

  const backup = { createdAt: new Date().toISOString(), collections: {} };

  for (const name of BACKUP_COLLECTIONS) {
    const snap = await getDocs(collection(db, name));
    backup.collections[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gestion-stocks_sauvegarde_${backup.createdAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Réimporte un fichier de sauvegarde généré par exportBackupJSON().
// Les documents sont réécrits avec leur identifiant d'origine (recréés à l'identique).
export async function restoreBackupJSON(file) {
  await ensureAuth();

  const text = await file.text();
  const backup = JSON.parse(text);

  if (!backup.collections) {
    throw new Error("Fichier de sauvegarde invalide");
  }

  for (const name of Object.keys(backup.collections)) {
    if (!BACKUP_COLLECTIONS.includes(name)) continue;
    const docsToRestore = backup.collections[name];

    // Firestore limite un batch à 500 opérations : on découpe par lots de 450
    for (let i = 0; i < docsToRestore.length; i += 450) {
      const chunk = docsToRestore.slice(i, i + 450);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const { id, ...data } = item;
        batch.set(doc(db, name, id), data);
      });
      await batch.commit();
    }
  }

  return {
    createdAt: backup.createdAt,
    counts: Object.fromEntries(
      Object.entries(backup.collections).map(([k, v]) => [k, v.length])
    ),
  };
}
