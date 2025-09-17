"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PrintLabelsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [labels, setLabels] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [attempted, setAttempted] = useState(false);

  // Expandir etiquetas por cantidad
  const expanded = useMemo(() => {
    const out: any[] = [];
    for (const item of labels) {
      const qty = Math.max(0, parseInt(item.cantidad ?? 0, 10) || 0);
      for (let i = 0; i < qty; i++) {
        out.push({ ...item, _k: `${item.id}-${i}` });
      }
    }
    return out;
  }, [labels]);

  // Cargar datos desde sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("labelsToPrint");
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr) || arr.length === 0) {
        alert("No hay etiquetas para imprimir.");
        router.back();
        return;
      }
      setLabels(arr);
    } catch (e) {
      console.error(e);
      router.back();
    }
  }, [router]);

  // Esperar fuentes + imágenes antes de print
  useEffect(() => {
    if (expanded.length === 0) return;
    let cancelled = false;
    async function waitAssets() {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch {/* ignore */}
      const imgs = Array.from(containerRef.current?.querySelectorAll("img") || []);
      await Promise.all(
        imgs.map(img => new Promise<void>(res => {
          if ((img.complete && img.naturalWidth > 0) || !img.src) return res();
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        }))
      );
      if (!cancelled) setReady(true);
    }
    waitAssets();
    return () => { cancelled = true; };
  }, [expanded]);

  // afterprint: regresar a la pantalla anterior
  useEffect(() => {
    function handleAfterPrint() {
      // Pequeño defer por si Safari cambia visibilidad
      setTimeout(() => router.back(), 50);
    }
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [router]);

  // Disparar el diálogo de impresión cuando todo esté listo
  useEffect(() => {
    if (!ready || attempted) return;
    setAttempted(true);

    // ⚠️ iOS PWA (standalone) a veces NO soporta print(): detectar y avisar
    const isStandalone = (window.navigator as any).standalone === true
      || window.matchMedia("(display-mode: standalone)").matches;

    // Doble rAF asegura un paint completo antes de print()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          if (isStandalone && typeof window.print !== "function") {
            alert("Impresión no disponible en modo app. Ábrelo en Safari para imprimir.");
            // Fallback: regresar manualmente
            router.back();
            return;
          }
          window.print();
        } catch (e) {
          console.error("print() falló", e);
          // Fallback: abrir en ventana nueva (si el gesto original no llegó hasta aquí, puede bloquearse)
          const html = document.documentElement.outerHTML;
          const w = window.open("", "_blank");
          if (w) {
            w.document.open();
            w.document.write(html);
            w.document.close();
            // Espera breve y dispara print del popup
            w.focus();
            setTimeout(() => { try { w.print(); } catch {} }, 200);
          } else {
            alert("El navegador bloqueó la impresión. Reintenta desde Safari navegador (no PWA).");
          }
          // Regresar por si no se imprime
          setTimeout(() => router.back(), 500);
        }
      });
    });
  }, [ready, attempted, router]);


  return (
    <div ref={containerRef}>
      <style jsx global>{`
        @page { size: 58mm 40mm; margin: 0; }
        @media print {
          html, body { height: auto; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .label { 
              display: block;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: always;
           }
           .label:last-child {
               page-break-after: auto;
           }
           .sheet { display: block; }
        }
        .sheet { display: grid; grid-template-columns: repeat(3, 58mm); gap: 4mm; }
        .label {
          width: 58mm; height: 40mm; padding: 2mm; box-sizing: border-box;
          border: 1px dashed rgba(0,0,0,0.2);
          display: flex; flex-direction: column; justify-content: space-between;
          overflow: hidden;
        }
        .name { font-weight: 700; font-size: 10pt; line-height: 1.1; }
        .sku { font-size: 8pt; opacity: 0.8; }
        .price { font-size: 11pt; font-weight: 700; }
        .meta { font-size: 7pt; opacity: 0.8; display:flex; justify-content:space-between; }
        .barcode { width: 100%; height: 14mm; object-fit: contain; }
      `}</style>
      
      {expanded.length === 0 ? (
        <div>Cargando etiquetas...</div>
      ) : (
        <div className="sheet">
            {expanded.map((lbl) => (
            <div key={lbl._k} className="label">
                <div>
                <div className="name">{lbl.nombre || "\u00A0"}</div>
                <div className="sku">{lbl.sku || "\u00A0"}</div>
                </div>
                <img className="barcode" src={lbl.barcodeUrl || ""} alt="" />
                <div className="meta">
                <span className="price">
                    {lbl.precio !== "" ? \`$\${Number(lbl.precio).toFixed(2)}\` : "\u00A0"}
                </span>
                <span>{new Date().toLocaleDateString()}</span>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
}
