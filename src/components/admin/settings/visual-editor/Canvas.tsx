"use client";

import React, { useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { PlaceholderKey, VisualElement } from './types';
import CanvasElement from './CanvasElement';
import { mmToPixels, pixelsToMm } from './utils';

interface CanvasDropItem {
  id?: string;
  type: string;
  placeholderKey?: PlaceholderKey;
}

interface CanvasProps {
  elements: VisualElement[];
  labelWidthMm: number;
  labelHeightMm: number;
  scale: number;
  showGrid?: boolean;
  onCreateElement: (item: CanvasDropItem, position: { x: number; y: number }) => void;
  moveElement: (id: string, x: number, y: number) => void;
  onSelectElement: (id: string | null) => void;
  selectedElementId: string | null;
  backgroundImageUrl?: string;
  backgroundColor?: string;
}

const Canvas: React.FC<CanvasProps> = ({
  elements,
  labelWidthMm,
  labelHeightMm,
  scale,
  showGrid = false,
  onCreateElement,
  moveElement,
  onSelectElement,
  selectedElementId,
  backgroundImageUrl,
  backgroundColor,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const pxPerMm = useMemo(() => mmToPixels(1, scale), [scale]);
  const widthPx = useMemo(() => mmToPixels(labelWidthMm, scale), [labelWidthMm, scale]);
  const heightPx = useMemo(() => mmToPixels(labelHeightMm, scale), [labelHeightMm, scale]);

  // Debug background image
  React.useEffect(() => {
    if (backgroundImageUrl?.trim()) {
      console.log('Canvas rendering with backgroundImageUrl:', backgroundImageUrl);
    }
  }, [backgroundImageUrl]);
  
  // Generate grid pattern
  const gridPattern = useMemo(() => {
    if (!showGrid) return undefined;
    const gridSize = 5; // 5mm grid
    const gridPx = mmToPixels(gridSize, scale);
    
    return {
      backgroundImage: `
        linear-gradient(to right, #e5e7eb 1px, transparent 1px),
        linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
      `,
      backgroundSize: `${gridPx}px ${gridPx}px`,
    };
  }, [showGrid, scale]);

  const [{ isOver }, drop] = useDrop<CanvasDropItem, void, { isOver: boolean }>(() => ({
    accept: ['text', 'image', 'qrcode', 'barcode', 'placeholder', 'canvas-element'],
    drop: (item, monitor) => {
      console.log('Canvas drop received item:', item);
      
      if (item.id) {
        const delta = monitor.getDifferenceFromInitialOffset();
        if (!delta) return;
        const element = elements.find((el) => el.id === item.id);
        if (!element) return;
        const nextX = element.x + pixelsToMm(delta.x, scale);
        const nextY = element.y + pixelsToMm(delta.y, scale);
        moveElement(item.id, nextX, nextY);
        return;
      }

      const clientOffset = monitor.getClientOffset();
      const bounds = ref.current?.getBoundingClientRect();
      if (!clientOffset || !bounds) return;

      const positionPx = {
        x: clientOffset.x - bounds.left,
        y: clientOffset.y - bounds.top,
      };

      const positionMm = {
        x: pixelsToMm(positionPx.x, scale),
        y: pixelsToMm(positionPx.y, scale),
      };
      
      console.log('Creating element at position:', positionMm);
      onCreateElement(item, positionMm);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }), [elements, moveElement, onCreateElement, scale]);

  drop(ref);

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#6b7280' }}>
      {/* Contenedor con padding para simular el espacio alrededor de la etiqueta */}
      <div className="relative" style={{ padding: '40px' }}>
        {/* Indicadores de medidas */}
        <div className="absolute -top-6 left-0 right-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white bg-slate-700 px-3 py-1 rounded-md shadow-md">
            {labelWidthMm} mm
          </span>
        </div>
        <div className="absolute -left-6 top-0 bottom-0 flex items-center justify-center" style={{ writingMode: 'vertical-rl' }}>
          <span className="text-xs font-semibold text-white bg-slate-700 px-3 py-1 rounded-md shadow-md">
            {labelHeightMm} mm
          </span>
        </div>
        
        {/* Área de la etiqueta */}
        <div
          ref={ref}
          className="relative"
          style={{
            width: widthPx,
            height: heightPx,
            border: isOver ? '3px solid #22c55e' : '2px solid #475569',
            transition: 'border-color 0.2s ease',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            backgroundColor: backgroundColor || '#ffffff',
            backgroundImage: backgroundImageUrl && backgroundImageUrl.trim() ? `url(${backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            ...gridPattern,
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onSelectElement(null);
            }
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            {elements
              .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)) // Sort by zIndex
              .map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                scale={scale}
                pxPerMm={pxPerMm}
                onSelect={onSelectElement}
                isSelected={element.id === selectedElementId}
              />
            ))}
          </div>
        </div>
        
        {/* Leyenda de vista previa */}
        <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center">
          <span className="text-xs text-white/80">
            Vista previa • Escala {Math.round(scale * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
