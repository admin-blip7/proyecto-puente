
'use client'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStablePortal } from '@/components/infra/useStablePortal'
import { useControlledInput } from '@/hooks/useControlledInput'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchCategories, createCategory } from '@/lib/services/categoryService'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'
import { Loader2, PlusCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getLogger } from "@/lib/logger";
const log = getLogger("CategoryComboBox");

type Option = { id: string; label: string }
interface Props {
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  allowCreate?: boolean;
}

function CategoryComboBoxBase({ value, onChange, placeholder = 'Buscar categoría…', allowCreate = true }: Props) {
  const { container, mounted, isInline } = useStablePortal('category-combobox')
  const { value: term, bind, isComposing } = useControlledInput(value ?? '')
  const debounced = useDebouncedValue(term, 320)
  
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Option[]>([])
  const [isLoading, setIsLoading] = useState(false);
  
  const componentRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(componentRef, () => setOpen(false));
  
  // This effect syncs the external value prop to the internal input value
  // when the combobox is not focused. This is important for form resets or external updates.
  useEffect(() => {
    if (document.activeElement !== componentRef.current?.querySelector('input')) {
      bind.onChange({ target: { value: value ?? '' } } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [value, bind]);


  // This effect fetches categories based on the debounced search term.
  useEffect(() => {
    let active = true
    // Do not search while user is composing with an IME (e.g., Pinyin, Japanese)
    if (isComposing()) return;

    const q = debounced.trim()
    setIsLoading(true);
    
    searchCategories(q).then((rows: any) => {
        if (!active) return // Prevent state update if component has unmounted
        setOptions((rows ?? []).filter(Boolean).map((category: any) => ({ id: category.id, label: category.name })))
        setIsLoading(false);
    }).catch(() => {
        if(active) setIsLoading(false);
    })

    return () => { active = false }
  }, [debounced, isComposing])

  const handleSelect = useCallback((option: Option) => {
    onChange?.(option.label)
    setOpen(false)
    componentRef.current?.querySelector('input')?.blur();
  }, [onChange])

  const handleCreate = useCallback(async (newCategoryName: string) => {
    if (!allowCreate) return;
    setIsLoading(true);
    try {
        const newId = await createCategory(newCategoryName);
        const newOption = { id: newId, label: newCategoryName };
        setOptions(prev => [newOption, ...prev]);
        handleSelect(newOption);
    } catch(err) {
        log.error("Failed to create category", err);
    } finally {
        setIsLoading(false);
    }
  }, [allowCreate, handleSelect]);


  const popup = useMemo(() => (
    <ul role="listbox" className="max-h-72 overflow-auto rounded-md border shadow-md bg-background text-foreground">
      {isLoading ? (
        <li className="px-3 py-2 text-muted-foreground flex items-center gap-2"><Loader2 className='animate-spin h-4 w-4' /> Buscando...</li>
      ) : (
        <>
            {options.filter(Boolean).map(opt => (
                <li key={opt.id} role="option" tabIndex={0}
                    className="px-3 py-2 hover:bg-accent cursor-pointer"
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                    onClick={() => handleSelect(opt)}
                    aria-selected={value === opt.label}>
                {opt.label}
                </li>
            ))}
            {options.length === 0 && !isLoading && debounced.length > 0 && allowCreate && (
                 <li role="option" tabIndex={0}
                    className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center gap-2 text-primary"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleCreate(debounced.trim())}
                    aria-selected={false}>
                    <PlusCircle className='h-4 w-4' /> Crear &quot;{debounced.trim()}&quot;
                </li>
            )}
            {options.length === 0 && !isLoading && (debounced.length === 0 || !allowCreate) && (
                <li className="px-3 py-2 text-muted-foreground">Sin resultados</li>
            )}
        </>
      )}
    </ul>
  ), [options, isLoading, handleSelect, handleCreate, debounced, allowCreate, value])

  const dropdownContent = (
    <div className="absolute left-0 right-0 z-50 mt-1">{popup}</div>
  )

  return (
    <div className="relative" ref={componentRef}>
      <Input
        {...bind}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
      />
      {open && (isInline
        ? dropdownContent // Render inline for iOS Safari
        : (mounted && container ? createPortal(dropdownContent, container) : null))}
    </div>
  )
}

// Memoize the component to prevent re-renders when parent state changes,
// if the props passed to this component remain the same.
const CategoryComboBox = memo(CategoryComboBoxBase, (prevProps, nextProps) =>
  prevProps.value === nextProps.value && 
  prevProps.placeholder === nextProps.placeholder && 
  prevProps.onChange === nextProps.onChange
)

export default CategoryComboBox;
