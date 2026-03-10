import { format } from "date-fns";
import { getRouteManifest } from "@/lib/services/deliveryRouteService";
import { generateReportPdf } from "@/lib/services/pdfReportService";

const buildManifestRows = (stops: any[]) => {
  const rows: string[][] = [];

  stops.forEach((stop: any) => {
    const customer = stop.customer_name || "Cliente";
    const address = [stop.address, stop.city, stop.state].filter(Boolean).join(", ");
    const items = stop.delivery_items || [];

    if (items.length === 0) {
      rows.push([
        String(stop.stop_sequence),
        customer,
        address,
        "Sin items",
        stop.status,
      ]);
      return;
    }

    items.forEach((item: any, index: number) => {
      rows.push([
        index === 0 ? String(stop.stop_sequence) : "",
        index === 0 ? customer : "",
        index === 0 ? address : "",
        `${item.product_name} x${item.quantity}`,
        item.status,
      ]);
    });
  });

  return rows;
};

export const generateRouteManifest = async (routeId: string): Promise<Blob> => {
  const manifest = await getRouteManifest(routeId);
  if (!manifest.route) {
    throw new Error("Ruta no encontrada");
  }

  const subtitle = `Ruta ${manifest.route.routeCode} - ${format(
    manifest.route.deliveryDate,
    "yyyy-MM-dd"
  )}`;

  return generateReportPdf({
    title: "Manifiesto de Ruta",
    subtitle,
    details: [
      `Repartidor: ${manifest.route.assignedTo || "Sin asignar"}`,
      `Estatus: ${manifest.route.status}`,
      `Total paradas: ${manifest.stops.length}`,
    ],
    table: {
      headers: ["#", "Cliente", "Dirección", "Item", "Estatus"],
      rows: buildManifestRows(manifest.stops),
      columnWidths: [6, 24, 36, 24, 10],
    },
    filename: `manifest-${manifest.route.routeCode}.pdf`,
  });
};

export const generateDriverManifest = async (routeId: string): Promise<Blob> => {
  const manifest = await getRouteManifest(routeId);
  if (!manifest.route) {
    throw new Error("Ruta no encontrada");
  }

  return generateReportPdf({
    title: "Hoja del Repartidor",
    subtitle: `Ruta ${manifest.route.routeCode}`,
    details: [
      `Fecha: ${format(manifest.route.deliveryDate, "yyyy-MM-dd")}`,
      `Paradas: ${manifest.stops.length}`,
    ],
    table: {
      headers: ["#", "Dirección", "Teléfono", "Estatus"],
      rows: manifest.stops.map((stop: any) => [
        String(stop.stop_sequence),
        [stop.address, stop.city, stop.state].filter(Boolean).join(", "),
        stop.phone || "-",
        stop.status,
      ]),
      columnWidths: [8, 54, 20, 18],
    },
    filename: `driver-manifest-${manifest.route.routeCode}.pdf`,
  });
};

export const generateReturnManifest = async (routeId: string): Promise<Blob> => {
  const manifest = await getRouteManifest(routeId);
  if (!manifest.route) {
    throw new Error("Ruta no encontrada");
  }

  const rows: string[][] = [];
  manifest.stops.forEach((stop: any) => {
    (stop.delivery_items || [])
      .filter((it: any) => it.status === "returned" || it.status === "damaged")
      .forEach((item: any) => {
        rows.push([
          String(stop.stop_sequence),
          stop.customer_name || "Cliente",
          item.product_name,
          String(item.quantity),
          item.status,
        ]);
      });
  });

  return generateReportPdf({
    title: "Manifiesto de Devoluciones",
    subtitle: `Ruta ${manifest.route.routeCode}`,
    details: [`Fecha: ${format(manifest.route.deliveryDate, "yyyy-MM-dd")}`],
    table: {
      headers: ["#", "Cliente", "Producto", "Cantidad", "Estado"],
      rows,
      columnWidths: [8, 28, 34, 15, 15],
    },
    filename: `returns-${manifest.route.routeCode}.pdf`,
  });
};

export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  if (typeof window === "undefined") {
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:application/pdf;base64,${base64}`;
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `data:application/pdf;base64,${window.btoa(binary)}`;
};

export const generateRouteManifestPDF = generateRouteManifest;
export const generateDriverCopy = generateDriverManifest;
export const generateReturnSheet = generateReturnManifest;
