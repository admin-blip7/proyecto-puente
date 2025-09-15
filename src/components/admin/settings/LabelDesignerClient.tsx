"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LabelSettings, LabelSettingsSchema } from "@/types";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Accordion } from "@/components/ui/accordion";
import { saveLabelSettings } from "@/lib/services/settingsService";
import { Save, Loader2 } from "lucide-react";
import LabelLayoutSettings from "./LabelLayoutSettings";
import LabelContentSettings from "./LabelContentSettings";
import LabelPreview from "./LabelPreview";


interface LabelDesignerClientProps {
  initialSettings: LabelSettings;
}

export default function LabelDesignerClient({ initialSettings }: LabelDesignerClientProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LabelSettings>({
    resolver: zodResolver(LabelSettingsSchema),
    defaultValues: initialSettings,
  });

  const watchedSettings = form.watch();

  const onSubmit = async (values: LabelSettings) => {
    setLoading(true);
    try {
        await saveLabelSettings(values);
        toast({
            title: "Diseño Guardado",
            description: "La configuración de tus etiquetas ha sido guardada."
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
            <h1 className="text-2xl font-bold tracking-tight">Diseñador de Etiquetas</h1>
            <p className="text-muted-foreground">Personaliza el diseño de las etiquetas para tus productos.</p>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={loading || !form.formState.isDirty}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Diseño
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="font-semibold text-lg mb-2">Opciones de Personalización</h3>
          <Form {...form}>
            <form>
                <Accordion type="multiple" defaultValue={["layout", "content"]} className="w-full">
                    <LabelLayoutSettings />
                    <LabelContentSettings />
                </Accordion>
            </form>
          </Form>
        </div>
        <div className="lg:col-span-2">
           <h3 className="font-semibold text-lg mb-2">Vista Previa en Vivo</h3>
           <div className="bg-muted p-4 rounded-lg flex justify-center">
             <LabelPreview settings={watchedSettings} />
           </div>
        </div>
      </div>
    </>
  );
}
