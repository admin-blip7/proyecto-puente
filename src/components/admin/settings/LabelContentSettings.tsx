"use client";

import { useFormContext } from "react-hook-form";
import { LabelSettings } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Upload } from "lucide-react";
import { useState } from "react";

export default function LabelContentSettings() {
  const { control, watch, setValue } = useFormContext<LabelSettings>();
  const [logoPreview, setLogoPreview] = useState(watch("logoUrl"));

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setValue("logoUrl", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const contentFields = [
    { id: "showProductName", label: "Nombre del Producto" },
    { id: "showSku", label: "SKU (texto)" },
    { id: "showPrice", label: "Precio de Venta" },
    { id: "showStoreName", label: "Nombre de la Tienda" },
  ] as const;

  return (
    <AccordionItem value="content">
      <AccordionTrigger>Contenido de la Etiqueta</AccordionTrigger>
      <AccordionContent className="space-y-6">
        <div className="space-y-4 rounded-md border p-4">
            <FormField
                control={control}
                name="includeLogo"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                            <FormLabel>Logo del Negocio</FormLabel>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                )}
            />
            {logoPreview && (
                <div className="flex justify-center">
                    <Image src={logoPreview} alt="Logo Preview" width={40} height={40} className="object-contain" />
                </div>
            )}
             <FormField
                control={control}
                name="logoUrl"
                render={({ field }) => (
                     <FormItem>
                        <FormControl>
                            <div className="relative">
                                <Button asChild variant="outline" className="w-full">
                                    <label htmlFor="label-logo-upload" className="cursor-pointer">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Subir Logo
                                    </label>
                                </Button>
                                <Input 
                                    id="label-logo-upload" 
                                    type="file" 
                                    className="sr-only" 
                                    accept="image/png, image/jpeg" 
                                    onChange={handleImageUpload} 
                                />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
             />
        </div>

        <div className="space-y-2">
            <FormLabel>Campos Visibles</FormLabel>
            <FormDescription>Elige qué información mostrar en la etiqueta.</FormDescription>
            <div className="space-y-2 rounded-md border p-4">
                {contentFields.map((item) => (
                    <FormField
                    key={item.id}
                    control={control}
                    name={`content.${item.id}`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>{item.label}</FormLabel>
                        </div>
                        </FormItem>
                    )}
                    />
                ))}
            </div>
        </div>

        <FormField
            control={control}
            name="storeName"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Nombre de la Tienda (si está visible)</FormLabel>
                    <FormControl>
                        <Input placeholder="Escribe el nombre de tu tienda..." {...field} />
                    </FormControl>
                </FormItem>
            )}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
