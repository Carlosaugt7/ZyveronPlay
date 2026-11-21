import React, { useState, useEffect } from 'react';
import { Lock, Delete, X } from 'lucide-react';
import { AdultContentHelper } from '../lib/adultContent';
import { useSpatialNav } from '../hooks/useSpatialNav';

interface AdultPinModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  title?: string;
}

export const AdultPinModal: React.FC<AdultPinModalProps> = ({
  isOpen,
  onDismiss,
  onSuccess,
  title = 'Conteúdo Adulto (+18)'
}) => {
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  // 0..8 (1-9), 9 (Apagar), 10 (0), 11 (Cancelar)
  const [focusedKey, setFocusedKey] = useState<number>(4); // Foca inicialmente no número 5

  useEffect(() => {
    if (isOpen) {
      setEnteredPin('');
      setErrorMessage('');
      setFocusedKey(4);
    }
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setErrorMessage('');

      if (nextPin.length === 4) {
        if (AdultContentHelper.verifyPin(nextPin)) {
          onSuccess();
        } else {
          setErrorMessage('Senha incorreta (Padrão: 0000)');
          setEnteredPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin((prev) => prev.slice(0, -1));
      setErrorMessage('');
    }
  };

  // Navegação D-Pad para TV
  useSpatialNav({
    onUp: () => {
      setFocusedKey((prev) => {
        if (prev >= 3) return prev - 3;
        return prev;
      });
    },
    onDown: () => {
      setFocusedKey((prev) => {
        if (prev <= 8) return prev + 3;
        return prev;
      });
    },
    onLeft: () => {
      setFocusedKey((prev) => {
        if (prev % 3 !== 0) return prev - 1;
        return prev;
      });
    },
    onRight: () => {
      setFocusedKey((prev) => {
        if (prev % 3 !== 2) return prev + 1;
        return prev;
      });
    },
    onSelect: () => {
      if (focusedKey >= 0 && focusedKey <= 8) {
        handleDigit(String(focusedKey + 1));
      } else if (focusedKey === 9) {
        handleDelete();
      } else if (focusedKey === 10) {
        handleDigit('0');
      } else if (focusedKey === 11) {
        onDismiss();
      }
    },
    onBack: () => {
      if (enteredPin.length > 0) {
        handleDelete();
      } else {
        onDismiss();
      }
    },
    disabled: !isOpen,
    priority: 50 // Máxima prioridade sobre a tela de fundo
  }, [isOpen, enteredPin, focusedKey]);

  // Teclado físico do computador / controle remoto numérico
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        e.stopPropagation();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, enteredPin]);

  if (!isOpen) return null;

  const keyPad = [
    { label: '1', value: '1', id: 0 },
    { label: '2', value: '2', id: 1 },
    { label: '3', value: '3', id: 2 },
    { label: '4', value: '4', id: 3 },
    { label: '5', value: '5', id: 4 },
    { label: '6', value: '6', id: 5 },
    { label: '7', value: '7', id: 6 },
    { label: '8', value: '8', id: 7 },
    { label: '9', value: '9', id: 8 },
    { label: 'DEL', value: 'del', id: 9, isDel: true },
    { label: '0', value: '0', id: 10 },
    { label: 'SAIR', value: 'exit', id: 11, isExit: true }
  ];

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#121722] border-2 border-emerald-500/70 p-6 md:p-8 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center relative">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-lg">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-black text-white text-center mb-1 tracking-wide">
          {title}
        </h3>
        <p className="text-xs text-slate-400 text-center mb-5">
          Digite a senha de 4 dígitos para liberar o acesso nesta sessão
        </p>

        {/* 4 Pontos de PIN */}
        <div className="flex items-center justify-center gap-3.5 mb-5">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < enteredPin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-400 border-emerald-400 scale-125 shadow-lg shadow-emerald-500/50'
                    : 'border-slate-600 bg-slate-800/80'
                }`}
              />
            );
          })}
        </div>

        {/* Mensagem de Erro ou Dica */}
        {errorMessage ? (
          <p className="text-xs font-bold text-red-400 mb-3 text-center animate-pulse">
            {errorMessage}
          </p>
        ) : (
          <p className="text-[11px] text-slate-500 mb-3 text-center">
            Senha padrão de fábrica: <strong className="text-emerald-400">0000</strong>
          </p>
        )}

        {/* Teclado Numérico 3x4 */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {keyPad.map((item) => {
            const isItemFocused = focusedKey === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.isDel) handleDelete();
                  else if (item.isExit) onDismiss();
                  else handleDigit(item.value);
                }}
                onMouseEnter={() => setFocusedKey(item.id)}
                className={`h-12 rounded-2xl font-black text-lg transition-all duration-150 flex items-center justify-center cursor-pointer select-none ${
                  isItemFocused
                    ? 'bg-emerald-400 text-black scale-105 shadow-xl shadow-emerald-500/40 ring-4 ring-emerald-300'
                    : item.isExit
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : item.isDel
                    ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60'
                    : 'bg-[#182030] text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                {item.isDel ? <Delete className="w-5 h-5" /> : item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

