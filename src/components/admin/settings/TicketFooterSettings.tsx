"use client";

import { useFormContext } from "react-hook-form";
import { TicketSettings } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function TicketFooterSettings() {
  const { control, watch } = useFormContext<TicketSettings>();
  const totals = [
    { id: "showSubtotal", label: "Subtotal" },
    { id: "showTaxes", label: "Impuestos (IVA)" },
    { id: "showDiscounts", label: "Descuentos" },
  ] as const;

  return (
    <AccordionItem value="footer">
      <AccordionTrigger>Pie de Página</AccordionTrigger>
      <AccordionContent className="space-y-6">
        <div className="space-y-2">
            <FormLabel>Totales</FormLabel>
            <FormDescription>Elige qué totales mostrar al final del ticket.</FormDescription>
            <div className="space-y-2 rounded-md border p-4">
                {totals.map((item) => (
                    <FormField
                    key={item.id}
                    control={control}
                    name={`footer.${item.id}`}
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
            name="footer.thankYouMessage"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Mensaje de Agradecimiento</FormLabel>
                    <FormControl>
                        <Textarea placeholder="¡Gracias por tu compra!" {...field} />
                    </FormControl>
                </FormItem>
            )}
        />
        <FormField
            control={control}
            name="footer.additionalInfo"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Información Adicional (Políticas, etc.)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Políticas de devolución, horarios..." {...field} />
                    </FormControl>
                </FormItem>
            )}
        />
        <div className="space-y-4 rounded-md border p-4">
            <FormField
                control={control}
                name="footer.showQrCode"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                        <FormLabel>Código QR Dinámico</FormLabel>
                        <FormDescription>Muestra un QR a partir de una URL.</FormDescription>
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
            {watch('footer.showQrCode') && (
             <FormField
                control={control}
                name="footer.qrCodeUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>URL para el Código QR</FormLabel>
                        <FormControl>
                            <Input placeholder="https://tu-sitio-web.com" {...field} />
                        </FormControl>
                    </FormItem>
                )}
            />
            )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
