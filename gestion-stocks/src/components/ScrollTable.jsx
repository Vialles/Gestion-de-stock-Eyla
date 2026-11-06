import { useEffect, useRef, useState } from "react";

// Conteneur de tableau avec une barre de défilement horizontale en haut ET en bas,
// synchronisées entre elles (pratique pour les tableaux larges).
export default function ScrollTable({ children }) {
  const topRef = useRef(null);
  const bottomRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const measure = () => setContentWidth(el.scrollWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [children]);

  const fromTop = () => {
    if (bottomRef.current.scrollLeft !== topRef.current.scrollLeft) {
      bottomRef.current.scrollLeft = topRef.current.scrollLeft;
    }
  };
  const fromBottom = () => {
    if (topRef.current.scrollLeft !== bottomRef.current.scrollLeft) {
      topRef.current.scrollLeft = bottomRef.current.scrollLeft;
    }
  };

  return (
    <div className="rounded-xl border border-[#eee0d8] overflow-hidden bg-white">
      <div ref={topRef} onScroll={fromTop} className="overflow-x-auto overflow-y-hidden border-b border-[#f2e6df]" style={{ height: 16 }}>
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      <div ref={bottomRef} onScroll={fromBottom} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
