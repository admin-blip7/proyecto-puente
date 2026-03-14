"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Camera, Flashlight, Loader2, RefreshCcw } from "lucide-react";

interface CodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string) => void;
}

export default function CodeScannerDialog({ open, onOpenChange, onResult }: CodeScannerDialogProps) {
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any | null>(null);
  const startRequestRef = useRef(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const getDefaultDeviceId = useCallback((inputs: MediaDeviceInfo[]): string | undefined => {
    if (inputs.length === 0) return undefined;
    // Prefer back camera on mobile
    const backLike = inputs.find((d) => /back|rear|environment/i.test(d.label));
    if (backLike) return backLike.deviceId;
    // Otherwise prefer the last device (often back on mobile)
    return inputs[inputs.length - 1]?.deviceId;
  }, []);

  const stopScanner = useCallback(() => {
    try {
      if (controlsRef.current && typeof controlsRef.current.stop === "function") {
        controlsRef.current.stop();
      }
    } catch (e) {
      // ignore
    }
    controlsRef.current = null;

    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const listVideoDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    const zxing: any = await import("@zxing/browser");
    if (typeof zxing.BrowserCodeReader?.listVideoInputDevices === "function") {
      return zxing.BrowserCodeReader.listVideoInputDevices();
    }

    return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
  }, []);

  const applyTorch = useCallback(async (on: boolean) => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      const track = stream?.getVideoTracks()?.[0];
      // Some browsers support torch via constraints
      const capabilities = (track as any)?.getCapabilities?.();
      if (track && capabilities && (capabilities as any).torch) {
        await track.applyConstraints({ advanced: [{ torch: on }] as any });
        setTorchOn(on);
      }
    } catch (e) {
      // torch not supported
    }
  }, []);

  const updateTorchSupport = () => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()?.[0];
      const caps = (track as any)?.getCapabilities?.();
      setTorchSupported(!!(caps && (caps as any).torch));
    } catch {
      setTorchSupported(false);
    }
  };

  const startScanner = useCallback(async (preferredDeviceId?: string) => {
    stopScanner();
    const requestId = ++startRequestRef.current;
    setLoading(true);
    setError(null);

    try {
      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("MediaDevices API unavailable");
      }

      // Dynamic import to avoid SSR issues
      const zxing: any = await import("@zxing/browser");
      const reader = new zxing.BrowserMultiFormatReader();

      const allDevices = await listVideoDevices();
      if (requestId !== startRequestRef.current) return;

      setDevices(allDevices);
      const startWithDevice = preferredDeviceId || getDefaultDeviceId(allDevices);
      setSelectedDeviceId(startWithDevice);

      const onDecode = (result: any, err: any) => {
        if (result) {
          const text = result.getText ? result.getText() : String(result);
          stopScanner();
          onResult(text);
        }
        // Ignore NotFoundException errors to continue scanning
      };

      controlsRef.current = await reader.decodeFromVideoDevice(startWithDevice, videoRef.current, onDecode);

      if (requestId !== startRequestRef.current) {
        try {
          controlsRef.current?.stop?.();
        } catch {
          // Ignore cleanup failures from stale starts.
        }
        return;
      }

      // After starting, check torch support
      updateTorchSupport();
    } catch (e: any) {
      if (requestId !== startRequestRef.current) return;

      if (e?.name === "NotAllowedError") {
        setError("Permiso de cámara denegado. Concede acceso desde la configuración del navegador.");
      } else if (e?.name === "NotFoundError") {
        setError("No se encontró ninguna cámara disponible.");
      } else if (e?.name === "AbortError") {
        // Ignore transient aborts caused by teardown/restart.
        setError(null);
      } else {
        setError("No se pudo iniciar el escáner de códigos.");
      }
    } finally {
      if (requestId === startRequestRef.current) {
        setLoading(false);
      }
    }
  }, [getDefaultDeviceId, listVideoDevices, onResult, stopScanner]);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await listVideoDevices();
      setDevices(all);
      setSelectedDeviceId((current) => current || getDefaultDeviceId(all));
    } catch (e) {
      // ignore
    }
  }, [getDefaultDeviceId, listVideoDevices]);

  // Start/stop on open change
  useEffect(() => {
    if (open) {
      void startScanner();
    } else {
      startRequestRef.current += 1;
      stopScanner();
    }
    // Stop on unmount
    return () => {
      startRequestRef.current += 1;
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const handleDeviceChange = useCallback(
    async (id: string) => {
      setSelectedDeviceId(id);
      await startScanner(id || undefined);
    },
    [startScanner]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Escáner de códigos</DialogTitle>
          <DialogDescription>
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              <span>Apunta la cámara al código de barras o QR para agregar productos al carrito.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 p-4 pt-0 flex flex-col gap-3 overflow-hidden">
          <div className="relative rounded-md overflow-hidden bg-black aspect-video sm:aspect-[4/3]">
            {!open || error ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Camera className="h-8 w-8 mr-2" />
                {error ? "Cámara no disponible" : "Esperando cámara..."}
              </div>
            ) : null}
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted autoPlay playsInline />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <select
                className="max-w-full sm:max-w-md truncate border rounded-md px-2 py-2 bg-background"
                value={selectedDeviceId || ""}
                onChange={(e) => handleDeviceChange(e.target.value)}
              >
                <option value="">Cámara predeterminada</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Cámara ${d.deviceId.slice(-4)}`}
                  </option>
                ))}
              </select>
              <Button variant="ghost" size="icon" onClick={refreshDevices} title="Actualizar cámaras">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!torchSupported}
                onClick={() => applyTorch(!torchOn)}
                title={torchSupported ? (torchOn ? "Apagar linterna" : "Encender linterna") : "Linterna no soportada"}
              >
                <Flashlight className="h-4 w-4 mr-2" /> {torchOn ? "Linterna ON" : "Linterna OFF"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => startScanner(selectedDeviceId)} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reiniciar
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
