"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserDocument, UserRole } from "@/types";
import { store } from "@/lib/store";
import { FirestoreSync } from "@/lib/firestoreSync";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

interface AuthContextType {
  user: UserDocument | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  allUsers: UserDocument[];
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  switchRole: () => {},
  allUsers: [],
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserDocument[]>([]);

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
            setUser(parsed);
          }
        } catch (_) {}
      }
    }

    const users = store.getUsers("superadmin", "usr-admin-master");
    setAllUsers(users);
    setLoading(false);
  }, []);

  const refreshUser = () => {
    if (!user) return;
    const users = store.getUsers("superadmin", "usr-admin-master");
    setAllUsers(users);
    const updated = users.find(u => u.uid === user.uid);
    if (updated) {
      setUser({ ...updated });
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
    if (email === "admin@zyveronplay.com" && password === "Adm0418$") {
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

      setUser(adminUser);
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
      setUser(found);
      if (typeof window !== "undefined") {
        localStorage.setItem("zyveron_auth_session", JSON.stringify(found));
      }
      return { success: true };
    }

    return { success: false, error: "E-mail ou senha incorretos." };
  };

  const switchRole = (role: UserRole) => {
    if (!user) return;
    const users = store.getUsers("superadmin", "usr-admin-master");
    const found = users.find(u => u.role === role);
    if (found) {
      setUser(found);
    }
  };

  const logout = () => {
    setUser(null);
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
        loading,
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
