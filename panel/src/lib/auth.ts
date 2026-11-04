import bcrypt from 'bcryptjs';

/**
 * Módulo de Autenticação Segura
 * Implementa hash bcrypt para proteção de senhas (LGPD/GDPR compliance)
 */

/**
 * Cria hash bcrypt de senha (10 rounds = ~100ms, seguro e rápido)
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim() === '') {
    throw new Error('Senha não pode estar vazia');
  }
  return bcrypt.hash(password.trim(), 10);
}

/**
 * Verifica senha contra hash bcrypt
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (!password || !hash) return false;
    return await bcrypt.compare(password.trim(), hash);
  } catch (error) {
    console.error('[Auth] Erro ao verificar senha:', error);
    return false;
  }
}

/**
 * Verifica se string é um hash bcrypt válido
 */
export function isBcryptHash(str: string): boolean {
  if (!str) return false;
  // Formato bcrypt: $2a$10$... ou $2b$... ou $2y$...
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(str);
}

/**
 * Valida força da senha (mínimo 6 caracteres)
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || password.trim().length < 6) {
    errors.push('Senha deve ter no mínimo 6 caracteres');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
