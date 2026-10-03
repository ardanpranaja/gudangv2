import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, SystemHealth } from '../types';
import { api, normalizeGasErrorMessage } from '../services/api';

export type PageId =
  | 'dashboard'
  | 'ai-assistant'
  | 'items'
  | 'members'
  | 'limits'
  | 'masuk'
  | 'keluar'
  | 'pinjam'
  | 'kembali'
  | 'pengajuan'
  | 'stok'
  | 'bincard'
  | 'riwayat-member'
  | 'laporan'
  | 'pengaturan'
  | 'mesin'
  | 'pemakaian-mesin';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  currentPage: PageId;
  navigateTo: (page: PageId, params?: Record<string, any>) => void;
  pageParams: Record<string, any>;
  role: UserRole;
  setRole: (role: UserRole) => void;
  loginAdmin: (pin: string) => Promise<void>;
  logoutAdmin: () => void;
  isAdminLoginOpen: boolean;
  setIsAdminLoginOpen: (open: boolean) => void;
  health: SystemHealth;
  refreshHealth: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message?: string | Error | Record<string, unknown> | unknown
  ) => void;
  removeToast: (id: string) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  canAccessPage: (page: PageId) => boolean;
  canPerformAction: (actionType: 'TRANSACTION' | 'MASTER_MUTATION' | 'APPROVAL' | 'SETTINGS' | 'REQUEST') => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check persisted session flag for admin
  const hasAdminSession = typeof window !== 'undefined' && sessionStorage.getItem('gp_admin') === '1';

  const [role, setRoleState] = useState<UserRole>(hasAdminSession ? 'ADMIN' : 'MEMBER');
  const [currentPage, setCurrentPage] = useState<PageId>(hasAdminSession ? 'dashboard' : 'pengajuan');
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  const [health, setHealth] = useState<SystemHealth>({
    status: 'ONLINE',
    version: '1.2.4',
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Check health periodically & on mount
  const refreshHealth = useCallback(async () => {
    try {
      const res = await api.checkHealth();
      setHealth(res);
    } catch {
      setHealth({
        status: 'OFFLINE',
        version: '1.2.4',
        error: 'Tidak dapat menghubungi backend',
      });
    }
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const canAccessPage = (page: PageId): boolean => {
    if (role === 'ADMIN') return true;
    // MEMBER role only has access to form pengajuan
    return page === 'pengajuan';
  };

  const canPerformAction = (
    actionType: 'TRANSACTION' | 'MASTER_MUTATION' | 'APPROVAL' | 'SETTINGS' | 'REQUEST'
  ): boolean => {
    if (role === 'ADMIN') return true;
    if (role === 'MEMBER') {
      return actionType === 'REQUEST';
    }
    return false;
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole === 'ADMIN') {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('gp_admin', '1');
      }
    } else {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('gp_admin');
      }
      if (currentPage !== 'pengajuan') {
        setCurrentPage('pengajuan');
      }
    }
  };

  const loginAdmin = async (pin: string): Promise<void> => {
    const res = await api.verifyAdminPin(pin);
    if (res && res.ok) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('gp_admin', '1');
      }
      setRoleState('ADMIN');
      setCurrentPage('dashboard');
      setIsAdminLoginOpen(false);
      addToast('success', 'Login Admin Berhasil', 'Akses penuh administrasi gudang aktif.');
    } else {
      throw new Error('Verifikasi PIN gagal.');
    }
  };

  const logoutAdmin = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('gp_admin');
    }
    setRoleState('MEMBER');
    setCurrentPage('pengajuan');
    addToast('info', 'Keluar dari Mode Admin', 'Anda kini berada di Mode Member (Permintaan Barang).');
  };

  const navigateTo = (page: PageId, params: Record<string, any> = {}) => {
    if (!canAccessPage(page)) {
      addToast('error', 'Akses Ditolak', 'Halaman ini hanya dapat diakses oleh Admin Gudang.');
      return;
    }
    setPageParams(params);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const addToast = (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message?: string | Error | Record<string, unknown> | unknown
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    let resolvedMessage: string | undefined = undefined;

    if (message !== undefined && message !== null) {
      if (typeof message === 'string') {
        const trimmed = message.trim();
        resolvedMessage = trimmed === '[object Object]' ? 'Terjadi kesalahan pada sistem.' : trimmed;
      } else if (message instanceof Error) {
        resolvedMessage =
          message.message && message.message !== '[object Object]'
            ? message.message
            : 'Terjadi kesalahan pada sistem.';
      } else if (typeof message === 'object') {
        resolvedMessage = normalizeGasErrorMessage(
          message,
          undefined,
          type === 'error' ? 'Operasi gagal diproses oleh sistem backend.' : undefined
        );
      } else {
        const str = String(message);
        resolvedMessage = str === '[object Object]' ? 'Terjadi kesalahan pada sistem.' : str;
      }
    }

    setToasts((prev) => [...prev, { id, type, title, message: resolvedMessage }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        navigateTo,
        pageParams,
        role,
        setRole,
        loginAdmin,
        logoutAdmin,
        isAdminLoginOpen,
        setIsAdminLoginOpen,
        health,
        refreshHealth,
        toasts,
        addToast,
        removeToast,
        refreshKey,
        triggerRefresh,
        canAccessPage,
        canPerformAction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
