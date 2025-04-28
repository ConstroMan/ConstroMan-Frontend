import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  title?: string;
}

export const Toast = ({ 
  message, 
  type, 
  onClose, 
  autoClose = true, 
  duration = 5000,
  position = 'bottom',
  title
}: ToastProps) => {
  const colors = {
    success: 'bg-green-100 border-green-500 text-green-700',
    error: 'bg-red-100 border-red-500 text-red-700',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    info: 'bg-blue-100 border-blue-500 text-blue-700'
  };

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const positionStyles = {
    'top': 'top-4 inset-x-0 mx-auto',
    'bottom': 'bottom-4 inset-x-0 mx-auto',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className={`fixed ${positionStyles[position]} w-fit z-50 p-4 rounded-lg border ${colors[type]} shadow-lg max-w-md`}
    >
      <div className="flex items-center">
        <div className="pr-3">
          {type === 'success' && <CheckCircle size={20} />}
          {type === 'error' && <AlertTriangle size={20} />}
          {type === 'warning' && <AlertCircle size={20} />}
          {type === 'info' && <Info size={20} />}
        </div>
        <div className="flex-1">
          {title && <p className="font-bold mb-1">{title}</p>}
          <p className="text-sm">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
      {autoClose && (
        <motion.div 
          className={`h-1 mt-2 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}; 