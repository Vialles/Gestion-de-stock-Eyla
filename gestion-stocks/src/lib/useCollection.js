import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db, ensureAuth } from "../firebase";

// Hook générique pour lire/écrire une collection Firestore en temps réel.
// Chaque module (produits, achats, ventes) l'utilise avec son propre nom de collection.
export function useCollection(name, orderField = "date") {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};
    ensureAuth().then(() => {
      const q = query(collection(db, name), orderBy(orderField, "desc"));
      unsub = onSnapshot(q, (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    });
    return () => unsub();
  }, [name, orderField]);

  async function add(data) {
    await addDoc(collection(db, name), { ...data, createdAt: Date.now() });
  }

  async function remove(id) {
    await deleteDoc(doc(db, name, id));
  }

  return { rows, add, remove, loading };
}
