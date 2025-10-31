"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const currentToken = api.token;
        const authenticated = api.isAuthenticated();
        
        setToken(currentToken);
        setIsAuthenticated(authenticated);
        setIsCheckingAuth(false);
        
        console.log('Auth check:', { authenticated, hasToken: !!currentToken });
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setToken(null);
        setIsCheckingAuth(false);
      }
    };

    // Check immediately
    checkAuth();

    // Check periodically for token changes
    const interval = setInterval(checkAuth, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isCheckingAuth, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}