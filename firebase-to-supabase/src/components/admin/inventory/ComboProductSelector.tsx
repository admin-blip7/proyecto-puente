
"use client";

import { useMemo, useState } from "react";
import { Product } from "@/types";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, X } from "lucide-react";

// Array constante para usar como fallback estable y no crear nuevas referencias en cada render
const EMPTY_COMBO_IDS: string[] = [];

interface ComboProductSelectorProps {
  form: {
    watch: (name: keyof Product) => any;
    setValue: (name: keyof Product, value: any) => void;
    getValues: (name: keyof Product) => any;
  };
  allProducts: Product[];
}

export default function ComboProductSelector({ form, allProducts }: ComboProductSelectorProps) {
  const [comboSearch, setComboSearch] = useState("");
  const { watch, setValue, getValues } = form;

  // Evitamos crear [] en cada render para no cambiar dependencias de los useMemo
  const comboProductIds: string[] = watch("comboProductIds") ?? EMPTY_COMBO_IDS;

  const comboProducts = useMemo(() => {
    return allProducts.filter(p => comboProductIds.includes(p.id));
  }, [allProducts, comboProductIds]);

  const filteredComboOptions = useMemo(() => {
    return allProducts.filter((p: any) => 
        !comboProductIds.includes(p.id) &&
        p.name.toLowerCase().includes(comboSearch.toLowerCase())
    );
  }, [allProducts, comboProductIds, comboSearch]);

  const handleToggleComboProduct = (productId: string) => {
    const currentIds = getValues("comboProductIds") || [];
    const newIds = currentIds.includes(productId) 
        ? currentIds.filter((id: string) => id !== productId)
        : [...currentIds, productId];
    setValue("comboProductIds", newIds);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Armar Combo</h3>
      <p className="text-sm text-muted-foreground">Selecciona productos que se venderán comúnmente con este artículo.</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Producto al Combo
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar producto..." value={comboSearch} onValueChange={setComboSearch}/>
            <CommandList>
              <CommandEmpty>No se encontraron productos.</CommandEmpty>
              {filteredComboOptions.map(product => (
                <CommandItem key={product.id} onSelect={() => handleToggleComboProduct(product.id)}>
                  {product.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <div className="space-y-2">
        <Label>Productos en el combo ({comboProducts.length})</Label>
        {comboProducts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {comboProducts.map(p => (
              <Badge key={p.id} variant="secondary" className="text-sm">
                {p.name}
                <button type="button" onClick={() => handleToggleComboProduct(p.id)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20">
                  <X className="h-3 w-3"/>
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No hay productos en el combo.</p>
        )}
      </div>
    </div>
  );
}
