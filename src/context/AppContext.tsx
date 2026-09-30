import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, SystemHealth } from '../types';
import { api } from '../services/api';

export type PageId =
  | 'dashboard'
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
  health: SystemHealth;
  refreshHealth: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  canAccessPage: (page: PageId) => boolean;
  canPerformAction: (actionType: 'TRANSACTION' | 'MASTER_MUTATION' | 'APPROVAL' | 'SETTINGS') => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  const [role, setRoleState] = useState<UserRole>('ADMIN');
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

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    addToast('info', `Peran diubah ke ${newRole}`, `Akses disesuaikan dengan aturan peran ${newRole}.`);
  };

  const navigateTo = (page: PageId, params: Record<string, any> = {}) => {
    // Check permission before navigation
    if (!canAccessPage(page)) {
      addToast('error', 'Akses Ditolak', `Peran ${role} tidak memiliki hak akses ke halaman tersebut.`);
      return;
    }
    setPageParams(params);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Section 27: ROLE & PERMISSION
  const canAccessPage = (page: PageId): boolean => {
    if (role === 'ADMIN') return true;
    if (role === 'OPERATOR') {
      // Operator: Dashboard, Barang Masuk, Barang Keluar, Pinjam, Kembali, Stok, Bin Card, Pengajuan, Riwayat Member
      // Not allowed: Master Barang (edit), Master Member (edit), Limit (edit), Pengaturan, Admin approvals
      const operatorAllowed: PageId[] = [
        'dashboard',
        'items',
        'members',
        'limits',
        'masuk',
        'keluar',
        'pinjam',
        'kembali',
        'pengajuan',
        'stok',
        'bincard',
        'riwayat-member',
        'laporan',
        'mesin',
        'pemakaian-mesin',
      ];
      return operatorAllowed.includes(page);
    }
    if (role === 'VIEWER') {
      // Viewer: Dashboard, Stok, Laporan, Bin Card (read only), Riwayat Member (read only)
      const viewerAllowed: PageId[] = [
        'dashboard',
        'stok',
        'bincard',
        'riwayat-member',
        'laporan',
        'items',
        'members',
        'limits',
        'mesin',
      ];
      return viewerAllowed.includes(page);
    }
    return false;
  };

  const canPerformAction = (actionType: 'TRANSACTION' | 'MASTER_MUTATION' | 'APPROVAL' | 'SETTINGS'): boolean => {
    if (role === 'ADMIN') return true;
    if (role === 'OPERATOR') {
      if (actionType === 'TRANSACTION') return true;
      return false; // Cannot master mutation, cannot approve, cannot settings
    }
    if (role === 'VIEWER') {
      return false; // Read-only
    }
    return false;
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        navigateTo,
        pageParams,
        role,
        setRole,
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
