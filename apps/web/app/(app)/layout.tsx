'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { ToastProvider } from '../../components/Toast';
import { getToken } from '../../lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    setListo(true);
  }, [router]);

  if (!listo) return null;

  return (
    <ToastProvider>
      <div className="shell">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </ToastProvider>
  );
}
