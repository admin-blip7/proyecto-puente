
"use client";

import React, { useMemo, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { LABEL_PLACEHOLDERS, VisualElement } from './types';
import { QRCode } from 'react-qrcode-logo';
import Image from 'next/image';

interface CanvasElementProps {
  element: VisualElement;
  onSelect: (id: string | null) => void;
  isSelected: boolean;
  scale: number;
  pxPerMm: number;
}

const CanvasElement: React.FC<CanvasElementProps> = ({ element, onSelect, isSelected, scale, pxPerMm }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'canvas-element',
    item: { id: element.id, type: 'canvas-element' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const widthMm = element.width ?? 20;
  const heightMm = element.height ?? 10;
  const topPx = (element.y ?? 0) * pxPerMm;
  const leftPx = (element.x ?? 0) * pxPerMm;
  const widthPx = widthMm * pxPerMm;
  const heightPx = heightMm * pxPerMm;
  const fontSizePx = (element.fontSize ?? 11) * scale;

  const placeholderDefinition = useMemo(() => {
    if (!element.placeholderKey) return undefined;
    return LABEL_PLACEHOLDERS.find((placeholder) => placeholder.key === element.placeholderKey);
  }, [element.placeholderKey]);

  const renderContent = () => {
    if (element.type === 'placeholder') {
      if (placeholderDefinition?.kind === 'barcode') {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 gap-1 py-1">
            <div
              className="w-full flex-1"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, rgba(15,23,42,0.85) 0, rgba(15,23,42,0.85) 2px, transparent 2px, transparent 4px)',
                backgroundSize: '8px 100%'
              }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {placeholderDefinition.token}
            </span>
          </div>
        );
      }

      return (
        <span className="text-slate-700 font-medium truncate" style={{ fontSize: fontSizePx }}>
          {placeholderDefinition?.token ?? element.content ?? 'Placeholder'}
        </span>
      );
    }

    if (element.type === 'barcode') {
      const label = element.showValue === false ? '' : '{SKU}';
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <div
            className="w-full flex-1"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(15,23,42,0.85) 0, rgba(15,23,42,0.85) 2px, transparent 2px, transparent 4px)',
              backgroundSize: '8px 100%'
            }}
          />
          {label && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {label}
            </span>
          )}
        </div>
      );
    }

    if (element.type === 'image') {
      const imageSrc = element.imageUrl || (typeof element.content === 'string' ? element.content : undefined);
      if (imageSrc) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt="Logo"
            width={widthPx}
            height={heightPx}
            className="w-full h-full object-contain"
          />
        );
      }
      return (
        <span className="text-xs text-slate-500" style={{ fontSize: fontSizePx }}>
          Área de Imagen
        </span>
      );
    }

    if (element.type === 'qrcode') {
      const tokenLabel = element.qrPlaceholderKey
        ? LABEL_PLACEHOLDERS.find((placeholder) => placeholder.key === element.qrPlaceholderKey)?.token ?? '{SKU}'
        : '{SKU}';
      const qrSize = Math.max(40, Math.min(widthPx, heightPx));
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <QRCode value={tokenLabel} size={qrSize} quietZone={0} ecLevel="H" eyeRadius={2} />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {tokenLabel}
          </span>
        </div>
      );
    }

    return (
      <span className="text-slate-700 font-medium" style={{ fontSize: fontSizePx }}>
        {element.content ?? 'Texto'}
      </span>
    );
  };

  const ref = useRef<HTMLDivElement>(null);
  drag(ref);

  return (
    <div
      ref={ref}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(element.id);
      }}
      style={{
        position: 'absolute',
        left: leftPx,
        top: topPx,
        width: widthPx,
        height: heightPx,
        border: isSelected ? '2px solid #2563eb' : '1px solid #64748b',
        backgroundColor: 'rgba(248, 250, 252, 0.95)',
        opacity: isDragging ? 0.6 : 1,
        cursor: 'move',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: element.textAlign ?? 'center',
        padding: 4,
        borderRadius: 4,
        fontFamily: element.fontFamily ?? 'Inter',
        fontWeight: 700,
        textTransform: 'capitalize',
        whiteSpace: 'pre-wrap',
      }}
    >
      {renderContent()}
    </div>
  );
};

export default CanvasElement;
