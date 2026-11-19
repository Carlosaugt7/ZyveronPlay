"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserDocument, UserRole } from "@/types";
import { store } from "@/lib/store";
import { FirestoreSync } from "@/lib/firestoreSync";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { hashPassword, verifyPassword, isBcryptHash } from "@/lib/auth";

interface AuthContextType {
  user: UserDocument | null;
  realUser: UserDocument | null;
  loading: boolean;
  canSimulate: boolean;
  isSimulating: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  allUsers: UserDocument[];
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  realUser: null,
  loading: true,
  canSimulate: false,
  isSimulating: false,
  login: async () => ({ success: false }),
  logout: () => {},
  switchRole: () => {},
  allUsers: [],
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDocument | null>(null);
  const [realUser, setRealUser] = useState<UserDocument | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserDocument[]>([]);

  const isMasterAccount = (u: UserDocument | null): boolean => {
    if (!u) return false;
    const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "admin@zyveronplay.com").toLowerCase();
    const email = u.email?.trim().toLowerCase() || "";
    return u.uid === "usr-admin-master" || email === masterEmail || (u.role === "superadmin" && email === "admin@zyveronplay.com");
  };

  const canSimulate = Boolean(realUser && (realUser.role === "superadmin" || isMasterAccount(realUser)));

  useEffect(() => {
    // 1. Inicia sincronização bidirecional com o Firestore
    store.initFirestoreSync();

    // 2. Verifica se já há uma sessão salva no navegador
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zyveron_auth_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            if (isMasterAccount(parsed)) {
              parsed.role = "superadmin";
            }
            setRealUser(parsed);
            setUser(parsed);
            setIsSimulating(false);
          }
        } catch (_) {}
      }
    }

    const users = store.getUsers("superadmin", "usr-admin-master");
    setAllUsers(users);
    setLoading(false);

    const unsubscribe = store.subscribe(() => {
      refreshUser();
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const refreshUser = () => {
    if (!user) return;
    const users = store.getUsers("superadmin", "usr-admin-master");
    setAllUsers(users);
    const updated = users.find(u => u.uid === user.uid);
    if (updated) {
      if (isMasterAccount(updated)) {
        updated.role = "superadmin";
      }
      setUser({ ...updated });
      setRealUser({ ...updated });
      if (typeof window !== "undefined") {
        localStorage.setItem("zyveron_auth_session", JSON.stringify(updated));
      }
    }
  };

  const login = async (emailInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    // 1. CONTA MESTRE DO ADMINISTRADOR:
    // Email: admin@zyveronplay.com | Senha: Adm0418$
    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "admin@zyveronplay.com";
    const masterPasswordHash = process.env.MASTER_PASSWORD_BCRYPT;

    if (email === masterEmail) {
      let isValidMaster = false;
      
      // Nova validação com bcrypt (se configurado)
      if (masterPasswordHash) {
        isValidMaster = await verifyPassword(password, masterPasswordHash);
      }
      // Fallback para desenvolvimento (senha em texto plano)
      else if (password === "Adm0418$") {
        isValidMaster = true;
      }
      
      if (!isValidMaster) {
        return { success: false, error: "Senha incorreta." };
      }

      const adminUser: UserDocument = {
        uid: "usr-admin-master",
        name: "Administrador Zyveron",
        email: "admin@zyveronplay.com",
        role: "superadmin",
        parentId: null,
        credits: 99999,
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
      };

      setRealUser(adminUser);
      setUser(adminUser);
      setIsSimulating(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("zyveron_auth_session", JSON.stringify(adminUser));
      }
      FirestoreSync.syncUserToFirestore(adminUser);

      // Tenta login com Firebase Auth em background (sem travar se não estiver configurado)
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (authErr: any) {
        if (authErr?.code === "auth/user-not-found" || authErr?.code === "auth/invalid-credential") {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (_) {}
        }
      }

      return { success: true };
    }

    // 2. Verificação de Revendas Cadastradas
    const users = store.getUsers("superadmin", "usr-admin-master");
    const found = users.find(u => u.email.toLowerCase() === email);
    if (found) {
      if (found.status === "blocked") {
        return { success: false, error: "Esta conta está bloqueada pelo administrador." };
      }
      
      if (found.password && found.password.trim() !== "") {
        // Nova versão com hash bcrypt
        if (found.passwordVersion === 2 || isBcryptHash(found.password)) {
          const isValid = await verifyPassword(password, found.password);
          if (!isValid) {
            return { success: false, error: "Senha incorreta." };
          }
        }
        // Fallback para senhas antigas (backward compatibility)
        else if (found.password !== password) {
          return { success: false, error: "Senha incorreta." };
        }
        // Auto-migra senha antiga para hash na primeira autenticação bem-sucedida
        else {
          try {
            const newHash = await hashPassword(password);
            found.password = newHash;
            found.passwordVersion = 2;
            store.updateUser(found);
            console.log(`[Auth] Senha migrada para hash: ${found.email}`);
          } catch (err) {
            console.error('[Auth] Erro ao migrar senha:', err);
            // Continua o login mesmo se a migração falhar
          }
        }
      }
      
      // Preserva rigorosamente o papel real da conta (não promove para superadmin)
      if (isMasterAccount(found)) {
        found.role = "superadmin";
      } else {
        found.role = found.role || "reseller";
      }

      setRealUser(found);
      setUser(found);
      setIsSimulating(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("zyveron_auth_session", JSON.stringify(found));
      }
      return { success: true };
    }

    return { success: false, error: "E-mail ou senha incorretos." };
  };

  const switchRole = (role: UserRole) => {
    // 🛡️ SEGURANÇA ESTRITA: Apenas o Administrador Mestre pode simular outras visões.
    // Revenda Master e Sub-Revenda são bloqueados terminantemente de alternar papéis ou acessar modo admin.
    if (!realUser || (!isMasterAccount(realUser) && realUser.role !== "superadmin")) {
      console.warn("[Auth Security] Tentativa não autorizada de simulação de papel bloqueada.");
      return;
    }

    if (role === "superadmin") {
      // Retorna à visão real do Super Admin
      setUser(realUser);
      setIsSimulating(false);
      return;
    }

    // Modo simulação para teste visual do Super Admin
    setIsSimulating(true);
    const users = store.getUsers("superadmin", "usr-admin-master");
    const found = users.find(u => u.role === role && u.uid !== realUser.uid);
    if (found) {
      setUser({ ...found, isSimulated: true } as any);
    } else {
      // Cria uma identidade simulada para teste de permissão instantâneo
      const simulated: UserDocument = {
        uid: `sim-${role}-${Date.now().toString(36)}`,
        name: role === "reseller" ? "Simulação: Revenda Master" : "Simulação: Sub-Revenda",
        email: `${role}@zyveronplay.com`,
        role: role,
        parentId: role === "sub_reseller" ? realUser.uid : null,
        credits: role === "reseller" ? 50 : 20,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUser(simulated);
    }
  };

  const logout = () => {
    setUser(null);
    setRealUser(null);
    setIsSimulating(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("zyveron_auth_session");
    }
    try {
      signOut(auth);
    } catch (_) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        realUser,
        loading,
        canSimulate,
        isSimulating,
        login,
        logout,
        switchRole,
        allUsers,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
