import { useCallback, useEffect, useRef, useState } from 'react';

import { emptyEntry } from '../../shared/work.js';
import { ApiError, api } from './api.js';

const TEXT_SAVE_DELAY_MS = 600;

export function useWork(initialWork) {
  const [work, setWork] = useState(initialWork);
  const [saveState, setSaveState] = useState('saved');
  const pendingRef = useRef(new Map());
  const timerRef = useRef(null);
  const inFlightRef = useRef(null);

  const flush = useCallback(({ keepalive = false } = {}) => {
    window.clearTimeout(timerRef.current);
    if (inFlightRef.current) return inFlightRef.current;
    if (pendingRef.current.size === 0) return Promise.resolve();
    setSaveState('saving');
    const batch = [...pendingRef.current.entries()];
    pendingRef.current.clear();
    const run = sendBatch(batch, pendingRef.current, keepalive).then(async ({ failed, rejected }) => {
      if (rejected) await resync();
      inFlightRef.current = null;
      if (failed) {
        setSaveState('error');
        return undefined;
      }
      if (pendingRef.current.size > 0) return flush();
      setSaveState(rejected ? 'rejected' : 'saved');
      return undefined;
    });
    inFlightRef.current = run;
    return run;
  }, []);

  const updateCase = useCallback(
    (caseId, patch, { debounce = false } = {}) => {
      setWork((current) => ({
        ...current,
        cases: {
          ...current.cases,
          [caseId]: { ...(current.cases[caseId] ?? emptyEntry()), ...patch },
        },
      }));
      pendingRef.current.set(caseId, { ...pendingRef.current.get(caseId), ...patch });
      setSaveState('pending');
      window.clearTimeout(timerRef.current);
      if (debounce) {
        timerRef.current = window.setTimeout(() => void flush(), TEXT_SAVE_DELAY_MS);
      } else {
        void flush();
      }
    },
    [flush]
  );

  // A change the server refused will never save; show what the server has instead.
  async function resync() {
    try {
      const saved = await api.work();
      setWork((current) => ({
        ...saved,
        cases: { ...saved.cases, ...pendingEntries(current, pendingRef.current) },
      }));
    } catch (error) {
      console.error('Reloading saved work failed:', error);
    }
  }

  const resetWork = useCallback(async () => {
    window.clearTimeout(timerRef.current);
    pendingRef.current.clear();
    await inFlightRef.current;
    const next = await api.reset();
    pendingRef.current.clear();
    setWork(next);
    setSaveState('saved');
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush({ keepalive: true });
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.clearTimeout(timerRef.current);
    };
  }, [flush]);

  return { work, saveState, updateCase, retry: flush, resetWork };
}

function pendingEntries(work, pending) {
  return Object.fromEntries([...pending.keys()].map((caseId) => [caseId, work.cases[caseId]]));
}

function isRejection(error) {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

// A merge can be refused only because an unmerge later in the same batch had not saved yet, so refusals get one more try.
async function sendBatch(batch, pending, keepalive) {
  let failed = false;
  const refused = [];
  for (const [caseId, patch] of batch) {
    try {
      await api.patchCase(caseId, patch, { keepalive });
    } catch (error) {
      if (isRejection(error)) {
        refused.push([caseId, patch]);
      } else {
        console.error(`Saving ${caseId} failed:`, error);
        failed = true;
        pending.set(caseId, { ...patch, ...pending.get(caseId) });
      }
    }
  }
  let rejected = false;
  for (const [caseId, patch] of refused) {
    try {
      await api.patchCase(caseId, patch, { keepalive });
    } catch (error) {
      console.error(`Saving ${caseId} failed again:`, error);
      if (isRejection(error)) {
        rejected = true;
      } else {
        failed = true;
        pending.set(caseId, { ...patch, ...pending.get(caseId) });
      }
    }
  }
  return { failed, rejected };
}
