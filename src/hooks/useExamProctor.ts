import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProctorActionPayload, ViolationLog } from '../types/exam';

interface UseExamProctorOptions {
  enabled: boolean;
  suspendDetection?: boolean;
  maxViolations: number;
  initialViolations?: number;
  initialLogs?: ViolationLog[];
  onMaxViolationsReached: () => void;
  onAdminForceEnd: (message: string) => void;
  onAnnouncement: (message: string) => void;
  onProctorAction?: (payload: ProctorActionPayload) => void;
  participantNumber: string;
  subjectId: string;
}

export function useExamProctor({
  enabled,
  suspendDetection = false,
  maxViolations,
  initialViolations = 0,
  initialLogs = [],
  onMaxViolationsReached,
  onAdminForceEnd,
  onAnnouncement,
  onProctorAction,
  participantNumber,
  subjectId,
}: UseExamProctorOptions) {
  const [violationCount, setViolationCount] = useState(initialViolations);
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>(initialLogs);
  const [warningModal, setWarningModal] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );

  const lastViolationAtRef = useRef<number>(0);
  const triggeredMaxRef = useRef(false);
  const suspendRef = useRef(suspendDetection);
  suspendRef.current = suspendDetection;

  const resetLock = useCallback(() => {
    triggeredMaxRef.current = false;
    setViolationCount(0);
    setWarningModal(null);
  }, []);

  const recordViolation = useCallback(
    (reason: string) => {
      if (!enabled || suspendRef.current || triggeredMaxRef.current) return;
      const now = Date.now();
      // Debounce burst events (e.g. blur + visibilitychange firing together within 1.2s)
      if (now - lastViolationAtRef.current < 1200) return;
      lastViolationAtRef.current = now;

      setViolationLogs((prev) => [
        ...prev,
        { timestamp: new Date().toISOString(), reason },
      ]);
      setViolationCount((prev) => {
        const next = prev + 1;
        if (next >= maxViolations) {
          triggeredMaxRef.current = true;
          setWarningModal(
            `Pelanggaran ke-${next} (${reason}). Batas maksimal tercapai, ujian dikunci dan dikirim otomatis.`
          );
          setTimeout(() => {
            onMaxViolationsReached();
          }, 900);
        } else {
          setWarningModal(
            `Peringatan Keamanan (${next}/${maxViolations}): ${reason}. Dilarang membuka tab baru atau meninggalkan jendela ujian.`
          );
        }
        return next;
      });
    },
    [enabled, maxViolations, onMaxViolationsReached]
  );

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      // Browser may block fullscreen if not triggered by user gesture
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) {
        recordViolation('Berpindah tab atau meminimalkan browser');
      }
    };

    const handleBlur = () => {
      recordViolation('Membuka jendela/aplikasi lain atau tab baru');
    };

    const handleFullscreenChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (!fs) {
        recordViolation('Keluar dari mode layar penuh (Fullscreen)');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleClipboard = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextArea =
        target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT';
      if (!isTextArea || e.type === 'copy' || e.type === 'cut') {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const blockedCtrl =
        (e.ctrlKey || e.metaKey) &&
        ['t', 'n', 'w', 'u', 'p', 'c', 'x', 's'].includes(key);
      const blockedDevTools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          ['i', 'j', 'c'].includes(key));

      if (blockedCtrl || blockedDevTools) {
        e.preventDefault();
        recordViolation(`Percobaan pintasan terlarang (${e.key.toUpperCase()})`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleClipboard);
    document.addEventListener('cut', handleClipboard);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('cut', handleClipboard);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, recordViolation]);

  // Real-time SSE listener for admin/proctor force-end, announcements, or targeted actions
  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource(
      `/api/proctor/stream?role=student&participantNumber=${encodeURIComponent(
        participantNumber
      )}`
    );

    es.addEventListener('EXAM_ENDED_BY_ADMIN', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          subjectId?: string;
          message?: string;
        };
        if (!data.subjectId || data.subjectId === subjectId) {
          onAdminForceEnd(
            data.message ||
              'Ujian telah diakhiri secara real-time oleh Pengawas/Admin.'
          );
        }
      } catch {
        onAdminForceEnd('Ujian telah diakhiri oleh Pengawas/Admin.');
      }
    });

    es.addEventListener('ANNOUNCEMENT', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          subjectId?: string;
          message?: string;
        };
        if ((!data.subjectId || data.subjectId === subjectId) && data.message) {
          onAnnouncement(data.message);
        }
      } catch {
        // ignore malformed event
      }
    });

    es.addEventListener('PROCTOR_ACTION', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as ProctorActionPayload;
        const matchesParticipant =
          data.participantNumber === participantNumber ||
          data.participantNumber === 'ALL';
        const matchesSubject =
          !data.subjectId || data.subjectId === subjectId;
        if (matchesParticipant && matchesSubject && onProctorAction) {
          if (data.action === 'UNLOCK_STUDENT') {
            resetLock();
          }
          onProctorAction(data);
        }
      } catch {
        // ignore malformed event
      }
    });

    return () => {
      es.close();
    };
  }, [
    enabled,
    participantNumber,
    subjectId,
    onAdminForceEnd,
    onAnnouncement,
    onProctorAction,
    resetLock,
  ]);

  return {
    violationCount,
    violationLogs,
    warningModal,
    dismissWarning: () => setWarningModal(null),
    isFullscreen,
    requestFullscreen,
    resetLock,
  };
}
