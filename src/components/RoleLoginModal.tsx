import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import type { AccessCredentials } from '../types/exam';

interface RoleLoginModalProps {
  role: 'admin' | 'proctor' | null;
  expectedCredentials: AccessCredentials;
  defaultCredentials: AccessCredentials;
  onSuccess: (role: 'admin' | 'proctor') => void;
  onClose: () => void;
}

export const RoleLoginModal: React.FC<RoleLoginModalProps> = ({
  role,
  expectedCredentials,
  defaultCredentials,
  onSuccess,
  onClose,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setError(null);
  }, [role]);

  if (!role) return null;

  const isUsingDefault =
    expectedCredentials.username === defaultCredentials.username &&
    expectedCredentials.password === defaultCredentials.password;

  const isAdmin = role === 'admin';
  const title = isAdmin
    ? 'Masuk Panel Admin & Guru'
    : 'Masuk Ruang Pengawas / Proktor';
  const subtitle = isAdmin
    ? 'Masukkan username dan password administrator sekolah untuk mengelola soal, sesi, dan pengaturan.'
    : 'Masukkan username dan password pengawas ruang yang telah diatur oleh administrator.';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const inputUser = username.trim();
    const inputPass = password;

    if (!inputUser || !inputPass) {
      setError('Username dan password wajib diisi.');
      return;
    }

    if (
      inputUser.toLowerCase() !== expectedCredentials.username.trim().toLowerCase() ||
      inputPass !== expectedCredentials.password
    ) {
      setError('Username atau password tidak sesuai.');
      return;
    }

    onSuccess(role);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-login-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isAdmin
                  ? 'bg-slate-900 text-white'
                  : 'bg-blue-700 text-white'
              }`}
            >
              {isAdmin ? (
                <KeyRound className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2
                id="role-login-title"
                className="text-base sm:text-lg font-bold text-slate-900"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog login"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Username
            </label>
            <input
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isAdmin ? 'Username admin' : 'Username pengawas'}
              className="mt-1.5 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white py-2 pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? 'Sembunyikan password' : 'Lihat password'
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              {error}
            </div>
          )}

          {isUsingDefault && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
              <span>
                Akun awal: <strong className="font-mono text-slate-900">{defaultCredentials.username}</strong> /{' '}
                <strong className="font-mono text-slate-900">{defaultCredentials.password}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setUsername(defaultCredentials.username);
                  setPassword(defaultCredentials.password);
                  setError(null);
                }}
                className="font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
              >
                Isi Otomatis
              </button>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`min-h-[40px] rounded-lg px-5 py-2 text-xs font-semibold text-white transition-colors ${
                isAdmin
                  ? 'bg-slate-900 hover:bg-slate-800'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {isAdmin ? 'Masuk Admin & Guru' : 'Masuk Pengawas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
