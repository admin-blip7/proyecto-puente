import React from "react";
import { generateUniqueKey } from "@/lib/utils/keys";

interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyPrefix?: string;
  className?: string;
  emptyMessage?: string;
  emptyComponent?: React.ReactNode;
  onInvalidIds?: (invalidItems: T[]) => void;
}

/**
 * Componente optimizado para renderizar listas con keys únicas
 * Evita problemas de duplicación de keys en React
 */
export function OptimizedList<T>({
  items,
  renderItem,
  keyPrefix = "item",
  className = "",
  emptyMessage = "No hay elementos para mostrar",
  emptyComponent,
  onInvalidIds
}: OptimizedListProps<T>) {
  // Reportar IDs inválidos si se proporciona la función
  React.useEffect(() => {
    if (onInvalidIds && items.length > 0) {
      const invalidItems = items.filter(item => {
        const itemAsAny = item as any;
        return !itemAsAny?.id || 
          (typeof itemAsAny.id === 'string' && itemAsAny.id.trim() === '') ||
          (typeof itemAsAny.id === 'object' && itemAsAny.id === null);
      });
      
      if (invalidItems.length > 0) {
        onInvalidIds(invalidItems);
      }
    }
  }, [items, onInvalidIds]);

  if (items.length === 0) {
    return emptyComponent || (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((item, index) => {
        const key = generateUniqueKey(item, index, keyPrefix);
        return (
          <React.Fragment key={key}>
            {renderItem(item, index)}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface OptimizedTableProps<T> {
  items: T[];
  columns: {
    key: string;
    header: string;
    className?: string;
    render: (item: T, index: number) => React.ReactNode;
  }[];
  keyPrefix?: string;
  className?: string;
  emptyMessage?: string;
  emptyComponent?: React.ReactNode;
  onInvalidIds?: (invalidItems: T[]) => void;
}

/**
 * Componente optimizado para renderizar tablas con keys únicas
 */
export function OptimizedTable<T>({
  items,
  columns,
  keyPrefix = "table-row",
  className = "",
  emptyMessage = "No hay datos para mostrar",
  emptyComponent,
  onInvalidIds
}: OptimizedTableProps<T>) {
  // Reportar IDs inválidos si se proporciona la función
  React.useEffect(() => {
    if (onInvalidIds && items.length > 0) {
      const invalidItems = items.filter(item => {
        const itemAsAny = item as any;
        return !itemAsAny?.id || 
          (typeof itemAsAny.id === 'string' && itemAsAny.id.trim() === '') ||
          (typeof itemAsAny.id === 'object' && itemAsAny.id === null);
      });
      
      if (invalidItems.length > 0) {
        onInvalidIds(invalidItems);
      }
    }
  }, [items, onInvalidIds]);

  if (items.length === 0) {
    return emptyComponent || (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {columns.map((column, index) => (
              <th
                key={`header-${column.key}-${index}`}
                className={`text-left p-2 font-medium ${column.className || ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, rowIndex) => {
            const rowKey = generateUniqueKey(item, rowIndex, keyPrefix);
            return (
              <tr key={rowKey} className="border-b hover:bg-muted/50">
                {columns.map((column, colIndex) => (
                  <td
                    key={`cell-${column.key}-${colIndex}`}
                    className={`p-2 ${column.className || ""}`}
                  >
                    {column.render(item, rowIndex)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Hook personalizado para manejar listas con keys únicas
 */
export function useOptimizedList<T>(
  initialItems: T[] = [],
  keyPrefix: string = "item"
) {
  const [items, setItems] = React.useState<T[]>(initialItems);

  const addItem = React.useCallback((item: T) => {
    setItems(prev => [...prev, item]);
  }, []);

  const removeItem = React.useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = React.useCallback((index: number, newItem: T) => {
    setItems(prev => prev.map((item, i) => i === index ? newItem : item));
  }, []);

  const moveItem = React.useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  }, []);

  const clearItems = React.useCallback(() => {
    setItems([]);
  }, []);

  const getItemKey = React.useCallback((item: T, index: number) => {
    return generateUniqueKey(item, index, keyPrefix);
  }, [keyPrefix]);

  return {
    items,
    setItems,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    clearItems,
    getItemKey
  };
}