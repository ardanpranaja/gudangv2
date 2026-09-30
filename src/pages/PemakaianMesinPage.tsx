import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { Wrench, Info, ArrowRight } from 'lucide-react';

export const PemakaianMesinPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Pemakaian Mesin (Tahap Berikutnya)"
        description="Struktur modul rekam jejak jam terbang dan penugasan unit mesin oleh member."
      />

      {/* Backend API Notice per Step 13 */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Info className="w-4 h-4 text-slate-600 shrink-0" />
          <span>Status Modul Pemakaian Mesin di API GAS (v1.2.4)</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          Modul Pemakaian Mesin adalah modul tahap berikutnya dan belum diekspos sebagai endpoint aktif pada
          GAS v1.2.4. Tidak ada data palsu atau simulasi lokal yang ditampilkan.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8">
        <EmptyState
          title="Belum terhubung ke API GAS."
          description="Endpoint GET action=machine_usages belum diekspos di backend GAS v1.2.4. Modul ini disiapkan untuk integrasi tahap berikutnya."
          action={{
            label: 'Buka Riwayat Member',
            onClick: () => navigateTo('riwayat-member'),
          }}
        />
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-slate-500" />
          <span>
            <strong>Blueprint Section 24:</strong> Struktur PEMAKAIAN_MESIN disiapkan untuk mencatat jam
            mulai, selesai, durasi, lokasi, dan kondisi sebelum/sesudah operasi mesin.
          </span>
        </div>
        <button
          onClick={() => navigateTo('mesin')}
          className="text-slate-900 font-semibold hover:underline inline-flex items-center gap-1 shrink-0 ml-3"
        >
          <span>Master Mesin</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
