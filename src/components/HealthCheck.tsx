import { useEffect } from 'react';
import { checkBackendHealth } from '../services/api';

export const HealthCheck = () => {
  useEffect(() => {
    const interval = setInterval(async () => {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        window.location.reload();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return null;
}; 