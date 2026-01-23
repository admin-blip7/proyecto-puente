import type { PlaceholderKey } from './labelPlaceholders';

export type VisualElementType = 'text' | 'image' | 'qrcode' | 'barcode' | 'placeholder';

export interface VisualElement {
  id: string;
  type: VisualElementType;
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  zIndex?: number; // Layer order (higher values appear on top)
  content?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
  placeholderKey?: PlaceholderKey;
  rotation?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  barcodeFormat?: 'code128' | 'ean13' | 'qr';
  qrPlaceholderKey?: PlaceholderKey;
  imageUrl?: string;
  [key: string]: unknown;
}

export interface VisualEditorData {
  elements: VisualElement[];
  globalStyles?: {
    fontFamily?: string;
    backgroundImageUrl?: string;
    backgroundColor?: string;
  };
}

export interface VisualEditorState {
  elements: VisualElement[];
  selectedElementId: string | null;
}

export const normalizeVisualEditorData = (value: unknown): VisualEditorData => {
  if (!value) {
    return { elements: [] };
  }

  if (Array.isArray(value)) {
    return {
      elements: (value as VisualElement[]).map((element) =>
        element.type === 'placeholder' ? { ...element, type: 'text' } : element
      ),
    };
  }

  if (typeof value === 'object' && value !== null) {
    const maybeData = value as Partial<VisualEditorData>;
    const elements = Array.isArray(maybeData.elements)
      ? (maybeData.elements as VisualElement[])
      : Array.isArray(maybeData as unknown as VisualElement[])
        ? ((maybeData as unknown as VisualElement[]) ?? [])
        : [];

    return {
      elements: elements.map((element) =>
        element.type === 'placeholder' ? { ...element, type: 'text' } : element
      ),
      globalStyles: maybeData.globalStyles,
    };
  }

  return { elements: [] };
};
