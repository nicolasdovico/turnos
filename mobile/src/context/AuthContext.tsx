import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState } from '../types';
import * as secureStore from '../services/secureStore';
import * as api from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restaurar sesión desde expo-secure-store al inicializar la app
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await secureStore.getToken();
        const storedUser = await secureStore.getUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Error al restaurar sesión:', error);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.loginApi(email, password);
      await secureStore.saveToken(response.token);
      await secureStore.saveUser(response.user);
      setToken(response.token);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ) => {
    setIsLoading(true);
    try {
      const response = await api.registerApi(name, email, password, passwordConfirmation);
      await secureStore.saveToken(response.token);
      await secureStore.saveUser(response.user);
      setToken(response.token);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logoutApi();
    } finally {
      await secureStore.clearAuth();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const reloadProfile = async () => {
    try {
      const profile = await api.getProfileApi();
      await secureStore.saveUser(profile);
      setUser(profile);
    } catch (error) {
      console.error('Error recargando perfil:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
