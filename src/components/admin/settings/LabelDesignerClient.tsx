"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LabelSettings, LabelSettingsSchema } from "@/types";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Accordion } from "@/components/ui/accordion";
import { saveLabelSettings } from "@/lib/services/settingsService";
import { Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import VisualEditor from "./visual-editor/VisualEditor";
import LabelLayoutSettings from "./LabelLayoutSettings";
import LabelContentSettings from "./LabelContentSettings";
import LabelPreview from "./LabelPreview";
import { normalizeVisualEditorData, VisualEditorData } from "@/lib/printing/visualLayoutTypes";
import { storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { nanoid } from "nanoid";

const mimeToExtension = (mime: string) => {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
};

interface LabelDesignerClientProps {
  initialSettings: LabelSettings;
}

type EditorMode = "simple" | "visual";

export default function LabelDesignerClient({ initialSettings }: LabelDesignerClientProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<EditorMode>("simple");
  const { toast } = useToast();

  const form = useForm<LabelSettings>({
    resolver: zodResolver(LabelSettingsSchema),
    defaultValues: initialSettings,
  });

  const handleLayoutChange = useCallback((layout: VisualEditorData) => {
      form.setValue("visualLayout", JSON.stringify(layout), { shouldDirty: true });
  }, [form]);

  const watchedSettings = form.watch();

  const uploadDataUrlIfNeeded = useCallback(async (dataUrl?: string | null) => {
    if (!dataUrl) return undefined;
    if (!dataUrl.startsWith('data:')) return dataUrl;
    try {
      const mimeMatch = dataUrl.match(/^data:(.*?);/);
      const extension = mimeMatch ? mimeToExtension(mimeMatch[1]) : 'png';
      const assetRef = ref(storage, `label-assets/${nanoid()}.${extension}`);
      await uploadString(assetRef, dataUrl, 'data_url');
      return await getDownloadURL(assetRef);
    } catch (error) {
      console.error('Failed to upload label asset', error);
      return undefined;
    }
  }, []);

  const prepareVisualLayoutForSave = useCallback(async (layoutString?: string | null) => {
    if (!layoutString) return layoutString;
    try {
      const parsed = JSON.parse(layoutString);
      const layoutData = normalizeVisualEditorData(parsed);
      let mutated = false;

      const processedElements = await Promise.all(
        layoutData.elements.map(async (element) => {
          if (element.type !== 'image') {
            return element;
          }

          const imageUrl = (element.imageUrl as string | undefined) || (typeof element.content === 'string' ? element.content : undefined);
          const uploadedUrl = await uploadDataUrlIfNeeded(imageUrl);
          if (uploadedUrl && uploadedUrl !== imageUrl) {
            mutated = true;
            return {
              ...element,
              imageUrl: uploadedUrl,
              content: undefined,
            };
          }
          if (imageUrl && imageUrl.startsWith('data:')) {
            mutated = true;
            return {
              ...element,
              imageUrl: undefined,
              content: undefined,
            };
          }
          return element;
        })
      );

      if (!mutated) {
        return JSON.stringify(layoutData);
      }

      return JSON.stringify({
        ...layoutData,
        elements: processedElements,
      });
    } catch (error) {
      console.error('Failed to process visual layout before saving', error);
      return layoutString;
    }
  }, [uploadDataUrlIfNeeded]);

  const onSubmit = async (values: LabelSettings) => {
    setLoading(true);
    try {
        const processedLayout = await prepareVisualLayoutForSave(values.visualLayout);
        const payload: LabelSettings = {
            ...values,
            visualLayout: processedLayout,
        };
        const layoutSize = payload.visualLayout ? payload.visualLayout.length : 0;
        if (layoutSize > 1000000) {
            toast({
                variant: "destructive",
                title: "Diseño demasiado grande",
                description: "Reduce el tamaño de las imágenes o elimina elementos para poder guardar el diseño.",
            });
            return;
        }
        await saveLabelSettings(payload);
        form.reset(payload);
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

  const parsedLayout = useMemo(() => {
    const sourceLayout = watchedSettings.visualLayout ?? initialSettings.visualLayout;
    if (!sourceLayout) return undefined;
    try {
        const parsed = JSON.parse(sourceLayout);
        return normalizeVisualEditorData(parsed);
    } catch (error) {
        console.error("Invalid visual layout JSON", error);
        return undefined;
    }
  }, [watchedSettings.visualLayout, initialSettings.visualLayout]);

  const visualEditorKey = useMemo(() => {
    const layout = watchedSettings.visualLayout ?? initialSettings.visualLayout ?? '';
    if (!layout) return 'empty-layout';
    const head = layout.slice(0, 32);
    return `${layout.length}-${head}`;
  }, [watchedSettings.visualLayout, initialSettings.visualLayout]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Diseñador de Etiquetas</h1>
            <p className="text-muted-foreground">Personaliza el diseño de las etiquetas para tus productos.</p>
        </div>
        <div className="flex items-center space-x-2">
            <Label htmlFor="visual-mode-label">Modo Visual</Label>
            <Switch id="visual-mode-label" onCheckedChange={(checked) => setMode(checked ? "visual" : "simple")} />
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
                  <Accordion type="multiple" defaultValue={['layout', 'content']} className="w-full">
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
      ) : (
        <VisualEditor 
            key={visualEditorKey}
            initialLayout={parsedLayout}
            onLayoutChange={handleLayoutChange}
            widthMm={watchedSettings.width}
            heightMm={watchedSettings.height}
        />
      )}
    </>
  );
}
