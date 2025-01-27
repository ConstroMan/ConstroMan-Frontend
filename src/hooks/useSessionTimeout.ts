import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export const useSessionTimeout = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const handleTimeout = () => {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('userType');

      // Show toast message
      showToast(ERROR_MESSAGES.SESSION_TIMEOUT, 'error');

      // Redirect to appropriate login page
      const userType = localStorage.getItem('userType');
      navigate(userType === 'company' ? '/company-login' : '/login');
    };

    // Set up event listener for timeout
    const timeoutId = setTimeout(handleTimeout, 30 * 60 * 1000); // 30 minutes

    // Clean up
    return () => clearTimeout(timeoutId);
  }, [navigate, showToast]);
}; 