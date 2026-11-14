import React, { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        Pasang Aplikasi Offline
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Pasang di iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <h3 className="text-base font-semibold text-slate-900">
                Pasang Aplikasi di iPhone / iPad
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                1. Ketuk tombol <strong>Bagikan (Share)</strong> di Safari.<br />
                2. Pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full min-h-[42px] rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC<{ pendingSyncCount?: number }> = ({
  pendingSyncCount = 0,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div
      className={`fixed bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm z-40 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-md no-print ${
        !isOnline
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-blue-200 bg-blue-50 text-blue-900'
      }`}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        {!isOnline
          ? 'Mode Offline — Cache terenkripsi digunakan.'
          : `${pendingSyncCount} hasil menunggu sinkronisasi otomatis.`}
      </span>
    </div>
  );
};
