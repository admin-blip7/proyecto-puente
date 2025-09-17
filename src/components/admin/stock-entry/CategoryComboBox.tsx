
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { searchCategories, createCategory } from '@/lib/services/productCategoryService';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';


type CategoryOption = { id: string; name: string };

interface CategoryComboBoxProps {
  value?: string | null;
  onChange?: (value: string) => void;
  onCategoriesChange: (categories: CategoryOption[]) => void;
  categories: CategoryOption[];
  placeholder?: string;
  allowCreate?: boolean;
}

export default function CategoryComboBox({
  value,
  onChange,
  onCategoriesChange,
  categories,
  placeholder = 'Buscar categoría…',
  allowCreate = true,
}: CategoryComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const debouncedSearchTerm = useDebouncedValue(inputValue, 300);
  const [isLoading, setIsLoading] = useState(false);
  const [localOptions, setLocalOptions] = useState<CategoryOption[]>(categories);

  const popoverRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(popoverRef, () => setOpen(false));

  const selectedCategoryName = useMemo(() => {
    return categories.find(cat => cat.name === value)?.name || value;
  }, [value, categories]);

  useEffect(() => {
    if (debouncedSearchTerm.length < 2) {
      setLocalOptions(categories);
      return;
    }

    let active = true;
    setIsLoading(true);

    const fetchAndSetCategories = async () => {
      try {
        const firestoreCategories = await searchCategories(debouncedSearchTerm);
        if (active) {
            // Combine and deduplicate results
            const combined = [...categories, ...firestoreCategories];
            const unique = Array.from(new Set(combined.map(c => c.name)))
                .map(name => combined.find(c => c.name === name)!);
            setLocalOptions(unique);
        }
      } catch (error) {
        console.error("Error searching categories:", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchAndSetCategories();

    return () => {
      active = false;
    };
  }, [debouncedSearchTerm, categories]);

  const handleSelect = (selectedValue: string) => {
    onChange?.(selectedValue);
    setOpen(false);
    setInputValue(''); 
  };

  const handleCreate = async () => {
    if (!allowCreate || !inputValue.trim()) return;

    const newCategoryName = inputValue.trim();
    setIsLoading(true);
    try {
        const newCategory = await createCategory(newCategoryName);
        const newOption = { id: newCategory.id, name: newCategory.name };
        
        onCategoriesChange([...categories, newOption]);
        setLocalOptions(prev => [...prev, newOption]);
        handleSelect(newCategory.name);
    } catch (error) {
        console.error("Failed to create category:", error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selectedCategoryName || "Seleccionar..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent ref={popoverRef} className="w-[--radix-popover-trigger-width] p-0">
        <Command filter={(itemValue, search) => itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading && (
                <div className="p-2 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin"/>
                </div>
            )}
            <CommandEmpty>
                {inputValue.trim().length > 0 && allowCreate ? (
                    <CommandItem onSelect={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear "{inputValue.trim()}"
                    </CommandItem>
                ) : (
                    "No se encontraron categorías."
                )}
            </CommandEmpty>
            <CommandGroup>
              {localOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
