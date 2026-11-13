import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Delete, CornerDownLeft, Trash2 } from 'lucide-react';
import { useSpatialNav } from '../hooks/useSpatialNav';

interface TvSearchModalProps {
  isOpen: boolean;
  title?: string;
  initialQuery?: string;
  totalResultsCount?: number;
  onSearch: (query: string) => void;
  onClose: () => void;
}

const KEYBOARD_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y', 'Z', '-', '.', '/', '@']
];

export const TvSearchModal: React.FC<TvSearchModalProps> = ({
  isOpen,
  title = 'Pesquisar',
  initialQuery = '',
  totalResultsCount,
  onSearch,
  onClose
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  // Posição do foco no teclado virtual: row (0..4), col (0..9)
  const [rowIndex, setRowIndex] = useState<number>(1); // Começa na letra 'A'
  const [colIndex, setColIndex] = useState<number>(0);
  const activeKeyRef = useRef<HTMLButtonElement>(null);

  // Sincroniza query com initialQuery quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setRowIndex(1);
      setColIndex(0);
    }
  }, [isOpen, initialQuery]);

  // Garante que o foco real do DOM permaneça sempre travado na tecla ativa do modal
  useEffect(() => {
    if (isOpen) {
      activeKeyRef.current?.focus();
    }
  }, [isOpen, rowIndex, colIndex]);

  const handleChar = useCallback((char: string) => {
    setQuery((prev) => {
      const next = prev + char;
      onSearch(next);
      return next;
    });
  }, [onSearch]);

  const handleDelete = useCallback(() => {
    setQuery((prev) => {
      const next = prev.slice(0, -1);
      onSearch(next);
      return next;
    });
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  const handleConfirm = useCallback(() => {
    onSearch(query);
    onClose();
  }, [query, onSearch, onClose]);

  // Teclado físico do computador / controle remoto numérico ou teclado USB/Bluetooth
  // Intercepta na fase de captura (capture: true) com stopPropagation para nunca vazar teclas para os itens ao fundo!
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Deixa as setas para o hook de navegação espacial
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
        return;
      }

      // Impede qualquer propagação para elementos e cartões de vídeo no fundo
      e.stopPropagation();

      const code = e.keyCode || e.which;
      const key = e.key;

      if (key === 'Backspace' || code === 8) {
        e.preventDefault();
        handleDelete();
      } else if (key === 'Enter' || code === 13 || key === 'Ok' || key === 'OK') {
        e.preventDefault();
        handleConfirm();
      } else if (key === 'Escape' || code === 27) {
        e.preventDefault();
        onClose();
      } else if (key === ' ' || code === 32) {
        e.preventDefault();
        handleChar(' ');
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleChar(key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleChar, handleDelete, handleConfirm, onClose]);

  // Navegação D-Pad para Smart TV
  useSpatialNav({
    onUp: () => {
      setRowIndex((prev) => Math.max(0, prev - 1));
    },
    onDown: () => {
      setRowIndex((prev) => Math.min(4, prev + 1));
    },
    onLeft: () => {
      if (rowIndex === 4) {
        // Linha de ações especiais
        setColIndex((prev) => {
          if (prev >= 9) return 7; // Fechar -> Concluir
          if (prev >= 7) return 5; // Concluir -> Limpar
          if (prev >= 5) return 3; // Limpar -> Apagar
          if (prev >= 3) return 0; // Apagar -> Espaço
          return 0;
        });
      } else {
        setColIndex((prev) => Math.max(0, prev - 1));
      }
    },
    onRight: () => {
      if (rowIndex === 4) {
        // Linha de ações especiais
        setColIndex((prev) => {
          if (prev < 3) return 3;  // Espaço -> Apagar
          if (prev < 5) return 5;  // Apagar -> Limpar
          if (prev < 7) return 7;  // Limpar -> Concluir
          if (prev < 9) return 9;  // Concluir -> Fechar
          return 9;
        });
      } else {
        setColIndex((prev) => Math.min(9, prev + 1));
      }
    },
    onSelect: () => {
      if (rowIndex >= 0 && rowIndex <= 3) {
        const char = KEYBOARD_ROWS[rowIndex][colIndex];
        if (char) handleChar(char);
      } else if (rowIndex === 4) {
        if (colIndex < 3) {
          handleChar(' ');
        } else if (colIndex < 5) {
          handleDelete();
        } else if (colIndex < 7) {
          handleClear();
        } else if (colIndex < 9) {
          handleConfirm();
        } else {
          onClose();
        }
      }
    },
    onBack: () => {
      onClose();
    },
    disabled: !isOpen,
    priority: 50
  }, [isOpen, rowIndex, colIndex, handleChar, handleDelete, handleClear, handleConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10010] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#0f172a] border-2 border-emerald-500/60 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-5">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">
                {title}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Navegue com as setas do controle ou digite diretamente pelo teclado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fechar (Voltar)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Caixa de Exibição da Busca */}
        <div className="w-full bg-[#0a0d14] border-2 border-emerald-400/80 rounded-2xl px-5 py-4 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
            <Search className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-2xl md:text-3xl font-black font-mono text-emerald-400 tracking-wide truncate flex items-center">
              {query ? (
                <>
                  <span>{query}</span>
                  <span className="w-2.5 h-7 bg-emerald-400 ml-1 animate-pulse" />
                </>
              ) : (
                <span className="text-slate-500 text-lg md:text-xl font-normal italic">
                  Digite para buscar...
                </span>
              )}
            </div>
          </div>

          {totalResultsCount !== undefined && (
            <div className="shrink-0 bg-sky-950/70 border border-sky-500/40 px-3.5 py-1.5 rounded-xl text-sky-400 font-mono font-bold text-xs md:text-sm">
              {totalResultsCount} encontrados
            </div>
          )}
        </div>

        {/* Grade de Teclas do Teclado Virtual (10 colunas por linha) */}
        <div className="flex flex-col gap-2.5 w-full">
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-10 gap-2">
              {row.map((char, cIdx) => {
                const isFocused = rowIndex === rIdx && colIndex === cIdx;
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    ref={isFocused ? activeKeyRef : null}
                    type="button"
                    tabIndex={isFocused ? 0 : -1}
                    onClick={() => {
                      setRowIndex(rIdx);
                      setColIndex(cIdx);
                      handleChar(char);
                    }}
                    className={`h-12 md:h-14 rounded-xl text-base md:text-xl font-black transition-all flex items-center justify-center cursor-pointer select-none ${
                      isFocused
                        ? 'bg-emerald-400 text-black font-black scale-108 ring-4 ring-emerald-300 shadow-xl z-10'
                        : 'bg-[#1e293b] text-white hover:bg-slate-700 border border-slate-700/80'
                    }`}
                  >
                    {char}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Linha 4: Ações Especiais (Espaço, Apagar, Limpar, Concluir, Fechar) */}
          <div className="grid grid-cols-10 gap-2 mt-1">
            {/* Espaço (3 colunas: 0, 1, 2) */}
            <button
              ref={rowIndex === 4 && colIndex < 3 ? activeKeyRef : null}
              type="button"
              tabIndex={rowIndex === 4 && colIndex < 3 ? 0 : -1}
              onClick={() => {
                setRowIndex(4);
                setColIndex(0);
                handleChar(' ');
              }}
              className={`col-span-3 h-12 md:h-14 rounded-xl text-sm md:text-base font-black transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
                rowIndex === 4 && colIndex < 3
                  ? 'bg-emerald-400 text-black font-black scale-104 ring-4 ring-emerald-300 shadow-xl z-10'
                  : 'bg-[#1e293b] text-slate-200 hover:bg-slate-700 border border-slate-700/80'
              }`}
            >
              <span>ESPAÇO</span>
            </button>

            {/* Apagar (2 colunas: 3, 4) */}
            <button
              ref={rowIndex === 4 && colIndex >= 3 && colIndex < 5 ? activeKeyRef : null}
              type="button"
              tabIndex={rowIndex === 4 && colIndex >= 3 && colIndex < 5 ? 0 : -1}
              onClick={() => {
                setRowIndex(4);
                setColIndex(3);
                handleDelete();
              }}
              className={`col-span-2 h-12 md:h-14 rounded-xl text-sm md:text-base font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                rowIndex === 4 && colIndex >= 3 && colIndex < 5
                  ? 'bg-amber-400 text-black font-black scale-104 ring-4 ring-amber-300 shadow-xl z-10'
                  : 'bg-[#1e293b] text-amber-400 hover:bg-slate-700 border border-slate-700/80'
              }`}
            >
              <Delete className="w-5 h-5" />
              <span>APAGAR</span>
            </button>

            {/* Limpar (2 colunas: 5, 6) */}
            <button
              ref={rowIndex === 4 && colIndex >= 5 && colIndex < 7 ? activeKeyRef : null}
              type="button"
              tabIndex={rowIndex === 4 && colIndex >= 5 && colIndex < 7 ? 0 : -1}
              onClick={() => {
                setRowIndex(4);
                setColIndex(5);
                handleClear();
              }}
              className={`col-span-2 h-12 md:h-14 rounded-xl text-sm md:text-base font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                rowIndex === 4 && colIndex >= 5 && colIndex < 7
                  ? 'bg-red-500 text-white font-black scale-104 ring-4 ring-red-400 shadow-xl z-10'
                  : 'bg-[#1e293b] text-slate-300 hover:bg-slate-700 border border-slate-700/80'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>LIMPAR</span>
            </button>

            {/* Concluir / Buscar (2 colunas: 7, 8) */}
            <button
              ref={rowIndex === 4 && colIndex >= 7 && colIndex < 9 ? activeKeyRef : null}
              type="button"
              tabIndex={rowIndex === 4 && colIndex >= 7 && colIndex < 9 ? 0 : -1}
              onClick={() => {
                setRowIndex(4);
                setColIndex(7);
                handleConfirm();
              }}
              className={`col-span-2 h-12 md:h-14 rounded-xl text-sm md:text-base font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                rowIndex === 4 && colIndex >= 7 && colIndex < 9
                  ? 'bg-emerald-400 text-black font-black scale-104 ring-4 ring-emerald-300 shadow-xl z-10'
                  : 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/50'
              }`}
            >
              <CornerDownLeft className="w-5 h-5" />
              <span>BUSCAR</span>
            </button>

            {/* Fechar (1 coluna: 9) */}
            <button
              ref={rowIndex === 4 && colIndex >= 9 ? activeKeyRef : null}
              type="button"
              tabIndex={rowIndex === 4 && colIndex >= 9 ? 0 : -1}
              onClick={() => {
                setRowIndex(4);
                setColIndex(9);
                onClose();
              }}
              className={`col-span-1 h-12 md:h-14 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center cursor-pointer select-none ${
                rowIndex === 4 && colIndex >= 9
                  ? 'bg-slate-300 text-black font-black scale-104 ring-4 ring-white shadow-xl z-10'
                  : 'bg-[#1e293b] text-slate-400 hover:bg-slate-700 border border-slate-700/80'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rodapé explicativo */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
          <span>[D-Pad]: Navegar pelas letras</span>
          <span>[OK]: Selecionar letra</span>
          <span>[VOLTAR]: Fechar busca</span>
        </div>
      </div>
    </div>
  );
};
