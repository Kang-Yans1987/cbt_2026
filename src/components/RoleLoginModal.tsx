import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import type {
  AccessCredentials,
  AdminSectionId,
  TeacherAccount,
} from '../types/exam';
import { DEFAULT_TEACHER_ALLOWED_MENUS } from './admin/TeachersManagerTab';

export interface AuthenticatedActor {
  role: 'admin' | 'teacher' | 'proctor';
  displayName: string;
  teacherId?: string;
  subjectSpecialty?: string;
  allowedMenus?: AdminSectionId[];
}

interface RoleLoginModalProps {
  role: 'admin' | 'proctor' | null;
  expectedCredentials: AccessCredentials;
  teacherAccounts?: TeacherAccount[];
  onSuccess: (actor: AuthenticatedActor) => void;
  onClose: () => void;
}

export const RoleLoginModal: React.FC<RoleLoginModalProps> = ({
  role,
  expectedCredentials,
  teacherAccounts = [],
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

  const isAdmin = role === 'admin';
  const title = isAdmin
    ? 'Masuk Panel Admin & Guru'
    : 'Masuk Ruang Pengawas / Proktor';
  const subtitle = isAdmin
    ? 'Masukkan username dan password Administrator atau akun Guru yang terdaftar.'
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

    if (isAdmin) {
      if (
        inputUser.toLowerCase() ===
          expectedCredentials.username.trim().toLowerCase() &&
        inputPass === expectedCredentials.password
      ) {
        onSuccess({ role: 'admin', displayName: 'Administrator Sekolah' });
        return;
      }

      const matchedTeacher = teacherAccounts.find(
        (t) =>
          t.username.trim().toLowerCase() === inputUser.toLowerCase() &&
          t.password === inputPass
      );

      if (matchedTeacher) {
        if (!matchedTeacher.active) {
          setError(
            'Akun guru ini sedang dinonaktifkan. Hubungi Administrator sekolah.'
          );
          return;
        }
        onSuccess({
          role: 'teacher',
          displayName: matchedTeacher.name,
          teacherId: matchedTeacher.id,
          subjectSpecialty: matchedTeacher.subjectSpecialty,
          allowedMenus:
            matchedTeacher.allowedMenus &&
            matchedTeacher.allowedMenus.length > 0
              ? matchedTeacher.allowedMenus
              : DEFAULT_TEACHER_ALLOWED_MENUS,
        });
        return;
      }

      setError('Username atau password Admin/Guru tidak sesuai.');
      return;
    }

    if (
      inputUser.toLowerCase() !==
        expectedCredentials.username.trim().toLowerCase() ||
      inputPass !== expectedCredentials.password
    ) {
      setError('Username atau password pengawas tidak sesuai.');
      return;
    }

    onSuccess({ role: 'proctor', displayName: 'Pengawas / Proktor' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-login-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isAdmin ? 'bg-slate-900 text-white' : 'bg-blue-700 text-white'
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
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
              placeholder={isAdmin ? 'Username admin / guru' : 'Username pengawas'}
              className="mt-1.5 w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
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
                className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white py-2 pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`min-h-[40px] rounded-xl px-5 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] ${
                isAdmin
                  ? 'bg-slate-900 hover:bg-slate-800'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {isAdmin ? 'Masuk Admin & Guru' : 'Masuk Pengawas'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
