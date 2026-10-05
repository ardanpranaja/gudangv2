import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { Cog, Info, ArrowRight } from 'lucide-react';

export const MasterMesinPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Mesin & Aset Bergerak (Tahap Berikutnya)"
        description="Struktur modul pemisahan khusus aset mesin operasional dari barang habis pakai."
      />

      {/* Backend API Notice per Step 13 */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
          <Info className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
          <span>Status Modul Mesin di API GAS (v1.2.4)</span>
        </div>
        <p className="leading-relaxed text-slate-600 dark:text-slate-400">
          Sesuai spesifikasi blueprint, modul Master Mesin adalah modul tahap berikutnya dan belum
          diekspos sebagai endpoint aktif pada GAS v1.2.4. Tidak ada data palsu atau simulasi lokal yang ditampilkan.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
        <EmptyState
          title="Belum terhubung ke API GAS."
          description="Endpoint GET action=machines belum diekspos di backend GAS v1.2.4. Modul ini disiapkan untuk integrasi tahap berikutnya."
          action={{
            label: 'Buka Stok Barang Aktif',
            onClick: () => navigateTo('stok'),
          }}
        />
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cog className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>
            <strong>Blueprint Section 23:</strong> Struktur MASTER_MESIN disiapkan untuk mengelola nomor
            seri, merk, model, dan status unit mesin secara independen.
          </span>
        </div>
        <button
          onClick={() => navigateTo('pemakaian-mesin')}
          className="text-slate-900 dark:text-slate-100 font-semibold hover:underline inline-flex items-center gap-1 shrink-0 ml-3"
        >
          <span>Pemakaian Mesin</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
