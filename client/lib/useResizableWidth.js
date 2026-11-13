import { useCallback, useRef, useState } from 'react';

const KEY_STEP = 24;

function readStored(key, fallback) {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch (error) {
    console.warn(`Reading ${key} from local storage failed:`, error);
    return fallback;
  }
}

function store(key, value) {
  try {
    window.localStorage.setItem(key, String(Math.round(value)));
  } catch (error) {
    console.warn(`Saving ${key} to local storage failed:`, error);
  }
}

/**
 * A panel width the user drags or steps with the arrow keys. `edge` says which side of the
 * panel the handle sits on, so dragging away from the panel always makes it wider.
 */
export function useResizableWidth({ storageKey, initial, min, max, edge }) {
  const clamp = useCallback((value) => Math.min(max, Math.max(min, value)), [min, max]);
  const [width, setWidth] = useState(() => clamp(readStored(storageKey, initial)));
  const dragRef = useRef(null);
  const direction = edge === 'right' ? 1 : -1;

  const commit = useCallback(
    (value) => {
      const next = clamp(value);
      setWidth(next);
      store(storageKey, next);
    },
    [clamp, storageKey]
  );

  const handleProps = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': 'vertical',
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': Math.round(width),
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { startX: event.clientX, startWidth: width };
    },
    onPointerMove: (event) => {
      if (!dragRef.current) return;
      const delta = (event.clientX - dragRef.current.startX) * direction;
      setWidth(clamp(dragRef.current.startWidth + delta));
    },
    onPointerUp: (event) => {
      if (!dragRef.current) return;
      const delta = (event.clientX - dragRef.current.startX) * direction;
      commit(dragRef.current.startWidth + delta);
      dragRef.current = null;
    },
    onDoubleClick: () => commit(initial),
    onKeyDown: (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const step = (event.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP) * direction;
      commit(width + step);
    },
  };

  return { width, handleProps };
}
