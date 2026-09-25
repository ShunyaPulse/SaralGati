'use client';

import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children, footer }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        // Purely presentational backdrop: the dialog inside carries the semantics.
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative z-50 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl transition-all m-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">{title}</h2>
            {description && <p id={descriptionId} className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8]"
          >
            <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>
        
        <div className="my-4">
          {children}
        </div>
        
        {footer && (
          <div className="mt-6 flex justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
