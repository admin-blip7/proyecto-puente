"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [torchOn, setTorchOn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Unique container ID
  const containerId = useRef(`scanner-${Date.now()}`).current;

  // Get available cameras
  const refreshDevices = useCallback(async () => {
    try {
      const allDevices = await Html5Qrcode.getCameras();
      if (allDevices && allDevices.length > 0) {
        setDevices(allDevices);
        
        // Prefer back camera on mobile
        const backCamera = allDevices.find(d => 
          /back|rear|environment|trasera|posterior/i.test(d.label)
        );
        
        if (!selectedDeviceId) {
          const defaultId = backCamera?.id || allDevices[allDevices.length - 1]?.id;
          setSelectedDeviceId(defaultId);
        }
        
        return allDevices;
      }
    } catch (err) {
      console.error("Error getting cameras:", err);
    }
    return [];
  }, [selectedDeviceId]);

  // Stop scanner
  const stopScanner = useCallback(async () => {
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
    setIsReady(false);
  }, []);

  // Start scanner
  const startScanner = useCallback(async (deviceId?: string) => {
    if (!containerRef.current) {
      console.log("Container not ready");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Stop any existing scanner
      await stopScanner();

      // Wait a bit for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new scanner
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      // Configuration optimized for mobile
      const config = {
        fps: 10,
        qrbox: { width: 200, height: 200 },
        disableFlip: false,
        formatsToSupport: [
          0,  // QR Code
          1,  // EAN-13
          2,  // EAN-8
          3,  // Code 39
          4,  // Code 93
          5,  // Code 128
          6,  // CODABAR
          7,  // ITF
          9,  // UPC-A
          10, // UPC-E
        ],
      };

      // Use deviceId if available, otherwise use facingMode
      let cameraConfig: any;
      if (deviceId) {
        cameraConfig = { deviceId: { exact: deviceId } };
      } else {
        // For iOS/Safari, facingMode works better
        cameraConfig = { facingMode: "environment" };
      }

      console.log("Starting scanner with config:", cameraConfig);

      await scanner.start(
        cameraConfig,
        config,
        (decodedText) => {
          // Success callback
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          
          // Play beep
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAwUmLXtyW0jDwU7l8bXpVoMBz2WydmkVQoFQZbG2qNUBwVElsbbpU4JBkiWxdumTQoGSJbF26ZNCgZIlsXbpk0KBkiWxdumTQoGSJbF26ZNCgZIlsXbpk0KBkiWxdumTQoG");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
          
          onResult(decodedText);
          onOpenChange(false);
        },
        () => {
          // Ignore scan errors
        }
      );

      setIsReady(true);
      
      // Refresh device list after starting (permissions granted)
      const allDevices = await refreshDevices();
      
      // If no deviceId was provided and we have devices, try to use back camera
      if (!deviceId && allDevices.length > 0) {
        const backCamera = allDevices.find(d => 
          /back|rear|environment|trasera|posterior/i.test(d.label)
        );
        if (backCamera && backCamera.id !== selectedDeviceId) {
          // Restart with back camera
          await scanner.stop();
          scannerRef.current = null;
          await startScanner(backCamera.id);
          return;
        }
      }

    } catch (err: any) {
      console.error("Scanner error:", err);
      
      // Try fallback with just facingMode
      if (err?.name === "OverconstrainedError" && deviceId) {
        console.log("Trying fallback with facingMode...");
        try {
          await stopScanner();
          
          const scanner = new Html5Qrcode(containerId);
          scannerRef.current = scanner;
          
          const config = {
            fps: 10,
            qrbox: { width: 200, height: 200 },
            aspectRatio: 1.0,
          };
          
          await scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              if (navigator.vibrate) navigator.vibrate(100);
              onResult(decodedText);
              onOpenChange(false);
            },
            () => {}
          );
          
          setIsReady(true);
          await refreshDevices();
          return;
        } catch (fallbackErr) {
          console.error("Fallback also failed:", fallbackErr);
        }
      }
      
      if (err?.name === "NotAllowedError") {
        setError("Permiso de cámara denegado. Concede acceso desde la configuración del navegador.");
      } else if (err?.name === "NotFoundError") {
        setError("No se encontró ninguna cámara disponible.");
      } else if (err?.name === "NotReadableError") {
        setError("La cámara está siendo usada por otra aplicación.");
      } else if (err?.message?.includes("not found")) {
        setError("Cámara no encontrada. Intenta seleccionar otra.");
      } else {
        setError(`No se pudo iniciar el escáner: ${err?.message || 'Error desconocido'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [containerId, refreshDevices, onResult, onOpenChange, selectedDeviceId, stopScanner]);

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current || !isReady) return;
    
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
      console.log("Torch not supported:", err);
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (devices.length < 2 || !isReady) return;
    
    const currentIndex = devices.findIndex(d => d.id === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].id;
    
    setSelectedDeviceId(nextDeviceId);
    await startScanner(nextDeviceId);
  };

  // Handle open/close
  useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        stopScanner();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
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
        
        {/* Scanner container - fixed size for mobile */}
        <div className="relative bg-black w-full overflow-hidden" style={{ height: "300px" }}>
          <div 
            ref={containerRef}
            id={containerId}
            className="scanner-container"
            style={{ 
              width: "100%", 
              height: "300px",
              position: "relative"
            }}
          />
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10">
              <Loader2 className="h-10 w-10 animate-spin text-white mb-3" />
              <p className="text-white text-sm">Iniciando cámara...</p>
            </div>
          )}
          
          {/* Error overlay */}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 z-10">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-white text-center text-sm mb-4">{error}</p>
              <Button 
                variant="outline" 
                className="bg-white text-black"
                onClick={() => startScanner()}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
          
          {/* Scanning guide overlay */}
          {isReady && !loading && !error && (
            <div className="absolute inset-0 pointer-events-none z-5 flex items-center justify-center">
              <div 
                className="border-2 border-white/50 rounded-lg"
                style={{ 
                  width: "60%", 
                  aspectRatio: "1",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)"
                }}
              />
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="p-3 border-t bg-background flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Camera selector */}
            {devices.length > 1 && (
              <select
                className="text-xs border rounded px-2 py-1.5 bg-background max-w-[120px] truncate"
                value={selectedDeviceId || ""}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startScanner(e.target.value);
                }}
                disabled={loading}
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label || `Cámara`}
                  </option>
                ))}
              </select>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={refreshDevices}
              title="Actualizar cámaras"
              disabled={loading}
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
                disabled={loading || !isReady}
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
              disabled={loading || !isReady}
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
