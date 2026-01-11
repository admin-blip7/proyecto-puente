import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// export const productCategories = [
//   { value: 'celular-seminuevo', label: 'Celular Seminuevo' },
//   { value: 'mica', label: 'Mica Protectora' },
// ];

interface CategoryAttributesProps {
  category: string;
  attributes: Record<string, any>;
  onChange: (attributes: Record<string, any>) => void;
}

export default function CategoryAttributes({ category, attributes, onChange }: CategoryAttributesProps) {
  const handleAttributeChange = (key: string, value: any) => {
    onChange({
      ...attributes,
      [key]: value
    });
  };

  // Renderizar campos específicos para cada categoría
  const renderCategoryFields = () => {
    switch (category) {
      case 'celular-seminuevo':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Atributos de Celular Seminuevo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color" className="text-sm">Color</Label>
                <Select value={attributes.color || ''} onValueChange={(value) => handleAttributeChange('color', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar color..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Negro">Negro</SelectItem>
                    <SelectItem value="Blanco">Blanco</SelectItem>
                    <SelectItem value="Azul">Azul</SelectItem>
                    <SelectItem value="Rojo">Rojo</SelectItem>
                    <SelectItem value="Verde">Verde</SelectItem>
                    <SelectItem value="Dorado">Dorado</SelectItem>
                    <SelectItem value="Plata">Plata</SelectItem>
                    <SelectItem value="Rosado">Rosado</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="memoria" className="text-sm">Memoria</Label>
                <Select value={attributes.memoria || ''} onValueChange={(value) => handleAttributeChange('memoria', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar memoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="32GB">32 GB</SelectItem>
                    <SelectItem value="64GB">64 GB</SelectItem>
                    <SelectItem value="128GB">128 GB</SelectItem>
                    <SelectItem value="256GB">256 GB</SelectItem>
                    <SelectItem value="512GB">512 GB</SelectItem>
                    <SelectItem value="1TB">1 TB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bateria" className="text-sm">Batería (%)</Label>
                <Input
                  id="bateria"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Ej: 85"
                  value={attributes.bateria || ''}
                  onChange={(e) => handleAttributeChange('bateria', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="estetica" className="text-sm">Estado Estético</Label>
                <Select value={attributes.estetica || ''} onValueChange={(value) => handleAttributeChange('estetica', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Como Nuevo">Como Nuevo</SelectItem>
                    <SelectItem value="Bueno">Bueno</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Aceptable">Aceptable</SelectItem>
                    <SelectItem value="Gastado">Gastado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'mica':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Dimensiones de la Mica</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alto" className="text-sm">Alto (cm)</Label>
                <Input
                  id="alto"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Ej: 15.5"
                  value={attributes.alto || ''}
                  onChange={(e) => handleAttributeChange('alto', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ancho" className="text-sm">Ancho (cm)</Label>
                <Input
                  id="ancho"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Ej: 7.5"
                  value={attributes.ancho || ''}
                  onChange={(e) => handleAttributeChange('ancho', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {renderCategoryFields()}
    </div>
  );
}