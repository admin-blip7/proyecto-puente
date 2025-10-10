"use client";

import { useFormContext, Controller } from "react-hook-form";
import { TicketSettings } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Upload } from "lucide-react";
import { useState } from "react";

export default function TicketHeaderSettings() {
  const { control, watch, setValue } = useFormContext<TicketSettings>();
  const [logoPreview, setLogoPreview] = useState(watch("header.logoUrl"));

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setValue("header.logoUrl", base64String, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const businessInfoFields = [
    { name: "storeName", label: "Nombre del Negocio" },
    { name: "address", label: "Dirección" },
    { name: "phone", label: "Teléfono / WhatsApp" },
    { name: "rfc", label: "RFC" },
    { name: "website", label: "Sitio Web / Red Social" },
  ] as const;

  return (
    <AccordionItem value="header">
      <AccordionTrigger>Encabezado</AccordionTrigger>
      <AccordionContent className="space-y-6">
        <div className="space-y-4 rounded-md border p-4">
            <FormField
                control={control}
                name="header.showLogo"
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
            {logoPreview && watch('header.showLogo') && (
                <div className="flex justify-center">
                    <Image src={logoPreview} alt="Logo Preview" width={80} height={80} className="object-contain" />
                </div>
            )}
            <div className="relative">
                <Button asChild variant="outline" className="w-full">
                    <label htmlFor="logo-upload" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Logo
                    </label>
                </Button>
                <input id="logo-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={handleImageUpload} />
            </div>
        </div>

        {businessInfoFields.map((info) => (
            <div key={info.name} className="space-y-2 rounded-md border p-4">
                 <FormField
                    control={control}
                    name={`header.show.${info.name}`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                        <FormLabel>{info.label}</FormLabel>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={control}
                    name={`header.${info.name}`}
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <Input placeholder={`Escribe el ${info.label.toLowerCase()}...`} {...field} />
                        </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        ))}

      </AccordionContent>
    </AccordionItem>
  );
}
