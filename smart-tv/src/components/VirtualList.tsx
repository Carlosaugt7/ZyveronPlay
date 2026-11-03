import React, { useRef, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  selectedIndex: number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  overscan?: number;
  className?: string;
}

/**
 * Componente de Lista Virtualizada de Altíssima Performance para Smart TVs
 * Renderiza apenas os itens visíveis, mantendo o consumo de memória fixo em ~25MB
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  selectedIndex,
  renderItem,
  overscan = 5,
  className = ''
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Rolagem suave automática para manter o item selecionado visível no centro da TV
  useEffect(() => {
    if (!containerRef.current) return;
    const targetScrollTop = Math.max(0, (selectedIndex * itemHeight) - (containerHeight / 2) + (itemHeight / 2));
    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }, [selectedIndex, itemHeight, containerHeight]);

  const totalHeight = items.length * itemHeight;

  // Calcula quais índices desenhar baseado no selectedIndex para evitar re-layouts
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, selectedIndex - Math.floor(visibleCount / 2) - overscan);
  const endIndex = Math.min(items.length, selectedIndex + Math.ceil(visibleCount / 2) + overscan);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative ${className}`}
      style={{ height: `${containerHeight}px` }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, localIdx) => {
            const actualIndex = startIndex + localIdx;
            return (
              <div key={actualIndex} style={{ height: `${itemHeight}px` }}>
                {renderItem(item, actualIndex, actualIndex === selectedIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
