"use client";

import { useState } from "react";
import { BrandingSettings } from "@/types";
import { useBranding } from "@/components/brand/BrandingProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { UploadCloud, Loader2 } from "lucide-react";
import { saveBrandingSettings } from "@/lib/services/settingsService";

interface CustomizationClientProps {
  initialSettings: BrandingSettings;
}

export default function CustomizationClient({ initialSettings }: CustomizationClientProps) {
  const { settings: contextSettings, setSettings: setContextSettings } = useBranding();
  const [localSettings, setLocalSettings] = useState(initialSettings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [defaultImageFile, setDefaultImageFile] = useState<File | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isSavingDefaultImage, setIsSavingDefaultImage] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'default_product_image') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') {
          setLocalSettings(prev => ({ ...prev, logo_url: reader.result as string }));
          setLogoFile(file);
        } else {
          setLocalSettings(prev => ({ ...prev, default_product_image_url: reader.result as string }));
          setDefaultImageFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (type: 'logo' | 'default_product_image') => {
    if (type === 'logo') {
      setIsSavingLogo(true);
    } else {
      setIsSavingDefaultImage(true);
    }

    try {
      const updatedSettings = await saveBrandingSettings({}, {
        logo: type === 'logo' ? logoFile : undefined,
        default_product_image: type === 'default_product_image' ? defaultImageFile : undefined
      });
      
      // Update local and global context state
      setLocalSettings(updatedSettings);
      setContextSettings(updatedSettings);

      toast({ title: "Éxito", description: "La configuración se ha guardado correctamente." });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la configuración." });
    } finally {
      if (type === 'logo') {
        setIsSavingLogo(false);
        setLogoFile(null);
      } else {
        setIsSavingDefaultImage(false);
        setDefaultImageFile(null);
      }
    }
  };


  return (
    <div>
        <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Personalizar Tienda</h1>
            <p className="text-muted-foreground">Cambia el logo y las imágenes predeterminadas de tu aplicación.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Logo Principal</CardTitle>
                    <CardDescription>Este logo aparecerá en la barra lateral y otros lugares clave.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative h-[100px] w-full border rounded-md flex items-center justify-center bg-muted/50">
                        {localSettings.logo_url ? (
                            <Image src={localSettings.logo_url} alt="Logo Preview" layout="fill" className="object-contain p-2" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Sin logo</p>
                        )}
                    </div>
                    <div className="w-full">
                        <Button asChild variant="outline" className="w-full">
                            <label className="cursor-pointer">
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Subir Nuevo Logo
                                <input type="file" className="sr-only" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => handleFileChange(e, 'logo')} />
                            </label>
                        </Button>
                        {logoFile && (
                            <Button onClick={() => handleSave('logo')} className="w-full mt-2" disabled={isSavingLogo}>
                                {isSavingLogo ? <Loader2 className="animate-spin mr-2" /> : null}
                                Guardar Logo
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Imagen para Productos sin Foto</CardTitle>
                    <CardDescription>Esta imagen se usará cuando un producto no tenga una foto asignada.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative h-[100px] w-full border rounded-md flex items-center justify-center bg-muted/50">
                        {localSettings.default_product_image_url ? (
                            <Image src={localSettings.default_product_image_url} alt="Default Image Preview" layout="fill" className="object-contain p-2" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Sin imagen</p>
                        )}
                    </div>
                     <div className="w-full">
                        <Button asChild variant="outline" className="w-full">
                            <label className="cursor-pointer">
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Cambiar Imagen Predeterminada
                                <input type="file" className="sr-only" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'default_product_image')} />
                            </label>
                        </Button>
                         {defaultImageFile && (
                            <Button onClick={() => handleSave('default_product_image')} className="w-full mt-2" disabled={isSavingDefaultImage}>
                                {isSavingDefaultImage ? <Loader2 className="animate-spin mr-2" /> : null}
                                Guardar Imagen
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
