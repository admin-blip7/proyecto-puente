"use client";

import { useFormContext } from "react-hook-form";
import { TicketSettings } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function TicketLayoutSettings() {
  const form = useFormContext<TicketSettings>();

  return (
    <AccordionItem value="layout">
      <AccordionTrigger>Diseño del Ticket</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="paperWidth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ancho del Papel</FormLabel>
                <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value ?? 80)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el ancho..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="58">58 mm</SelectItem>
                    <SelectItem value="80">80 mm</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <FormLabel>Estilos de Fuente</FormLabel>
            <FormField
              control={form.control}
              name="fontStyle.bold"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Negrita</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fontStyle.italic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Cursiva</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
