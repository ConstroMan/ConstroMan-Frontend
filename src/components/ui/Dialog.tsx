import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export const Dialog: React.FC<DialogProps> & {
  Trigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>;
  Content: React.FC<{ children: React.ReactNode; className?: string }>;
  Overlay: React.FC<{ className?: string }>;
  Header: React.FC<{ children: React.ReactNode; className?: string }>;
  Title: React.FC<{ children: React.ReactNode; className?: string }>;
  Description: React.FC<{ children: React.ReactNode; className?: string }>;
  Footer: React.FC<{ children: React.ReactNode; className?: string }>;
} = ({ children, open, onOpenChange }) => (
  <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" 
      onClick={() => onOpenChange(false)} 
    />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      {children}
    </div>
  </div>
);

Dialog.Trigger = ({ children, asChild }) => (
  <>{asChild ? children : <button>{children}</button>}</>
);

Dialog.Content = ({ children, className = '' }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 10 }}
    transition={{ 
      type: "spring",
      stiffness: 350,
      damping: 25
    }}
    className={`relative rounded-xl shadow-2xl p-6 w-full max-w-md backdrop-blur-sm overflow-hidden ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none opacity-50 z-0"></div>
    <div className="relative z-10">{children}</div>
  </motion.div>
);

Dialog.Header = ({ children, className = '' }) => (
  <div className={`mb-5 ${className}`}>{children}</div>
);

Dialog.Title = ({ children, className = '' }) => (
  <h2 className={`text-xl font-semibold tracking-tight ${className}`}>{children}</h2>
);

Dialog.Description = ({ children, className = '' }) => (
  <p className={`text-sm mt-2 opacity-90 ${className}`}>{children}</p>
);

Dialog.Footer = ({ children, className = '' }) => (
  <div className={`mt-6 flex justify-end gap-3 ${className}`}>{children}</div>
);

Dialog.Overlay = ({ className = '' }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] ${className}`} 
  />
);
