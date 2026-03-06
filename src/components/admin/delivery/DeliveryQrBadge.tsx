"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  value: string;
  size?: number;
}

export default function DeliveryQrBadge({ value, size = 96 }: Props) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let mounted = true;
    void QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((dataUrl) => {
        if (mounted) setSrc(dataUrl);
      })
      .catch(() => {
        if (mounted) setSrc("");
      });
    return () => {
      mounted = false;
    };
  }, [value, size]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt="QR de entrega"
      width={size}
      height={size}
      className="rounded border bg-white"
    />
  );
}
