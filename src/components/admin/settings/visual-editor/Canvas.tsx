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
  isFlipped?: boolean;
  onCreateElement: (item: CanvasDropItem, position: { x: number; y: number }) => void;
  moveElement: (id: string, x: number, y: number) => void;
  onSelectElement: (id: string | null) => void;
  selectedElementId: string | null;
}

const Canvas: React.FC<CanvasProps> = ({
  elements,
  labelWidthMm,
  labelHeightMm,
  scale,
  showGrid = false,
  isFlipped = false,
  onCreateElement,
  moveElement,
  onSelectElement,
  selectedElementId,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const pxPerMm = useMemo(() => mmToPixels(1, scale), [scale]);
  const widthPx = useMemo(() => mmToPixels(labelWidthMm, scale), [labelWidthMm, scale]);
  const heightPx = useMemo(() => mmToPixels(labelHeightMm, scale), [labelHeightMm, scale]);
  
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
    <div className="w-full h-full flex items-center justify-center bg-muted/40">
      <div
        ref={ref}
        className="relative bg-white shadow-sm"
        style={{
          width: widthPx,
          height: heightPx,
          border: isOver ? '2px dashed #22c55e' : '1px solid #d4d4d8',
          transition: 'border-color 0.2s ease',
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
            transform: isFlipped ? 'rotate(180deg)' : 'none',
            transformOrigin: 'center',
          }}
        >
          {elements.map((element) => (
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
    </div>
  );
};

export default Canvas;
