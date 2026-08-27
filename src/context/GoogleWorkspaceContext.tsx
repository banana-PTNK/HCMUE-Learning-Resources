import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  setAccessTokenInMemory
} from '../services/googleAuth';
import { useToast } from './ToastContext';

interface GoogleWorkspaceContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  needsAuth: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  requireAuth: () => Promise<string | null>;
}

const GoogleWorkspaceContext = createContext<GoogleWorkspaceContextType | undefined>(undefined);

export const GoogleWorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setAccessTokenInMemory(token);
        setNeedsAuth(false);
        setIsLoading(false);
      },
      () => {
        // User logged out or memory token cleared
        setAccessToken(null);
        setAccessTokenInMemory(null);
        setNeedsAuth(true);
        setIsLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signIn = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setAccessTokenInMemory(res.accessToken);
        setNeedsAuth(false);
        toast.success(
          'Đã kết nối Google Workspace!',
          `Xin chào ${res.user.displayName || res.user.email}! Quyền truy cập Google Drive & Google Forms đã sẵn sàng.`
        );
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Sign in failed:', error);
      if (error?.code !== 'auth/popup-closed-by-user') {
        toast.error(
          'Đăng nhập Google thất bại',
          error?.message || 'Vui lòng thử lại và cấp quyền Google Drive & Forms.'
        );
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await googleSignOut();
      setUser(null);
      setAccessToken(null);
      setAccessTokenInMemory(null);
      setNeedsAuth(true);
      toast.info('Đã đăng xuất Google', 'Đã xóa token xác thực Google Workspace khỏi bộ nhớ.');
    } catch (error: any) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requireAuth = async (): Promise<string | null> => {
    const token = await getAccessToken();
    if (token) return token;

    const ok = await signIn();
    if (ok) {
      return await getAccessToken();
    }
    return null;
  };

  return (
    <GoogleWorkspaceContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        needsAuth,
        signIn,
        signOut,
        requireAuth
      }}
    >
      {children}
    </GoogleWorkspaceContext.Provider>
  );
};

export const useGoogleWorkspace = () => {
  const context = useContext(GoogleWorkspaceContext);
  if (!context) {
    throw new Error('useGoogleWorkspace must be used within a GoogleWorkspaceProvider');
  }
  return context;
};
