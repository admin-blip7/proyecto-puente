"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

interface VisualEditorProps {
  initialLayout?: VisualEditorData;
  onLayoutChange: (layout: VisualEditorData) => void;
  widthMm: number;
  heightMm: number;
  orientation?: 'horizontal' | 'vertical';
}

interface DropPayload {
  type: string;
  placeholderKey?: PlaceholderKey;
}

const MIN_DIMENSION_MM = 5;

const VisualEditor: React.FC<VisualEditorProps> = ({ initialLayout, onLayoutChange, widthMm, heightMm, orientation = 'horizontal' }) => {
  const normalizedInitial = useMemo(() => normalizeVisualEditorData(initialLayout), [initialLayout]);

  const [editorState, setEditorState] = useState<VisualEditorState>({
    elements: normalizedInitial.elements,
    selectedElementId: null,
  });
  const [showGrid, setShowGrid] = useState(true);
  
  // Calculate actual dimensions based on orientation
  const currentWidth = useMemo(() => {
    return orientation === 'vertical' ? heightMm : widthMm;
  }, [orientation, widthMm, heightMm]);
  
  const currentHeight = useMemo(() => {
    return orientation === 'vertical' ? widthMm : heightMm;
  }, [orientation, widthMm, heightMm]);

  const scale = useMemo(() => {
    // No scaling limits - show actual label dimensions in visual editor
    const widthPx = mmToPixels(Math.max(currentWidth, MIN_DIMENSION_MM));
    const heightPx = mmToPixels(Math.max(currentHeight, MIN_DIMENSION_MM));
    
    // Only limit scaling for extremely large labels to prevent viewport overflow
    const maxViewportWidth = 1200; // Much larger than before
    const maxViewportHeight = 800; // Much larger than before
    
    const computed = Math.min(1, maxViewportWidth / widthPx, maxViewportHeight / heightPx);
    return Number.isFinite(computed) && computed > 0 ? computed : 1;
  }, [currentWidth, currentHeight]);

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
            width: clamp(Math.min(currentWidth * 0.8, currentWidth - 4), MIN_DIMENSION_MM, currentWidth),
            height: clamp(Math.min(currentHeight * 0.4, 18), MIN_DIMENSION_MM, currentHeight),
            fontSize: 11,
          };
        }
        return {
          width: clamp(Math.min(currentWidth * 0.6, 38), MIN_DIMENSION_MM, currentWidth),
          height: clamp(8, MIN_DIMENSION_MM, currentHeight),
          fontSize: 11,
        };
      }

      switch (type) {
        case 'text':
          return { width: clamp(35, MIN_DIMENSION_MM, currentWidth), height: clamp(10, MIN_DIMENSION_MM, currentHeight), fontSize: 12 };
        case 'image':
          return { width: clamp(25, MIN_DIMENSION_MM, currentWidth), height: clamp(20, MIN_DIMENSION_MM, currentHeight), fontSize: 10 };
        case 'qrcode':
          return { width: clamp(25, MIN_DIMENSION_MM, currentWidth), height: clamp(25, MIN_DIMENSION_MM, currentHeight), fontSize: 10 };
        case 'barcode':
          return {
            width: clamp(Math.min(currentWidth * 0.9, currentWidth - 4), MIN_DIMENSION_MM, currentWidth),
            height: clamp(Math.min(currentHeight * 0.35, 18), MIN_DIMENSION_MM, currentHeight),
            fontSize: 10,
          };
        default:
          return { width: clamp(30, MIN_DIMENSION_MM, currentWidth), height: clamp(10, MIN_DIMENSION_MM, currentHeight), fontSize: 11 };
      }
    },
    [currentHeight, currentWidth]
  );

  const clampElementToCanvas = useCallback(
    (element: VisualElement): VisualElement => {
    const placeholder = findPlaceholder(element.placeholderKey);
    const coercedType = element.type === 'placeholder' ? 'text' : element.type;
    const defaults = getDefaultConfig(element.type, placeholder);

    const width = clamp(element.width ?? defaults.width, MIN_DIMENSION_MM, currentWidth);
    const height = element.height ?? defaults.height; // No clamp on height
      const maxX = Math.max(0, currentWidth - width);
      // No maxY constraint, allow overflow
      const x = roundTo(clamp(element.x ?? 0, 0, maxX), 2);
      const y = roundTo(element.y ?? 0, 2); // No clamp on y

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
    [findPlaceholder, getDefaultConfig, currentHeight, currentWidth]
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

  // Combine ref pattern with debouncing for maximum stability
  const onLayoutChangeRef = useRef(onLayoutChange);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLayoutRef = useRef<string>('');
  
  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange;
  }, [onLayoutChange]);
  
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const currentLayout = JSON.stringify(editorState.elements);
      
      // Only call onLayoutChange if the layout actually changed
      if (currentLayout !== lastLayoutRef.current) {
        lastLayoutRef.current = currentLayout;
        onLayoutChangeRef.current({
          elements: editorState.elements,
        });
      }
    }, 300); // Increased debounce time to reduce frequency
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editorState.elements]);



  const handleCreateElement = useCallback(
    (item: DropPayload, position: { x: number; y: number }) => {
      console.log('handleCreateElement called with:', { item, position });
      
      const placeholder = findPlaceholder(item.placeholderKey);
      const elementType: VisualElement['type'] = item.type === 'placeholder' ? 'text' : (item.type as VisualElement['type']);
      const defaults = getDefaultConfig(elementType, placeholder);

      const width = defaults.width;
      const height = defaults.height;
      const x = roundTo(clamp(position.x - width / 2, 0, Math.max(0, currentWidth - width)), 2);
      const y = roundTo(clamp(position.y - height / 2, 0, Math.max(0, currentHeight - height)), 2);

      const newElement: VisualElement = clampElementToCanvas({
        id: nanoid(),
        type: elementType,
        placeholderKey: elementType === 'barcode' ? 'barcode' : placeholder?.key,
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
        zIndex: Math.max(...editorState.elements.map(el => el.zIndex || 0), 0) + 1, // New elements on top
      });

      setEditorState((prev) => ({
        elements: [...prev.elements, newElement],
        selectedElementId: newElement.id,
      }));
    },
    [clampElementToCanvas, findPlaceholder, getDefaultConfig, currentHeight, currentWidth]
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

  const handleBringToFront = useCallback((id: string) => {
    setEditorState((prev) => {
      const maxZIndex = Math.max(...prev.elements.map(el => el.zIndex || 0), 0);
      return {
        ...prev,
        elements: prev.elements.map((element) =>
          element.id === id ? { ...element, zIndex: maxZIndex + 1 } : element
        ),
      };
    });
  }, []);

  const handleSendToBack = useCallback((id: string) => {
    setEditorState((prev) => {
      const minZIndex = Math.min(...prev.elements.map(el => el.zIndex || 0), 0);
      return {
        ...prev,
        elements: prev.elements.map((element) =>
          element.id === id ? { ...element, zIndex: minZIndex - 1 } : element
        ),
      };
    });
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
          <div className="absolute top-2 right-2 z-10 bg-background border rounded-md p-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="show-grid" className="text-sm">Cuadrícula</Label>
              <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
            </div>
          </div>
          <Canvas
            elements={editorState.elements}
            labelWidthMm={currentWidth}
            labelHeightMm={currentHeight}
            scale={scale}
            showGrid={showGrid}
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
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
          />
        </div>
      </div>
    </DndProvider>
  );
};

export default VisualEditor;
