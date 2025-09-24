"use client";

import React from 'react';
import { useDrag, DragSourceMonitor } from 'react-dnd';
import { cn } from '@/lib/utils';

interface ToolbarItemProps {
  type: string;
  children: React.ReactNode;
  item?: Record<string, unknown>;
  className?: string;
}

const ToolbarItem: React.FC<ToolbarItemProps> = ({ type, children, item, className }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type,
    item: { type, ...item },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={cn(
        'p-2 border rounded-md cursor-move bg-muted text-sm hover:bg-muted/80 transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
};

export default ToolbarItem;
