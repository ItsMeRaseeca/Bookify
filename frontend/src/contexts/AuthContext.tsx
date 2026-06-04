import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthState } from '@/types';
import { authApi, userApi, setToken, removeToken, getToken, hasToken } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { name: string; email: string; phone: string; role: UserRole; password: string }) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (name: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'bookify_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    pendingVerification: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      if (hasToken()) {
        try {
          const response = await authApi.me();
          const userData = response.data.user;
          
          // Map backend user to frontend format
          const user: User = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone || '',
            role: userData.role.toLowerCase() as UserRole,
            createdAt: userData.createdAt,
          };

          setState({
            user,
            isAuthenticated: true,
            pendingVerification: null,
          });
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (error) {
          // Token invalid or expired
          removeToken();
          localStorage.removeItem(USER_KEY);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.login({ email, password });
      const { token, user: userData } = response.data;

      // Store token
      setToken(token);

      // Map backend user to frontend format
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role.toLowerCase() as UserRole,
        createdAt: new Date().toISOString(),
      };

      setState({
        user,
        isAuthenticated: true,
        pendingVerification: null,
      });
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const signup = async (data: { name: string; email: string; phone: string; role: UserRole; password: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      // Map role to backend format (uppercase)
      await authApi.signup({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role.toUpperCase() as 'USER' | 'ORGANIZER',
      });

      // Store pending verification data
      setState((prev) => ({
        ...prev,
        pendingVerification: {
          email: data.email,
          phone: data.phone,
          name: data.name,
          role: data.role,
          password: data.password,
        },
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  };

  const verifyOtp = async (otp: string): Promise<{ success: boolean; error?: string }> => {
    if (!state.pendingVerification) {
      return { success: false, error: 'No pending verification' };
    }

    try {
      const response = await authApi.verifyOtp({
        email: state.pendingVerification.email,
        otp,
      });

      const { token, user: userData } = response.data;

      // Store token
      setToken(token);

      // Map backend user to frontend format
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: state.pendingVerification.phone || '',
        role: userData.role.toLowerCase() as UserRole,
        createdAt: new Date().toISOString(),
      };

      setState({
        user,
        isAuthenticated: true,
        pendingVerification: null,
      });
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'OTP verification failed' };
    }
  };

  const resendOtp = async (): Promise<{ success: boolean; error?: string }> => {
    if (!state.pendingVerification) {
      return { success: false, error: 'No pending verification' };
    }

    try {
      await authApi.resendOtp({ email: state.pendingVerification.email });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to resend OTP' };
    }
  };

  const logout = () => {
    removeToken();
    localStorage.removeItem(USER_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      pendingVerification: null,
    });
  };

  const updateProfile = async (name: string): Promise<{ success: boolean; error?: string }> => {
    if (!state.user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await userApi.updateProfile({ name });
      const userData = response.data.user;

      const updatedUser: User = {
        ...state.user,
        name: userData.name,
      };

      setState((prev) => ({ ...prev, user: updatedUser }));
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        verifyOtp,
        resendOtp,
        logout,
        updateProfile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
