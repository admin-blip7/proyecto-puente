"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface Props {
  value?: string;
  onChange: (value: string) => void;
}

export default function PhotoCapture({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      onChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
        <Camera className="h-4 w-4 mr-2" /> Capturar foto
      </Button>
      {value ? <img src={value} alt="evidencia" className="w-full rounded-md border" /> : null}
    </div>
  );
}
