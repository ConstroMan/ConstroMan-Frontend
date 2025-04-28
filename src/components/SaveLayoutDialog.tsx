import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Save } from 'lucide-react';

interface SaveLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void>;
  isLoading?: boolean;
}

export const SaveLayoutDialog: React.FC<SaveLayoutDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}) => {
  const [layoutName, setLayoutName] = useState('');
  const { currentTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const inputElement = document.querySelector('input[id="layout-name-input"]');
        if (inputElement) {
          (inputElement as HTMLInputElement).focus();
        }
      }, 100);
    }
  }, [open]);

  const handleSave = async () => {
    if (!layoutName.trim()) return;
    await onSave(layoutName);
    setLayoutName('');
    onOpenChange(false);
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && layoutName.trim()) {
      handleSave();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Dialog.Content 
              className={`${
                currentTheme === 'light' 
                  ? 'bg-white' 
                  : 'bg-gray-900'
              } shadow-xl border ${
                currentTheme === 'light' 
                  ? 'border-gray-200' 
                  : 'border-gray-800'
              } backdrop-blur-sm`}
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                <Dialog.Header>
                  <div className="flex items-center gap-3 mb-1">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                      className={`p-2 rounded-full ${
                        currentTheme === 'light' 
                          ? 'bg-gray-100' 
                          : 'bg-gray-800'
                      }`}
                    >
                      <Save className={`h-6 w-6 ${
                        currentTheme === 'light' 
                          ? 'text-gray-600' 
                          : 'text-gray-300'
                      }`} />
                    </motion.div>
                    <Dialog.Title className={`text-xl tracking-tight font-semibold ${
                      currentTheme === 'light' 
                        ? 'text-gray-800' 
                        : 'text-gray-100'
                    }`}>
                      Save Dashboard Layout
                    </Dialog.Title>
                  </div>
                  <Dialog.Description className={`text-sm ${
                    currentTheme === 'light' 
                      ? 'text-gray-600' 
                      : 'text-gray-400'
                  }`}>
                    Give your dashboard layout a name to save it for later use.
                  </Dialog.Description>
                </Dialog.Header>

                <div className="mt-6">
                  <div className={`p-0.5 rounded-full ${
                    currentTheme === 'light'
                      ? 'bg-gray-100'
                      : 'bg-gray-800'
                  }`}>
                    <Input
                      id="layout-name-input"
                      placeholder="Layout name"
                      value={layoutName}
                      onChange={(e) => setLayoutName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={`w-full transition-all duration-300 text-base ${
                        currentTheme === 'light'
                          ? 'bg-white border border-gray-300 focus:border-gray-400 text-gray-800 caret-gray-800'
                          : 'bg-gray-900 border border-gray-700 focus:border-gray-600 text-white caret-gray-400'
                      } rounded-full px-6 py-3.5 focus:ring-2 focus:ring-gray-200/20 focus:outline-none`}
                      style={{ caretColor: currentTheme === 'light' ? '#4b5563' : '#9ca3af' }}
                    />
                  </div>
                </div>

                <Dialog.Footer className="mt-8 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className={`px-5 py-2 rounded-full ${
                      currentTheme === 'light'
                        ? 'hover:bg-gray-100 border-gray-300'
                        : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!layoutName.trim() || isLoading}
                    className={`px-5 py-2 rounded-full ${
                      currentTheme === 'light'
                        ? 'bg-gray-700 hover:bg-gray-800 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-white'
                    } transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60`}
                  >
                    {isLoading ? 'Saving...' : 'Save Layout'}
                  </Button>
                </Dialog.Footer>
              </motion.div>
            </Dialog.Content>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}; 