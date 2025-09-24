"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContractTemplateSettings, ContractTemplateSchema } from "@/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { saveContractTemplate } from "@/lib/services/settingsService";
import { Save, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import VisualEditor from "./visual-editor/VisualEditor";

interface ContractTemplateClientProps {
  initialSettings: ContractTemplateSettings;
}

type EditorMode = "simple" | "visual";

const placeholders = [
    { key: "{{CLIENT_NAME}}", description: "Nombre completo del cliente." },
    { key: "{{CLIENT_ADDRESS}}", description: "Dirección completa del cliente." },
    { key: "{{CLIENT_PHONE}}", description: "Teléfono del cliente." },
    { key: "{{CREDIT_LIMIT}}", description: "Límite de crédito otorgado (ej. '$5,000.00 MXN')." },
    { key: "{{INTEREST_RATE}}", description: "Tasa de interés anual (ej. '25%')." },
    { key: "{{PAYMENT_DUE_DAY}}", description: "Día del mes para el pago (ej. '15')." },
    { key: "{{STORE_NAME}}", description: "Nombre de tu tienda." },
    { key: "{{STORE_ADDRESS}}", description: "Dirección de tu tienda." },
    { key: "{{STORE_CITY}}", description: "Ciudad donde se firma el contrato." },
    { key: "{{CURRENT_DATE}}", description: "Fecha actual en formato largo (ej. '1 de Enero de 2024')." },
];


export default function ContractTemplateClient({ initialSettings }: ContractTemplateClientProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<EditorMode>("simple");
  const { toast } = useToast();

  const form = useForm<ContractTemplateSettings>({
    resolver: zodResolver(ContractTemplateSchema),
    defaultValues: initialSettings,
  });

  const handleLayoutChange = useCallback((layout: any) => {
    form.setValue("visualLayout", JSON.stringify(layout));
  }, [form]);

  const onSubmit = async (values: ContractTemplateSettings) => {
    setLoading(true);
    try {
        await saveContractTemplate(values);
        toast({
            title: "Plantilla Guardada",
            description: "La plantilla de contrato ha sido actualizada."
        });
        form.reset(values); // Re-sincroniza el estado del form para isDirty
    } catch (error) {
        console.error("Error saving contract template:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo guardar la plantilla."
        })
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Editor de Plantilla de Contrato</h1>
            <p className="text-muted-foreground">Define el texto base para los contratos de crédito. Usa los placeholders para insertar datos dinámicos.</p>
        </div>
        <div className="flex items-center space-x-2">
            <Label htmlFor="visual-mode-contract">Modo Visual</Label>
            <Switch id="visual-mode-contract" onCheckedChange={(checked) => setMode(checked ? "visual" : "simple")} />
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={loading || !form.formState.isDirty}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Plantilla
        </Button>
      </div>

      {mode === "simple" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Form {...form}>
                    <form>
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Contenido del Contrato</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            className="min-h-[60vh] font-mono text-sm" 
                                            placeholder="Escribe aquí tu contrato..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </div>
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary"/>
                            <CardTitle>Placeholders Disponibles</CardTitle>
                        </div>
                        <CardDescription>Copia y pega estas etiquetas en tu plantilla. Serán reemplazadas automáticamente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {placeholders.map(p => (
                            <div key={p.key}>
                                <code className="font-semibold bg-muted p-1 rounded-sm text-primary">{p.key}</code>
                                <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
       </div>
      ) : (
        <VisualEditor 
            initialLayout={initialSettings.visualLayout ? JSON.parse(initialSettings.visualLayout) : undefined}
            onLayoutChange={handleLayoutChange}
        />
      )}
    </>
  );
}
