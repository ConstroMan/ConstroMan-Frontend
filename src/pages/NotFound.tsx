import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';

export function NotFound() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`max-w-md w-full p-8 rounded-lg shadow-lg ${
        currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h1 className={`text-3xl font-bold mb-4 ${
          currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Page Not Found
        </h1>
        <p className={`mb-6 ${
          currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex-1"
          >
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="primary"
            className="flex-1"
          >
            Home
          </Button>
        </div>
      </div>
    </div>
  );
} 