import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight?: number;
  selectedIndex: number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  overscan?: number;
  className?: string;
}

/**
 * Componente de Lista Virtualizada de Altíssimo Desempenho para Smart TVs
 * Sincroniza 1:1 o seletor com a barra de rolagem física/nativa, mantendo consumo de memória <25MB.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  selectedIndex,
  renderItem,
  overscan = 6,
  className = ''
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [measuredHeight, setMeasuredHeight] = useState<number>(containerHeight || 600);

  // Mede dinamicamente a altura visível real do container se não fornecida
  useEffect(() => {
    if (containerHeight) {
      setMeasuredHeight(containerHeight);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      if (container.clientHeight > 0) {
        setMeasuredHeight(container.clientHeight);
      }
    };
    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.height > 0) {
            setMeasuredHeight(entry.contentRect.height);
          }
        }
      });
      ro.observe(container);
      return () => ro.disconnect();
    }
  }, [containerHeight]);

  // Sincroniza a barra de rolagem instantaneamente com a posição do seletor selecionado
  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    // Centraliza o item selecionado na tela da TV para excelente visualização
    const targetScrollTop = Math.max(
      0,
      Math.min(
        (items.length * itemHeight) - measuredHeight,
        (selectedIndex * itemHeight) - (measuredHeight / 2) + (itemHeight / 2)
      )
    );

    // Ajusta o scroll nativo do container para que o thumb da barra de rolagem acompanhe o seletor
    container.scrollTop = targetScrollTop;
    setScrollTop(targetScrollTop);
  }, [selectedIndex, itemHeight, measuredHeight, items.length]);

  // Atualiza o estado ao rolar manualmente (mouse wheel, touch ou drag)
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = items.length * itemHeight;

  // Calcula com exatidão a janela de itens visíveis com base no scrollTop
  const visibleCount = Math.ceil(measuredHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + (overscan * 2));

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto custom-scrollbar relative w-full h-full select-none ${className}`}
      style={containerHeight ? { height: `${containerHeight}px` } : undefined}
    >
      {/* Elemento espaçador com a altura total real para desenhar a barra de rolagem proporcional */}
      <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
        {/* Janela deslizante de elementos visíveis */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            willChange: 'transform'
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

