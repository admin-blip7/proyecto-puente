"use client";

import { useFormContext } from "react-hook-form";
import { TicketSettings } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function TicketBodySettings() {
  const { control } = useFormContext<TicketSettings>();
  const columns = [
    { id: "showQuantity", label: "Cantidad" },
    { id: "showUnitPrice", label: "Precio Unitario" },
    { id: "showTotal", label: "Importe Total" }
  ] as const;

  return (
    <AccordionItem value="body">
      <AccordionTrigger>Cuerpo del Ticket (Lista de Productos)</AccordionTrigger>
      <AccordionContent className="space-y-6">
        <div className="space-y-2">
            <FormLabel>Columnas Visibles</FormLabel>
            <FormDescription>Elige qué columnas mostrar en la lista de productos.</FormDescription>
            <div className="space-y-2 rounded-md border p-4">
                {columns.map((item) => (
                    <FormField
                    key={item.id}
                    control={control}
                    name={`body.${item.id}`}
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
            name="body.fontSize"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>Tamaño de Fuente</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex items-center space-x-4"
                    >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="xs" /></FormControl>
                        <FormLabel className="font-normal">Pequeño</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="sm" /></FormControl>
                        <FormLabel className="font-normal">Mediano</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="base" /></FormControl>
                        <FormLabel className="font-normal">Grande</FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                </FormItem>
            )}
            />
      </AccordionContent>
    </AccordionItem>
  );
}
