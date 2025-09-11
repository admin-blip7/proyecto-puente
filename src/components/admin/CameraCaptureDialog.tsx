"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, RefreshCcw, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";

interface CameraCaptureDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoTaken: (file: File | null) => void;
}

export default function CameraCaptureDialog({ isOpen, onOpenChange, onPhotoTaken }: CameraCaptureDialogProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const cleanupCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    async function getCameraPermission() {
      if (!isOpen) {
        cleanupCamera();
        return;
      }
      if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
        toast({ variant: 'destructive', title: 'Error', description: 'La cámara no es compatible con este navegador.' });
        setHasPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasPermission(false);
        toast({
          variant: 'destructive',
          title: 'Permiso de Cámara Denegado',
          description: 'Por favor, habilita los permisos de cámara en tu navegador.',
        });
      }
    }
    getCameraPermission();

    return () => {
      cleanupCamera();
    }
  }, [isOpen, toast, cleanupCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      setIsCapturing(false);
      cleanupCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setIsCapturing(true);
    // Re-trigger permission request and video stream
    if (isOpen) {
        async function reinitializeCamera() {
             try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setHasPermission(true);
            } catch (error) {
                setHasPermission(false);
            }
        }
        reinitializeCamera();
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]); 
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  const handleUsePhoto = () => {
    if (capturedImage) {
      const file = dataURLtoFile(capturedImage, `capture-${Date.now()}.jpg`);
      onPhotoTaken(file);
      onOpenChange(false);
    }
  };
  
  const handleClose = (open: boolean) => {
    if (!open) {
        cleanupCamera();
        setIsCapturing(true);
        setCapturedImage(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tomar Foto del Producto</DialogTitle>
          <DialogDescription>
            Asegúrate de que el producto esté bien iluminado y centrado.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          {hasPermission === null && (
            <div className="h-64 flex items-center justify-center bg-muted rounded-md">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-4">Iniciando cámara...</p>
            </div>
          )}
          {hasPermission === false && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Acceso a la Cámara Denegado</AlertTitle>
                <AlertDescription>
                   No se pudo acceder a la cámara. Por favor, revisa los permisos en la configuración de tu navegador.
                </AlertDescription>
            </Alert>
          )}
          {hasPermission && (
            <div className="relative">
                {isCapturing ? (
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay playsInline muted />
                ) : (
                    <img src={capturedImage || ''} alt="Captura" className="w-full aspect-video rounded-md object-contain bg-black" />
                )}
                 <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
          )}
        </div>
        <DialogFooter>
          {isCapturing ? (
             <Button onClick={handleCapture} disabled={!hasPermission} className="w-full" size="lg">
                <Camera className="mr-2 h-5 w-5" /> Capturar
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2 w-full">
                <Button onClick={handleRetake} variant="outline">
                    <RefreshCcw className="mr-2 h-4 w-4" /> Tomar de Nuevo
                </Button>
                <Button onClick={handleUsePhoto}>
                    ✅ Usar Foto
                </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
