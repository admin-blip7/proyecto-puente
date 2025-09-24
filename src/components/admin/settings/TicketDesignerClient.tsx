"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TicketSettings, TicketSettingsSchema } from "@/types";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Accordion } from "@/components/ui/accordion";
import { saveTicketSettings } from "@/lib/services/settingsService";
import TicketHeaderSettings from "./TicketHeaderSettings";
import TicketBodySettings from "./TicketBodySettings";
import TicketFooterSettings from "./TicketFooterSettings";
import TicketPreview from "./TicketPreview";
import VisualEditor from "./visual-editor/VisualEditor";
import { VisualElement } from "./visual-editor/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";

interface TicketDesignerClientProps {
  initialSettings: TicketSettings;
}

type EditorMode = "simple" | "visual";

export default function TicketDesignerClient({ initialSettings }: TicketDesignerClientProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<EditorMode>("simple");
  const { toast } = useToast();

  const form = useForm<TicketSettings>({
    resolver: zodResolver(TicketSettingsSchema),
    defaultValues: initialSettings,
  });

  const handleLayoutChange = useCallback((layout: any) => {
    form.setValue("visualLayout", JSON.stringify(layout));
  }, [form]);

  const watchedSettings = form.watch();

  const initialLayout = initialSettings.visualLayout
    ? JSON.parse(initialSettings.visualLayout)
    : [];

  const onSubmit = async (values: TicketSettings) => {
    setLoading(true);
    try {
        await saveTicketSettings(values);
        toast({
            title: "Diseño Guardado",
            description: "La configuración de tu ticket ha sido guardada exitosamente."
        })
    } catch (error) {
        console.error("Error saving settings:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo guardar la configuración."
        })
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Diseñador de Tickets</h1>
            <p className="text-muted-foreground\">Personaliza el contenido y la apariencia de tus tickets de venta.</p>
        </div>
        <div className="flex items-center space-x-2">
            <Label htmlFor="visual-mode">Modo Visual</Label>
            <Switch id="visual-mode" onCheckedChange={(checked: boolean) => setMode(checked ? "visual" : "simple")} />
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={loading || !form.formState.isDirty}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Diseño
        </Button>
      </div>

      {mode === "simple" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h3 className="font-semibold text-lg mb-2">Opciones de Personalización</h3>
            <Form {...form}>
              <form>
                  <Accordion type="multiple" defaultValue={["header", "body", "footer"]} className="w-full">
                      <TicketHeaderSettings />
                      <TicketBodySettings />
                      <TicketFooterSettings />
                  </Accordion>
              </form>
            </Form>
          </div>
          <div className="lg:col-span-2">
             <h3 className="font-semibold text-lg mb-2">Vista Previa en Vivo</h3>
             <div className="bg-muted p-4 rounded-lg flex justify-center">
               <TicketPreview settings={watchedSettings} />
             </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold">Editor Visual Próximamente</h2>
          <p>Aquí es donde irá el editor de arrastrar y soltar para tickets.</p>
        </div>
      )}

      {mode === 'visual' && <VisualEditor initialLayout={initialLayout} onLayoutChange={handleLayoutChange} />}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Vista Previa del Ticket</h2>
      </div>
    </>
  );
}
