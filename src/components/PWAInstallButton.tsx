import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone (installed PWA), hide the button
  if (isInstalled) {
    return null;
  }

  // Android / Chrome / Desktop native prompt flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer border border-slate-700/50"
      >
        <Download size={13} />
        Install Aplikasi HP
      </button>
    );
  }

  // iOS Safari specific flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer border border-slate-700/50"
        >
          <Smartphone size={13} />
          Install di iOS (Apple)
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-slate-800 relative animate-in fade-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Install album kenangan di iPhone</h3>
                  <p className="text-[10px] text-slate-400">Jadikan aplikasi mandiri tanpa browser</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                <div className="flex gap-2.5 items-start">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-black text-slate-800 mt-0.5 shrink-0">1</span>
                  <span>
                    Tekan tombol <strong>Bagikan (Share)</strong> <Share size={12} className="inline mx-1 text-blue-600" /> di bagian bawah layar Safari Anda.
                  </span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-black text-slate-800 mt-0.5 shrink-0">2</span>
                  <span>
                    Gulir ke bawah dan ketuk opsi <strong>Tambah ke Layar Utama (Add to Home Screen)</strong> <PlusSquare size={12} className="inline mx-1 text-slate-900" />.
                  </span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-black text-slate-800 mt-0.5 shrink-0">3</span>
                  <span>
                    Buka ikon <strong>album kenangan</strong> di halaman utama HP Anda untuk menikmati performa layar penuh yang cepat dan offline-first!
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Default fallback instructions for generic browsers
  return (
    <button
      type="button"
      onClick={() => {
        alert(
          "Untuk mengunduh dan menginstal aplikasi di layar HP/Desktop:\n\n1. Pastikan Anda menggunakan Chrome, Safari, atau Edge.\n2. Klik ikon 'Pasang/Install' di ujung kanan kolom alamat browser Anda (URL bar) atau tekan tombol menu berlambang tiga titik dan pilih 'Tambahkan ke Layar Utama'."
        );
      }}
      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer border border-slate-200"
    >
      <Download size={13} />
      Cara Install di HP
    </button>
  );
};
