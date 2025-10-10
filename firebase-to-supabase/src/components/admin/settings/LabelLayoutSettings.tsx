"use client";

import { useFormContext } from "react-hook-form";
import { LabelSettings } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export default function LabelLayoutSettings() {
  const { control, watch } = useFormContext<LabelSettings>();

  return (
    <AccordionItem value="layout">
      <AccordionTrigger>Dimensiones y Diseño</AccordionTrigger>
      <AccordionContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={control}
                name="width"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ancho Etiqueta (mm)</FormLabel>
                        <Input type="number" {...field} />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name="height"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Alto Etiqueta (mm)</FormLabel>
                        <Input type="number" {...field} />
                    </FormItem>
                )}
            />
        </div>
         <FormField
            control={control}
            name="fontSize"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Tamaño de Fuente (px)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="8">Muy Pequeño (8px)</SelectItem>
                            <SelectItem value="9">Pequeño (9px)</SelectItem>
                            <SelectItem value="10">Normal (10px)</SelectItem>
                            <SelectItem value="12">Grande (12px)</SelectItem>
                             <SelectItem value="14">Muy Grande (14px)</SelectItem>
                        </SelectContent>
                    </Select>
                </FormItem>
            )}
        />
        <FormField
            control={control}
            name="barcodeHeight"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Altura Cód. Barras ({field.value}px)</FormLabel>
                    <Slider
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={15}
                        max={50}
                        step={1}
                    />
                </FormItem>
            )}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
