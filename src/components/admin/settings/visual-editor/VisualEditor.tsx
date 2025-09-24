"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  LABEL_PLACEHOLDERS,
  PlaceholderDefinition,
  PlaceholderKey,
  VisualEditorState,
  VisualEditorData,
  VisualElement,
} from './types';
import ToolbarItem from './ToolbarItem';
import Canvas from './Canvas';
import { nanoid } from 'nanoid';
import PropertiesPanel from './PropertiesPanel';
import { clamp, mmToPixels, roundTo } from './utils';
import { normalizeVisualEditorData } from '@/lib/printing/visualLayoutTypes';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface VisualEditorProps {
  initialLayout?: VisualEditorData;
  onLayoutChange: (layout: VisualEditorData) => void;
  widthMm: number;
  heightMm: number;
}

interface DropPayload {
  type: string;
  placeholderKey?: PlaceholderKey;
}

const MIN_DIMENSION_MM = 5;

const VisualEditor: React.FC<VisualEditorProps> = ({ initialLayout, onLayoutChange, widthMm, heightMm }) => {
  const normalizedInitial = useMemo(() => normalizeVisualEditorData(initialLayout), [initialLayout]);

  const [editorState, setEditorState] = useState<VisualEditorState>({
    elements: normalizedInitial.elements,
    selectedElementId: null,
  });

  const scale = useMemo(() => {
    const widthPx = mmToPixels(Math.max(widthMm, MIN_DIMENSION_MM));
    const heightPx = mmToPixels(Math.max(heightMm, MIN_DIMENSION_MM));
    const maxWidthPx = 520;
    const maxHeightPx = 360;
    const computed = Math.min(1, maxWidthPx / widthPx, maxHeightPx / heightPx);
    return Number.isFinite(computed) && computed > 0 ? computed : 1;
  }, [widthMm, heightMm]);

  const findPlaceholder = useCallback(
    (placeholderKey?: PlaceholderKey): PlaceholderDefinition | undefined =>
      LABEL_PLACEHOLDERS.find((placeholder) => placeholder.key === placeholderKey),
    []
  );

  const getDefaultConfig = useCallback(
    (type: VisualElement['type'], placeholder?: PlaceholderDefinition) => {
      if (type === 'placeholder' && placeholder) {
        if (placeholder.kind === 'barcode') {
          return {
            width: clamp(Math.min(widthMm * 0.8, widthMm - 4), MIN_DIMENSION_MM, widthMm),
            height: clamp(Math.min(heightMm * 0.4, 18), MIN_DIMENSION_MM, heightMm),
            fontSize: 11,
          };
        }
        return {
          width: clamp(Math.min(widthMm * 0.6, 38), MIN_DIMENSION_MM, widthMm),
          height: clamp(8, MIN_DIMENSION_MM, heightMm),
          fontSize: 11,
        };
      }

      switch (type) {
        case 'text':
          return { width: clamp(35, MIN_DIMENSION_MM, widthMm), height: clamp(10, MIN_DIMENSION_MM, heightMm), fontSize: 12 };
        case 'image':
          return { width: clamp(25, MIN_DIMENSION_MM, widthMm), height: clamp(20, MIN_DIMENSION_MM, heightMm), fontSize: 10 };
        case 'qrcode':
          return { width: clamp(25, MIN_DIMENSION_MM, widthMm), height: clamp(25, MIN_DIMENSION_MM, heightMm), fontSize: 10 };
        case 'barcode':
          return {
            width: clamp(Math.min(widthMm * 0.9, widthMm - 4), MIN_DIMENSION_MM, widthMm),
            height: clamp(Math.min(heightMm * 0.35, 18), MIN_DIMENSION_MM, heightMm),
            fontSize: 10,
          };
        default:
          return { width: clamp(30, MIN_DIMENSION_MM, widthMm), height: clamp(10, MIN_DIMENSION_MM, heightMm), fontSize: 11 };
      }
    },
    [heightMm, widthMm]
  );

  const clampElementToCanvas = useCallback(
    (element: VisualElement): VisualElement => {
    const placeholder = findPlaceholder(element.placeholderKey);
    const coercedType = element.type === 'placeholder' ? 'text' : element.type;
    const defaults = getDefaultConfig(element.type, placeholder);

    const width = clamp(element.width ?? defaults.width, MIN_DIMENSION_MM, widthMm);
    const height = clamp(element.height ?? defaults.height, MIN_DIMENSION_MM, heightMm);
      const maxX = Math.max(0, widthMm - width);
      const maxY = Math.max(0, heightMm - height);
      const x = roundTo(clamp(element.x ?? 0, 0, maxX), 2);
      const y = roundTo(clamp(element.y ?? 0, 0, maxY), 2);

      return {
        ...element,
        type: coercedType,
        x,
        y,
        width,
        height,
        fontSize: element.fontSize ?? defaults.fontSize,
        fontFamily: element.fontFamily ?? 'Inter',
      };
    },
    [findPlaceholder, getDefaultConfig, heightMm, widthMm]
  );

  useEffect(() => {
    setEditorState((prev) => ({
      ...prev,
      elements: normalizedInitial.elements.map((element) => clampElementToCanvas(element)),
    }));
  }, [normalizedInitial, clampElementToCanvas]);

  useEffect(() => {
    setEditorState((prev) => ({
      ...prev,
      elements: prev.elements.map((element) => clampElementToCanvas(element)),
    }));
  }, [widthMm, heightMm, clampElementToCanvas]);

  useEffect(() => {
    onLayoutChange({
      elements: editorState.elements,
    });
  }, [editorState.elements, onLayoutChange]);

  const handleCreateElement = useCallback(
    (item: DropPayload, position: { x: number; y: number }) => {
      const placeholder = findPlaceholder(item.placeholderKey);
      const elementType: VisualElement['type'] = item.type === 'placeholder' ? 'text' : (item.type as VisualElement['type']);
      const defaults = getDefaultConfig(elementType, placeholder);

      const width = defaults.width;
      const height = defaults.height;
      const x = roundTo(clamp(position.x - width / 2, 0, Math.max(0, widthMm - width)), 2);
      const y = roundTo(clamp(position.y - height / 2, 0, Math.max(0, heightMm - height)), 2);

      const newElement: VisualElement = clampElementToCanvas({
        id: nanoid(),
        type: elementType,
        placeholderKey: elementType === 'barcode' ? 'sku' : placeholder?.key,
        content:
          elementType === 'text'
            ? placeholder?.token ?? 'Nuevo Texto'
            : elementType === 'barcode'
              ? 'Código de Barras'
            : elementType === 'image'
              ? 'Imagen'
              : elementType === 'qrcode'
                ? 'Código QR'
              : 'Componente',
        width,
        height,
        x,
        y,
        fontSize: defaults.fontSize,
        fontFamily: 'Inter',
        showValue: elementType === 'barcode' ? true : undefined,
        barcodeFormat: elementType === 'barcode' ? 'code128' : undefined,
        qrPlaceholderKey: elementType === 'qrcode' ? placeholder?.key ?? 'sku' : undefined,
      });

      setEditorState((prev) => ({
        elements: [...prev.elements, newElement],
        selectedElementId: newElement.id,
      }));
    },
    [clampElementToCanvas, findPlaceholder, getDefaultConfig, heightMm, widthMm]
  );

  const moveElement = useCallback(
    (id: string, x: number, y: number) => {
      setEditorState((prev) => ({
        ...prev,
        elements: prev.elements.map((element) =>
          element.id === id ? clampElementToCanvas({ ...element, x, y }) : element
        ),
      }));
    },
    [clampElementToCanvas]
  );

  const handleSelectElement = useCallback((id: string | null) => {
    setEditorState((prev) => ({ ...prev, selectedElementId: id }));
  }, []);

  const handleUpdateElement = useCallback(
    (id: string, newProps: Partial<VisualElement>) => {
      setEditorState((prev) => ({
        ...prev,
        elements: prev.elements.map((element) =>
          element.id === id ? clampElementToCanvas({ ...element, ...newProps }) : element
        ),
      }));
    },
    [clampElementToCanvas]
  );

  const handleDeleteElement = useCallback((id: string) => {
    setEditorState((prev) => ({
      ...prev,
      elements: prev.elements.filter((element) => element.id !== id),
      selectedElementId: prev.selectedElementId === id ? null : prev.selectedElementId,
    }));
  }, []);

  const selectedElement = editorState.elements.find((el) => el.id === editorState.selectedElementId) ?? null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[70vh] border rounded-md bg-background">
        <div className="w-72 shrink-0 p-4 border-r space-y-6 overflow-y-auto">
          <div>
            <h3 className="font-semibold mb-3">Componentes</h3>
            <div className="space-y-2">
              <ToolbarItem type="text">Texto</ToolbarItem>
              <ToolbarItem type="image">Imagen</ToolbarItem>
              <ToolbarItem type="qrcode">Código QR</ToolbarItem>
              <ToolbarItem type="barcode">Código de Barras</ToolbarItem>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Añadir Campos Dinámicos</h3>
            <div className="flex flex-wrap gap-2">
              {LABEL_PLACEHOLDERS.map((placeholder) => (
                <ToolbarItem
                  key={placeholder.key}
                  type="placeholder"
                  item={{ placeholderKey: placeholder.key }}
                  className="px-3 py-1 text-xs rounded-full border-primary/40 bg-primary/10 text-primary font-medium"
                >
                  {placeholder.token}
                </ToolbarItem>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 relative p-4">
          <Canvas
            elements={editorState.elements}
            labelWidthMm={widthMm}
            labelHeightMm={heightMm}
            scale={scale}
            onCreateElement={handleCreateElement}
            moveElement={moveElement}
            onSelectElement={handleSelectElement}
            selectedElementId={editorState.selectedElementId}
          />
        </div>

        <div className="w-80 shrink-0 p-4 border-l overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Propiedades</h3>
            {selectedElement && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteElement(selectedElement.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <PropertiesPanel
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
          />
        </div>
      </div>
    </DndProvider>
  );
};

export default VisualEditor;
