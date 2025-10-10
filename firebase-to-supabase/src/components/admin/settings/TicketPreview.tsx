"use client";

import { TicketSettings } from "@/types";
import PrintableTicket from "./PrintableTicket";


interface TicketPreviewProps {
  settings: TicketSettings;
}

export default function TicketPreview({ settings }: TicketPreviewProps) {
  return (
    <div
      className="bg-white text-black font-mono shadow-lg"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
        <PrintableTicket settings={settings} sale={null} />
    </div>
  );
}
