import type { SubjectConfig } from '../types/exam';

export const TOKEN_ROTATION_MS = 15 * 60 * 1000;
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function computeTokenForSlot(
  subjectId: string,
  seed: string,
  slot: number
): string {
  const input = `${subjectId}::${seed || 'DUTAWANGI'}::${slot}`;
  let h1 = 2166136261 >>> 0;
  let h2 = 3735928559 >>> 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= ch + ((i * 31) & 0xff);
    h2 = Math.imul(h2, 2654435761) >>> 0;
  }

  let out = '';
  let state = h1 ^ h2;
  for (let i = 0; i < 6; i++) {
    state = (Math.imul(state ^ (i + 7), 1664525) + 1013904223) >>> 0;
    out += TOKEN_ALPHABET[state % TOKEN_ALPHABET.length];
  }
  return out;
}

export function getActiveSubjectToken(
  subject: Pick<SubjectConfig, 'id' | 'token' | 'tokenMode' | 'tokenSeed'>,
  nowMs = Date.now()
): string {
  if (subject.tokenMode !== 'auto_15m') {
    return (subject.token || '').trim().toUpperCase();
  }
  const slot = Math.floor(nowMs / TOKEN_ROTATION_MS);
  return computeTokenForSlot(
    subject.id,
    subject.tokenSeed || subject.token || 'DUTAWANGI',
    slot
  );
}

export function isSubjectTokenValid(
  subject: Pick<SubjectConfig, 'id' | 'token' | 'tokenMode' | 'tokenSeed'>,
  inputToken: string,
  nowMs = Date.now()
): boolean {
  const normalized = inputToken.trim().toUpperCase();
  if (!normalized) return false;

  if (subject.tokenMode !== 'auto_15m') {
    return normalized === (subject.token || '').trim().toUpperCase();
  }

  const slot = Math.floor(nowMs / TOKEN_ROTATION_MS);
  const seed = subject.tokenSeed || subject.token || 'DUTAWANGI';
  const current = computeTokenForSlot(subject.id, seed, slot);
  if (normalized === current) return true;

  // Allow 60-second grace overlap at boundary transition so students typing just before rotation aren't rejected
  const elapsedInSlot = nowMs % TOKEN_ROTATION_MS;
  if (elapsedInSlot < 60_000) {
    const previous = computeTokenForSlot(subject.id, seed, slot - 1);
    return normalized === previous;
  }
  return false;
}

export function getTokenSecondsRemaining(nowMs = Date.now()): number {
  const remainingMs = TOKEN_ROTATION_MS - (nowMs % TOKEN_ROTATION_MS);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function formatTokenCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
