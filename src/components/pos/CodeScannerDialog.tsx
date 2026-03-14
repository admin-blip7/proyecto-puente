"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Flashlight, Loader2, RefreshCcw, SwitchCamera, X } from "lucide-react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

interface CodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string) => void;
}

export default function CodeScannerDialog({ open, onOpenChange, onResult }: CodeScannerDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [torchOn, setTorchOn] = useState(false);
  const containerId = "barcode-scanner-container";

  // Get available cameras
  const refreshDevices = async () => {
    try {
      const allDevices = await Html5Qrcode.getCameras();
      if (allDevices && allDevices.length > 0) {
        setDevices(allDevices);
        // Prefer back camera
        const backCamera = allDevices.find(d => 
          /back|rear|environment/i.test(d.label)
        );
        if (!selectedDeviceId) {
          setSelectedDeviceId(backCamera?.id || allDevices[0].id);
        }
      }
    } catch (err) {
      console.error("Error getting cameras:", err);
    }
  };

  // Stop scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // Ignore errors on stop
      }
      scannerRef.current = null;
    }
    setTorchOn(false);
  };

  // Start scanner
  const startScanner = async (deviceId?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Stop any existing scanner
      await stopScanner();

      // Create new scanner
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      const cameraId = deviceId || selectedDeviceId;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778,
        formatsToSupport: [
          0,  // QR Code
          1,  // EAN-13
          2,  // EAN-8
          3,  // Code 39
          4,  // Code 93
          5,  // Code 128
          6,  // CODABAR
          7,  // ITF
          8,  // Data Matrix
          9,  // UPC-A
          10, // UPC-E
          11, // PDF 417
        ],
      };

      await scanner.start(
        cameraId || { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success callback - vibrate if supported
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          // Play beep sound
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAwUmLXtyW0jDwU7l8bXpVoMBz2WydmkVQoFQZbG2qNUBwVElsbbpU4JBkiWxdumTQoGSJbF26ZNCgZIlsXbpk0KBkiWxdumTQoGSJbF26ZNCgZIlsXbpk0KBkiWxdumTQoG");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
          
          onResult(decodedText);
          onOpenChange(false);
        },
        (errorMessage) => {
          // Ignore scan errors - they happen continuously during scanning
        }
      );

      // Refresh device list after starting (permissions granted)
      await refreshDevices();

    } catch (err: any) {
      console.error("Scanner error:", err);
      if (err?.name === "NotAllowedError") {
        setError("Permiso de cámara denegado. Concede acceso desde la configuración del navegador.");
      } else if (err?.name === "NotFoundError") {
        setError("No se encontró ninguna cámara disponible.");
      } else if (err?.message?.includes("not found")) {
        setError("Cámara no encontrada. Intenta seleccionar otra.");
      } else {
        setError("No se pudo iniciar el escáner. Intenta recargar la página.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    
    try {
      if (torchOn) {
        await scannerRef.current.applyVideoConstraints({ 
          advanced: [{ torch: false }] as any 
        });
        setTorchOn(false);
      } else {
        await scannerRef.current.applyVideoConstraints({ 
          advanced: [{ torch: true }] as any 
        });
        setTorchOn(true);
      }
    } catch (err) {
      console.log("Torch not supported");
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (devices.length < 2) return;
    
    const currentIndex = devices.findIndex(d => d.id === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].id;
    
    setSelectedDeviceId(nextDeviceId);
    await startScanner(nextDeviceId);
  };

  // Handle open/close
  useEffect(() => {
    if (open) {
      startScanner();
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        stopScanner();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escáner de códigos
          </DialogTitle>
          <DialogDescription>
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              "Apunta al código de barras o QR"
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Scanner container */}
        <div className="relative bg-black">
          <div 
            id={containerId} 
            className="w-full aspect-[4/3]"
          />
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          
          {/* Error overlay */}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4">
              <Camera className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-white text-center text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => startScanner()}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="p-4 border-t flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Camera selector */}
            <select
              className="text-sm border rounded-md px-2 py-1.5 bg-background max-w-[150px] truncate"
              value={selectedDeviceId || ""}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startScanner(e.target.value);
              }}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label || `Cámara`}
                </option>
              ))}
            </select>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={refreshDevices}
              title="Actualizar cámaras"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Switch camera button */}
            {devices.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={switchCamera}
                title="Cambiar cámara"
              >
                <SwitchCamera className="h-4 w-4" />
              </Button>
            )}
            
            {/* Flashlight toggle */}
            <Button
              variant={torchOn ? "default" : "outline"}
              size="sm"
              onClick={toggleTorch}
              title={torchOn ? "Apagar linterna" : "Encender linterna"}
            >
              <Flashlight className={`h-4 w-4 ${torchOn ? "text-yellow-400" : ""}`} />
            </Button>
            
            {/* Close button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
