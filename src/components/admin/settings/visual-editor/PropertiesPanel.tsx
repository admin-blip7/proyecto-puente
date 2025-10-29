"use client";

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { LABEL_PLACEHOLDERS, PlaceholderKey, VisualElement } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabaseClient';
import { nanoid } from 'nanoid';
import { Loader2, ChevronUp, ChevronDown, RotateCw } from 'lucide-react';

interface PropertiesPanelProps {
  selectedElement: VisualElement | null;
  onUpdateElement: (id: string, newProps: Partial<VisualElement>) => void;
  onDeleteElement?: (id: string) => void;
  onBringToFront?: (id: string) => void;
  onSendToBack?: (id: string) => void;
}

const textElementTypes: VisualElement['type'][] = ['text', 'placeholder'];

const FONT_OPTIONS = [
  'Inter',
  'Gilroy',
  'Gilroy Light',
  'Gilroy Thin',
  'Gilroy UltraLight',
  'Gilroy Heavy',
  'Roboto',
  'Arial',
  'Montserrat',
  'Open Sans',
  'Lato',
  'Courier New',
  'Georgia',
];

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedElement, 
  onUpdateElement, 
  onBringToFront, 
  onSendToBack 
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [draftWidth, setDraftWidth] = useState('');
  const [draftHeight, setDraftHeight] = useState('');
  const [draftFontSize, setDraftFontSize] = useState('');
  const [draftRotation, setDraftRotation] = useState('');

  const placeholderMeta = useMemo(() => {
    if (!selectedElement?.placeholderKey) return undefined;
    return LABEL_PLACEHOLDERS.find((placeholder) => placeholder.key === selectedElement.placeholderKey);
  }, [selectedElement?.placeholderKey]);

  useEffect(() => {
    if (!selectedElement) {
      setDraftWidth('');
      setDraftHeight('');
      setDraftFontSize('');
      setDraftRotation('');
      return;
    }
    setDraftWidth(selectedElement.width !== undefined ? String(selectedElement.width) : '');
    setDraftHeight(selectedElement.height !== undefined ? String(selectedElement.height) : '');
    setDraftFontSize(selectedElement.fontSize !== undefined ? String(selectedElement.fontSize) : '');
    setDraftRotation(selectedElement.rotation !== undefined ? String(selectedElement.rotation) : '0');
  }, [selectedElement]);

  const handleDimensionChange = (field: 'width' | 'height' | 'fontSize' | 'rotation') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (field === 'width') setDraftWidth(value);
      if (field === 'height') setDraftHeight(value);
      if (field === 'fontSize') setDraftFontSize(value);
      if (field === 'rotation') setDraftRotation(value);
    };

  const commitDimension = (field: 'width' | 'height' | 'fontSize' | 'rotation') => () => {
    if (!selectedElement) return;
    const raw = field === 'width' ? draftWidth : field === 'height' ? draftHeight : field === 'fontSize' ? draftFontSize : draftRotation;
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      setDraftWidth(selectedElement.width !== undefined ? String(selectedElement.width) : '');
      setDraftHeight(selectedElement.height !== undefined ? String(selectedElement.height) : '');
      setDraftFontSize(selectedElement.fontSize !== undefined ? String(selectedElement.fontSize) : '');
      setDraftRotation(selectedElement.rotation !== undefined ? String(selectedElement.rotation) : '0');
      return;
    }
    onUpdateElement(selectedElement.id, { [field]: parsed });
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!selectedElement) return;
    onUpdateElement(selectedElement.id, { content: event.target.value });
  };

  const insertPlaceholderAtCursor = (token: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const currentValue = textarea.value;
    const newValue = `${currentValue.slice(0, selectionStart)}${token}${currentValue.slice(selectionEnd)}`;
    if (!selectedElement) return;
    onUpdateElement(selectedElement.id, { content: newValue });
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPosition = selectionStart + token.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const handleLogoUpload = useCallback(async () => {
    if (!selectedElement || selectedElement.type !== 'image') return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        setUploadingLogo(true);
        if (!supabase) {
          throw new Error('Supabase client no disponible');
        }

        const extension = file.name.split('.').pop() || 'png';
        const filePath = `${nanoid()}.${extension}`;
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from('label-assets')
          .upload(filePath, arrayBuffer, {
            contentType: file.type || 'image/png',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('label-assets').getPublicUrl(filePath);
        const downloadUrl = data.publicUrl;
        if (!selectedElement) return;
        onUpdateElement(selectedElement.id, {
          imageUrl: downloadUrl,
          content: downloadUrl,
        });
      } catch (error) {
        console.error('Error uploading logo', error);
      } finally {
        setUploadingLogo(false);
      }
    };
    fileInput.click();
  }, [selectedElement, onUpdateElement]);

  useEffect(() => {
    if (!uploadingLogo) return;
    if (!selectedElement) {
      setUploadingLogo(false);
      return;
    }
    const imageUrl = (selectedElement.imageUrl as string | undefined) || (typeof selectedElement.content === 'string' ? selectedElement.content : undefined);
    if (imageUrl && !imageUrl.startsWith('data:')) {
      setUploadingLogo(false);
    }
  }, [uploadingLogo, selectedElement]);

  if (!selectedElement) {
    return <p className="text-sm text-muted-foreground">Selecciona un elemento para editar sus propiedades.</p>;
  }

  const isTextElement = textElementTypes.includes(selectedElement.type);
  const barcodeFormat = selectedElement.barcodeFormat ?? 'code128';
  const showBarcodeValue = selectedElement.showValue !== false;
  const qrPlaceholder = selectedElement.qrPlaceholderKey ?? 'sku';

  const isSideways = selectedElement.rotation === 90 || selectedElement.rotation === 270;
  const widthLabel = isSideways ? 'Alto (mm)' : 'Ancho (mm)';
  const heightLabel = isSideways ? 'Ancho (mm)' : 'Alto (mm)';

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <Label>Tipo</Label>
        <p className="font-medium capitalize">{placeholderMeta?.label ?? selectedElement.type}</p>
        {placeholderMeta && (
          <p className="text-muted-foreground text-xs">{placeholderMeta.token}</p>
        )}
      </div>

      {/* Layer Controls */}
      <div className="space-y-2">
        <Label>Capas</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onBringToFront?.(selectedElement.id)}
            className="flex-1 flex items-center justify-center gap-1"
          >
            <ChevronUp className="h-3 w-3" />
            Al frente
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSendToBack?.(selectedElement.id)}
            className="flex-1 flex items-center justify-center gap-1"
          >
            <ChevronDown className="h-3 w-3" />
            Al fondo
          </Button>
        </div>
      </div>

      {/* Rotation Controls */}
      <div className="space-y-2">
        <Label htmlFor="rotation">
          <div className="flex items-center gap-1.5">
            <RotateCw className="h-3.5 w-3.5" />
            Rotación
          </div>
        </Label>
        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            size="sm"
            variant={draftRotation === '0' ? 'default' : 'outline'}
            onClick={() => {
              setDraftRotation('0');
              onUpdateElement(selectedElement.id, { rotation: 0 });
            }}
          >
            0°
          </Button>
          <Button
            type="button"
            size="sm"
            variant={draftRotation === '90' ? 'default' : 'outline'}
            onClick={() => {
              setDraftRotation('90');
              onUpdateElement(selectedElement.id, { rotation: 90 });
            }}
          >
            90°
          </Button>
          <Button
            type="button"
            size="sm"
            variant={draftRotation === '180' ? 'default' : 'outline'}
            onClick={() => {
              setDraftRotation('180');
              onUpdateElement(selectedElement.id, { rotation: 180 });
            }}
          >
            180°
          </Button>
          <Button
            type="button"
            size="sm"
            variant={draftRotation === '270' ? 'default' : 'outline'}
            onClick={() => {
              setDraftRotation('270');
              onUpdateElement(selectedElement.id, { rotation: 270 });
            }}
          >
            270°
          </Button>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rotation" className="text-xs text-muted-foreground">
            Ángulo personalizado (grados)
          </Label>
          <Input
            id="rotation"
            type="number"
            step="1"
            min="0"
            max="360"
            value={draftRotation}
            onChange={handleDimensionChange('rotation')}
            onBlur={commitDimension('rotation')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitDimension('rotation')();
              }
            }}
          />
        </div>
      </div>

      {isTextElement && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label>Fuente</Label>
            <Select
              value={selectedElement.fontFamily ?? 'Inter'}
              onValueChange={(font) => onUpdateElement(selectedElement.id, { fontFamily: font })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font} value={font} className="font-medium">
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="content">Contenido</Label>
            <textarea
              id="content"
              ref={textAreaRef}
              value={selectedElement.content ?? ''}
              onChange={handleContentChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={4}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {LABEL_PLACEHOLDERS.map((placeholder) => (
              <Button
                key={placeholder.key}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => insertPlaceholderAtCursor(placeholder.token)}
              >
                {placeholder.token}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isTextElement && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="fontSize">Tamaño de fuente (px)</Label>
            <Input
              id="fontSize"
              type="number"
              step="1"
              min="6"
              value={draftFontSize}
              onChange={handleDimensionChange('fontSize')}
              onBlur={commitDimension('fontSize')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitDimension('fontSize')();
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label>Alineación del texto</Label>
            <Select
              value={selectedElement.textAlign ?? 'center'}
              onValueChange={(align) => onUpdateElement(selectedElement.id, { textAlign: align as 'left' | 'center' | 'right' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="width">{widthLabel}</Label>
          <Input
            id="width"
            type="number"
            step="0.5"
            min="5"
            value={isSideways ? draftHeight : draftWidth}
            onChange={handleDimensionChange(isSideways ? 'height' : 'width')}
            onBlur={commitDimension(isSideways ? 'height' : 'width')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitDimension(isSideways ? 'height' : 'width')();
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="height">{heightLabel}</Label>
          <Input
            id="height"
            type="number"
            step="0.5"
            min="5"
            value={isSideways ? draftWidth : draftHeight}
            onChange={handleDimensionChange(isSideways ? 'width' : 'height')}
            onBlur={commitDimension(isSideways ? 'width' : 'height')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitDimension(isSideways ? 'width' : 'height')();
              }
            }}
          />
        </div>
      </div>

      {selectedElement.type === 'image' && (
        <div className="space-y-2">
          <Label>Logo del Negocio</Label>
          <Button
            type="button"
            variant="outline"
            disabled={uploadingLogo}
            onClick={handleLogoUpload}
          >
            {uploadingLogo ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Subiendo...
              </span>
            ) : (
              'Subir / Cambiar Imagen'
            )}
          </Button>
        </div>
      )}

      {selectedElement.type === 'barcode' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Formato de Código de Barras</Label>
            <Select
              value={barcodeFormat}
              onValueChange={(value) => onUpdateElement(selectedElement.id, {
                barcodeFormat: value as VisualElement['barcodeFormat'],
                placeholderKey: 'sku',
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code128">Code-128</SelectItem>
                <SelectItem value="ean13">EAN-13</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mostrar SKU debajo</Label>
              <p className="text-xs text-muted-foreground">El valor usado será siempre el SKU del producto.</p>
            </div>
            <Switch
              checked={showBarcodeValue}
              onCheckedChange={(checked) => onUpdateElement(selectedElement.id, { showValue: checked })}
            />
          </div>
        </div>
      )}

      {selectedElement.type === 'qrcode' && (
        <div className="space-y-1">
          <Label>Información codificada</Label>
          <Select
            value={qrPlaceholder}
            onValueChange={(value) => onUpdateElement(selectedElement.id, {
              qrPlaceholderKey: value as PlaceholderKey,
              placeholderKey: value as PlaceholderKey,
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LABEL_PLACEHOLDERS.map((placeholder) => (
                <SelectItem key={placeholder.key} value={placeholder.key}>
                  {placeholder.token}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {placeholderMeta?.helperText && (
        <p className="text-xs text-muted-foreground">{placeholderMeta.helperText}</p>
      )}
    </div>
  );
};

export default PropertiesPanel;
