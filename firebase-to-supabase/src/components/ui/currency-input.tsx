"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateMXNAmount, sanitizeMXNAmount, formatMXNAmount } from '@/lib/validation/currencyValidation';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  id?: string;
  name?: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showCurrencyLabel?: boolean;
  min?: number;
  max?: number;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = "0.00",
  disabled = false,
  required = false,
  className,
  showCurrencyLabel = true,
  min = 0,
  max
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Actualizar el valor mostrado cuando cambie el valor prop
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value > 0 ? value.toString() : '');
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Limpiar error previo
    setError('');

    // Si el input está vacío, establecer valor a 0
    if (inputValue === '') {
      onChange(0);
      return;
    }

    // Sanitizar y validar el valor
    const sanitizedAmount = sanitizeMXNAmount(inputValue);
    
    // Validar el monto
    const validation = validateMXNAmount(sanitizedAmount);
    if (!validation.isValid) {
      setError(validation.error || 'Monto inválido');
      return;
    }

    // Validar límites mínimo y máximo
    if (sanitizedAmount < min) {
      setError(`El monto mínimo es $${min.toFixed(2)}`);
      return;
    }

    if (max && sanitizedAmount > max) {
      setError(`El monto máximo es $${max.toFixed(2)}`);
      return;
    }

    // Si todo está bien, actualizar el valor
    onChange(sanitizedAmount);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Al perder el foco, formatear el valor si es válido
    if (value > 0 && !error) {
      setDisplayValue(value.toFixed(2));
    }
  };

  const inputClassName = cn(
    "text-right",
    error && "border-red-500 focus:border-red-500",
    className
  );

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="flex items-center gap-2">
          {label}
          {showCurrencyLabel && (
            <span className="text-xs text-muted-foreground font-normal">
              (MXN - Pesos Mexicanos)
            </span>
          )}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
          $
        </div>
        <Input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClassName}
          style={{ paddingLeft: '2rem' }}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          MXN
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      
      {!error && value > 0 && !isFocused && (
        <p className="text-xs text-muted-foreground mt-1">
          {formatMXNAmount(value)}
        </p>
      )}
    </div>
  );
};

export default CurrencyInput;