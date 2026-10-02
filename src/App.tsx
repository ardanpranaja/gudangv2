import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';

import { DashboardPage } from './pages/DashboardPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ItemsPage } from './pages/ItemsPage';
import { MembersPage } from './pages/MembersPage';
import { MemberLimitsPage } from './pages/MemberLimitsPage';
import { BarangMasukPage } from './pages/BarangMasukPage';
import { BarangKeluarPage } from './pages/BarangKeluarPage';
import { PinjamPage } from './pages/PinjamPage';
import { KembaliPage } from './pages/KembaliPage';
import { PengajuanPage } from './pages/PengajuanPage';
import { StokPage } from './pages/StokPage';
import { BinCardPage } from './pages/BinCardPage';
import { RiwayatMemberPage } from './pages/RiwayatMemberPage';
import { LaporanPage } from './pages/LaporanPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { MasterMesinPage } from './pages/MasterMesinPage';
import { PemakaianMesinPage } from './pages/PemakaianMesinPage';

const AppRouter: React.FC = () => {
  const { currentPage } = useApp();

  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage />;
    case 'ai-assistant':
      return <AIAssistantPage />;
    case 'items':
      return <ItemsPage />;
    case 'members':
      return <MembersPage />;
    case 'limits':
      return <MemberLimitsPage />;
    case 'masuk':
      return <BarangMasukPage />;
    case 'keluar':
      return <BarangKeluarPage />;
    case 'pinjam':
      return <PinjamPage />;
    case 'kembali':
      return <KembaliPage />;
    case 'pengajuan':
      return <PengajuanPage />;
    case 'stok':
      return <StokPage />;
    case 'bincard':
      return <BinCardPage />;
    case 'riwayat-member':
      return <RiwayatMemberPage />;
    case 'laporan':
      return <LaporanPage />;
    case 'pengaturan':
      return <PengaturanPage />;
    case 'mesin':
      return <MasterMesinPage />;
    case 'pemakaian-mesin':
      return <PemakaianMesinPage />;
    default:
      return <DashboardPage />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <AppShell>
        <AppRouter />
      </AppShell>
    </AppProvider>
  );
}
