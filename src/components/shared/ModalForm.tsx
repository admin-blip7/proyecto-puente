"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Reglas clave:
 * - El overlay y el content los maneja shadcn/ui (Radix).
 * - El SCROLL vive en un DIV interno (className="dialog-scroll") con:
 *   max-h calculado con 100dvh, overflow-y-auto, ios-scroll y padding propio.
 * - Header y Footer NO scrollean; permanecen visibles.
 */
export function ModalForm() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Abrir formulario de prueba</Button>
        </DialogTrigger>

        <DialogContent
          // Tailwind: ancho máx y layout de columna
          className={[
            "p-0",                         // manejamos padding dentro de las secciones
            "max-w-2xl w-[92vw]",          // ancho responsivo
            "flex flex-col",               // columna: header (fixed), scroll (flex-1), footer (fixed)
            // animaciones shadcn por si las usas
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          ].join(" ")}
        >
          {/* HEADER (no scrollea) */}
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle>Formulario largo</DialogTitle>
          </DialogHeader>

          {/* CONTENIDO SCROLLEABLE */}
          <div
            className={[
              "dialog-scroll",                 // habilitada en globals.css para abrir scroll bajo lock
              "flex-1 overflow-y-auto ios-scroll",
              "px-6 py-4",
              // Altura máxima basada en viewport dinámico: deja 4rem de margen total aprox
              "max-h-[calc(100dvh-8rem)]",
            ].join(" ")}
          >
            <LongForm />
          </div>

          {/* FOOTER (no scrollea) */}
          <DialogFooter className="px-6 pt-3 pb-6 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="long-form">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Ejemplo de formulario MUY largo para forzar scroll */
function LongForm() {
  return (
    <form id="long-form" className="space-y-4">
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm font-medium">Campo {i + 1}</label>
          <input
            className="h-10 w-full rounded-md border px-3 outline-none focus:ring-2 focus:ring-ring"
            placeholder={`Valor ${i + 1}`}
          />
        </div>
      ))}
      <textarea className="w-full min-h-32 rounded-md border p-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Notas..." />
    </form>
  );
}
