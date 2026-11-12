import { useState, useEffect } from 'react';

export const ADULT_KEYWORDS = [
  'ADULTO', 'ADULTOS', 'XXX', '+18', '18+', 'EROTICO', 'ERÓTICO',
  'PRIVE', 'PRIVÉ', 'PLAYBOY', 'SEXY', 'FORBIDDEN', 'VENUS', 'HOT',
  'PENTHOUSE', 'REDLIGHT', 'HUSTLER', 'BRAZZERS', 'PORNO', 'PÔRNO',
  'SENSUAL', 'HARDCORE', 'SOFTCORE', 'ONLYFANS', 'GAROTAS', 'BABES'
];

const PREFS_KEY_PIN = 'zyveron_smarttv_adult_pin';
const DEFAULT_PIN = '0000';

// Estado de desbloqueio mantido ESTRITAMENTE em memória (reseta ao fechar/recarregar a página)
let isSessionUnlockedMemory = false;

export const AdultContentHelper = {
  isSessionUnlocked(): boolean {
    return isSessionUnlockedMemory;
  },

  unlockSession(): void {
    isSessionUnlockedMemory = true;
  },

  lockSession(): void {
    isSessionUnlockedMemory = false;
  },

  isAdultCategory(categoryName?: string | null): boolean {
    if (!categoryName || typeof categoryName !== 'string') return false;
    const upper = categoryName.toUpperCase();
    return ADULT_KEYWORDS.some((kw) => upper.includes(kw));
  },

  getStoredPin(): string {
    try {
      return localStorage.getItem(PREFS_KEY_PIN) || DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  },

  setStoredPin(newPin: string): void {
    try {
      const clean = newPin.trim().slice(0, 4);
      localStorage.setItem(PREFS_KEY_PIN, clean);
    } catch {}
  },

  verifyPin(inputPin: string): boolean {
    const currentPin = this.getStoredPin();
    const valid = inputPin.trim() === currentPin;
    if (valid) {
      this.unlockSession();
    }
    return valid;
  },

  /**
   * Reordena a lista colocando categorias adultas SEMPRE no FINAL.
   */
  partitionAdultCategories<T>(categories: T[], nameSelector: (item: T) => string): T[] {
    const regular: T[] = [];
    const adult: T[] = [];

    for (const cat of categories) {
      if (this.isAdultCategory(nameSelector(cat))) {
        adult.push(cat);
      } else {
        regular.push(cat);
      }
    }

    return [...regular, ...adult];
  }
};

