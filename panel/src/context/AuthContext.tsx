"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserDocument, UserRole } from "@/types";
import { store } from "@/lib/store";

interface AuthContextType {
  user: UserDocument | null;
  loading: boolean;
  login: (email: string, role?: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  allUsers: UserDocument[];
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
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
    // Inicializa com o Super Admin por padrão
    const users = store.getUsers("superadmin", "usr-admin-master");
    setAllUsers(users);
    const admin = users.find(u => u.role === "superadmin") || users[0];
    setUser(admin);
    setLoading(false);
  }, []);

  const refreshUser = () => {
    if (!user) return;
    const users = store.getUsers("superadmin", "usr-admin-master");
    setAllUsers(users);
    const updated = users.find(u => u.uid === user.uid);
    if (updated) setUser({ ...updated });
  };

  const login = (email: string) => {
    const users = store.getUsers("superadmin", "usr-admin-master");
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setUser(found);
    } else {
      // Fallback
      setUser(users[0]);
    }
  };

  const switchRole = (role: UserRole) => {
    const users = store.getUsers("superadmin", "usr-admin-master");
    const found = users.find(u => u.role === role);
    if (found) {
      setUser(found);
    }
  };

  const logout = () => {
    setUser(null);
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

