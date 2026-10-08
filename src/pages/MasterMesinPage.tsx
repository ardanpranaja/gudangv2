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
      <div className="p-4 bg-yellow-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-500 rounded-xl text-xs text-stone-950 dark:text-stone-100 space-y-2 shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center gap-2 font-black text-stone-950 dark:text-stone-100 text-sm">
          <Info className="w-4 h-4 text-stone-950 dark:text-stone-100 shrink-0 stroke-[2.5]" />
          <span>Status Modul Mesin di API GAS (v1.2.4)</span>
        </div>
        <p className="leading-relaxed text-stone-900 dark:text-stone-200 font-medium">
          Sesuai spesifikasi blueprint, modul Master Mesin adalah modul tahap berikutnya dan belum
          diekspos sebagai endpoint aktif pada GAS v1.2.4. Tidak ada data palsu atau simulasi lokal yang ditampilkan.
        </p>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-8 shadow-[5px_5px_0px_#18181b]">
        <EmptyState
          title="Belum terhubung ke API GAS."
          description="Endpoint GET action=machines belum diekspos di backend GAS v1.2.4. Modul ini disiapkan untuk integrasi tahap berikutnya."
          action={{
            label: 'Buka Stok Barang Aktif',
            onClick: () => navigateTo('stok'),
          }}
        />
      </div>

      <div className="p-4 bg-cyan-100 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-500 rounded-xl text-xs text-stone-950 dark:text-stone-200 flex items-center justify-between shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center gap-2">
          <Cog className="w-4 h-4 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
          <span>
            <strong>Blueprint Section 23:</strong> Struktur MASTER_MESIN disiapkan untuk mengelola nomor
            seri, merk, model, dan status unit mesin secara independen.
          </span>
        </div>
        <button
          onClick={() => navigateTo('pemakaian-mesin')}
          className="px-3 py-1.5 bg-amber-300 hover:bg-amber-400 text-stone-950 font-black border-2 border-stone-900 rounded-lg shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none inline-flex items-center gap-1 shrink-0 ml-3 transition-all"
        >
          <span>Pemakaian Mesin</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
