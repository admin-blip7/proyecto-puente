"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LabelSettings, LabelSettingsSchema, LabelType, labelTypes, LabelOrientation, labelOrientations } from "@/types";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Accordion } from "@/components/ui/accordion";
import { getLabelSettings, saveLabelSettings } from "@/lib/services/settingsService";
import { Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VisualEditor from "./visual-editor/VisualEditor";
import LabelLayoutSettings from "./LabelLayoutSettings";
import LabelContentSettings from "./LabelContentSettings";
import LabelPreview from "./LabelPreview";
import PrintPreview from "./PrintPreview";
import { normalizeVisualEditorData, VisualEditorData } from "@/lib/printing/visualLayoutTypes";
import { supabase } from "@/lib/supabaseClient";
import { nanoid } from "nanoid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [selectedLabelType, setSelectedLabelType] = useState<LabelType>(
    (initialSettings.labelType as LabelType) || "product"
  );
  const [existingLabels, setExistingLabels] = useState<Array<{ id: string, name: string, type: LabelType }>>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const { toast } = useToast();



  const form = useForm<LabelSettings>({
    resolver: zodResolver(LabelSettingsSchema),
    defaultValues: {
      ...initialSettings,
      labelType: selectedLabelType,
    },
  });

  // Load existing labels from system
  useEffect(() => {
    const loadExistingLabels = async () => {
      try {
        const response = await fetch('/api/settings/labels/list');
        if (response.ok) {
          const data = await response.json();
          setExistingLabels(data.labels);
        } else {
          setExistingLabels([]);
        }
      } catch (error) {
        console.error('Error loading existing labels:', error);
        setExistingLabels([]);
      }
    };

    loadExistingLabels();
  }, []);

  // Load settings when label type changes
  useEffect(() => {
    const loadSettingsForLabelType = async () => {
      try {
        const settings = await getLabelSettings(selectedLabelType);
        form.reset(settings);
        setSelectedLabelId(null); // Reset selected label when changing type
      } catch (error) {
        console.error('Error loading label settings:', error);
      }
    };

    loadSettingsForLabelType();
  }, [selectedLabelType, form]);

  const handleLayoutChange = useCallback((layout: VisualEditorData) => {
    const newValue = JSON.stringify(layout);
    const currentValue = form.getValues("visualLayout");

    // Only update if the value actually changed to prevent unnecessary re-renders
    if (newValue !== currentValue) {
      // Use a timeout to batch updates and prevent rapid successive calls
      setTimeout(() => {
        form.setValue("visualLayout", newValue, { shouldDirty: true });
      }, 0);
    }
  }, [form]);

  const handleLabelTypeChange = useCallback(async (newLabelType: LabelType) => {
    setSelectedLabelType(newLabelType);
    setSelectedLabelId(null); // Reset specific label selection
    if (newLabelType === 'repair') {
      setMode('simple');
    }

    try {
      // Load the settings for the selected label type
      const settings = await getLabelSettings(newLabelType);
      form.reset(settings);
    } catch (error) {
      console.error('Error loading label settings for type:', newLabelType, error);
      // If there's an error, create default settings for this type
      const defaultSettings = {
        labelType: newLabelType,
        width: 51,
        height: 102,
        orientation: 'vertical' as const,
        fontSize: 9,
        barcodeHeight: 30,
        includeLogo: false,
        logoUrl: "",
        storeName: "Nombre de tu Tienda",
        content: {
          showProductName: true,
          showSku: true,
          showPrice: true,
          showStoreName: false,
        },
        visualLayout: null,
      };
      form.reset(defaultSettings);
    }
  }, [form]);

  const handleSpecificLabelSelect = useCallback(async (labelId: string) => {
    setSelectedLabelId(labelId);
    const selectedLabel = existingLabels.find(label => label.id === labelId);

    if (selectedLabel) {
      setSelectedLabelType(selectedLabel.type);

      try {
        const settings = await getLabelSettings(selectedLabel.type);
        form.reset(settings);
      } catch (error) {
        console.error('Error loading specific label settings:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la configuración de la etiqueta."
        });
      }
    }
  }, [existingLabels, form, toast]);

  const watchedSettings = form.watch();



  const uploadDataUrlIfNeeded = useCallback(async (dataUrl?: string | null) => {
    if (!dataUrl) return undefined;
    if (!dataUrl.startsWith('data:')) return dataUrl;
    try {
      const mimeMatch = dataUrl.match(/^data:(.*?);/);
      const extension = mimeMatch ? mimeToExtension(mimeMatch[1]) : 'png';
      if (!supabase) {
        throw new Error("Supabase client is not configured");
      }

      const [, base64Data] = dataUrl.split(",");
      if (!base64Data) {
        throw new Error("Invalid data URL");
      }

      const binaryString = atob(base64Data);
      const binary = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binary[i] = binaryString.charCodeAt(i);
      }
      const filePath = `${nanoid()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("label-assets")
        .upload(filePath, binary, {
          contentType: mimeMatch?.[1] || "image/png",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("label-assets").getPublicUrl(filePath);
      return data.publicUrl;
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
        visualLayout: processedLayout ?? undefined,
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

    if (!sourceLayout) {
      return undefined;
    }

    try {
      const parsed = typeof sourceLayout === 'string'
        ? JSON.parse(sourceLayout)
        : sourceLayout;

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
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedLabelId
              ? `Editando: ${existingLabels.find(l => l.id === selectedLabelId)?.name || 'Etiqueta'}`
              : 'Diseñador de Etiquetas'
            }
          </h1>
          <p className="text-muted-foreground">
            {selectedLabelId
              ? 'Modifica el diseño de esta etiqueta existente y guarda los cambios.'
              : 'Selecciona una etiqueta existente o crea una nueva para productos y reparaciones.'
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="existing-labels">Etiquetas del Sistema</Label>
            <Select value={selectedLabelId || "new"} onValueChange={(value) => value === "new" ? handleLabelTypeChange("product") : handleSpecificLabelSelect(value)}>
              <SelectTrigger id="existing-labels" className="w-64">
                <SelectValue placeholder="Selecciona una etiqueta existente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Crear Nueva Etiqueta</SelectItem>
                {existingLabels.map((label) => (
                  <SelectItem key={label.id} value={label.id}>
                    {label.name} ({label.type === 'product' ? 'Producto' : 'Reparación'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedLabelId && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="label-type">Tipo de Nueva Etiqueta</Label>
              <Select value={selectedLabelType} onValueChange={handleLabelTypeChange}>
                <SelectTrigger id="label-type" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Productos</SelectItem>
                  <SelectItem value="repair">Reparaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Label htmlFor="label-orientation">Orientación</Label>
            <Select
              value={form.watch("orientation") || "horizontal"}
              onValueChange={(value: LabelOrientation) => {
                form.setValue("orientation", value, { shouldDirty: true });
              }}
            >
              <SelectTrigger id="label-orientation" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedLabelType === 'product' && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="visual-mode-label">Modo Visual</Label>
              <Switch
                id="visual-mode-label"
                checked={mode === "visual"}
                onCheckedChange={(checked) => setMode(checked ? "visual" : "simple")}
              />
            </div>
          )}
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={loading || !form.formState.isDirty}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Diseño
        </Button>
      </div>

      <Tabs defaultValue="design" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="design">Diseño</TabsTrigger>
          <TabsTrigger value="preview">Previsualización PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-4">
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
                  <LabelPreview settings={watchedSettings} labelType={selectedLabelType} />
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
              orientation={watchedSettings.orientation || 'horizontal'}
            />
          )}
        </TabsContent>

        <TabsContent value="preview">
          <PrintPreview settings={watchedSettings} />
        </TabsContent>
      </Tabs>
    </>
  );
}
