import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn.js';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className = ""
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
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

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={cn(
          "modal-content",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger"
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const buttonClasses = {
    danger: "btn-danger",
    primary: "btn-primary",
    secondary: "btn-secondary"
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        <div className="text-center">
          <div className={cn(
            "w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center",
            variant === 'danger' ? "bg-red-50" : "bg-primary-50"
          )}>
            <div className={cn(
              "w-6 h-6",
              variant === 'danger' ? "text-red-600" : "text-primary-600"
            )}>
              ⚠️
            </div>
          </div>
          <p className="text-gray-700">{message}</p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={buttonClasses[variant]}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
