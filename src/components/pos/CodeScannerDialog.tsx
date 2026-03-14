"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Flashlight, Loader2, RefreshCcw, SwitchCamera, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface CodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string) => void;
}

export default function CodeScannerDialog({ open, onOpenChange, onResult }: CodeScannerDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [torchOn, setTorchOn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  // Stop everything
  const stopAll = useCallback(async () => {
    // Stop html5-qrcode scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setTorchOn(false);
    setIsReady(false);
    setCameraStarted(false);
  }, []);

  // Get available cameras
  const getDevices = useCallback(async () => {
    try {
      // First request permission
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      
      // Find back camera
      const backCamera = videoDevices.find(d => 
        /back|rear|environment|trasera|posterior/i.test(d.label)
      );
      
      return { videoDevices, backCamera };
    } catch (err) {
      console.error("Error getting devices:", err);
      return { videoDevices: [], backCamera: null };
    }
  }, []);

  // Start camera directly with getUserMedia (more reliable on iOS)
  const startCameraDirect = useCallback(async (deviceId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await stopAll();
      
      // Get devices first
      const { videoDevices, backCamera } = await getDevices();
      
      // Build constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      // Use specific device if provided
      if (deviceId) {
        constraints.video = { 
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        };
      } else if (backCamera) {
        constraints.video = { 
          deviceId: { exact: backCamera.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        };
      }
      
      console.log("Starting camera with constraints:", constraints);
      
      // Get stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().then(() => {
          console.log("Video playing");
          setCameraStarted(true);
        }).catch(err => {
          console.error("Error playing video:", err);
        });
      }
      
      // Now start scanner on the video element
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for video to be ready
      
      // Create scanner and scan from video
      const scanner = new Html5Qrcode("scanner-video-container");
      scannerRef.current = scanner;
      
      // Scan from video stream
      await scanner.start(
        stream,
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
        },
        (decodedText) => {
          // Success!
          if (navigator.vibrate) navigator.vibrate(100);
          onResult(decodedText);
          onOpenChange(false);
        },
        () => {
          // Ignore scan errors
        }
      );
      
      setIsReady(true);
      setSelectedDeviceId(deviceId || backCamera?.deviceId || videoDevices[0]?.deviceId);
      
    } catch (err: any) {
      console.error("Camera error:", err);
      
      if (err?.name === "NotAllowedError") {
        setError("Permiso de cámara denegado. Ve a Configuración > Safari > Cámara y permite el acceso.");
      } else if (err?.name === "NotFoundError") {
        setError("No se encontró cámara en este dispositivo.");
      } else if (err?.name === "NotReadableError") {
        setError("La cámara está siendo usada por otra app. Cierra otras apps que usen la cámara.");
      } else if (err?.name === "OverconstrainedError") {
        // Try again without constraints
        setError("Intentando con cámara frontal...");
        setTimeout(() => startCameraDirectFallback(), 100);
        return;
      } else {
        setError(`Error de cámara: ${err?.message || 'Desconocido'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [getDevices, stopAll, onResult, onOpenChange]);

  // Fallback without constraints
  const startCameraDirectFallback = useCallback(async () => {
    try {
      await stopAll();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraStarted(true);
      }
      
      const scanner = new Html5Qrcode("scanner-video-container");
      scannerRef.current = scanner;
      
      await scanner.start(
        stream,
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          if (navigator.vibrate) navigator.vibrate(100);
          onResult(decodedText);
          onOpenChange(false);
        },
        () => {}
      );
      
      setIsReady(true);
      setError(null);
      
    } catch (err: any) {
      setError(`Error: ${err?.message}`);
    }
  }, [stopAll, onResult, onOpenChange]);

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    
    try {
      const capabilities = track.getCapabilities?.();
      if (capabilities && 'torch' in capabilities) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn } as any]
        });
        setTorchOn(!torchOn);
      }
    } catch (err) {
      console.log("Torch not supported");
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (devices.length < 2) return;
    
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;
    
    setSelectedDeviceId(nextDeviceId);
    await startCameraDirect(nextDeviceId);
  };

  // Handle open/close
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        startCameraDirect();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      stopAll();
    }
  }, [open, startCameraDirect, stopAll]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) stopAll();
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
        
        {/* Scanner container */}
        <div 
          id="scanner-video-container"
          className="relative bg-black w-full"
          style={{ height: "300px" }}
        >
          {/* Video element - direct camera feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ 
              width: "100%", 
              height: "300px",
              display: cameraStarted ? "block" : "none"
            }}
          />
          
          {/* Scanning overlay */}
          {cameraStarted && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div 
                className="border-2 border-white/70 rounded-lg"
                style={{ 
                  width: "200px", 
                  height: "200px",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)"
                }}
              />
            </div>
          )}
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
              <Loader2 className="h-10 w-10 animate-spin text-white mb-3" />
              <p className="text-white text-sm">Iniciando cámara...</p>
            </div>
          )}
          
          {/* Error overlay */}
          {error && !loading && !cameraStarted && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 z-20">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-white text-center text-sm mb-4">{error}</p>
              <Button 
                variant="outline" 
                className="bg-white text-black"
                onClick={() => startCameraDirect()}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="p-3 border-t bg-background flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <select
                className="text-xs border rounded px-2 py-1.5 bg-background max-w-[120px] truncate"
                value={selectedDeviceId || ""}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCameraDirect(e.target.value);
                }}
                disabled={loading}
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Cámara`}
                  </option>
                ))}
              </select>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => startCameraDirect()}
              title="Reiniciar cámara"
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={switchCamera}
                title="Cambiar cámara"
                disabled={loading || !cameraStarted}
              >
                <SwitchCamera className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant={torchOn ? "default" : "outline"}
              size="sm"
              onClick={toggleTorch}
              title={torchOn ? "Apagar linterna" : "Encender linterna"}
              disabled={loading || !cameraStarted}
            >
              <Flashlight className={`h-4 w-4 ${torchOn ? "text-yellow-400" : ""}`} />
            </Button>
            
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
