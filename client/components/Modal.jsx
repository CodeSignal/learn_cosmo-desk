import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import ModalJS from '../design-system/components/modal/modal.js';

// The design system's Modal mounts a plain element, so children are portalled into it.
export function Modal({ open, onClose, title, size = 'large', children }) {
  const holderRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  if (!holderRef.current && typeof document !== 'undefined') {
    holderRef.current = document.createElement('div');
    holderRef.current.className = 'cd-modal-body';
  }

  useEffect(() => {
    if (!open) return undefined;
    const modal = new ModalJS({
      size,
      title,
      content: holderRef.current,
      footerButtons: null,
      closeButtonLabel: 'Close',
      onClose: () => onCloseRef.current?.(),
    });
    modal.dialog?.classList.add('cd-modal');
    modal.open();
    return () => modal.destroy?.();
  }, [open, title, size]);

  return holderRef.current ? createPortal(children, holderRef.current) : null;
}
