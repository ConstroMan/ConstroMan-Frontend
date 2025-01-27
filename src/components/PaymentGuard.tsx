import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getPaymentStatus } from '../services/api';
import { Loader2 } from 'lucide-react';

export function PaymentGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const status = await getPaymentStatus();
      // Only consider "active" status as valid subscription
      // "created" status should still redirect to payment
      setHasActiveSubscription(status.status === "active");
    } catch (error) {
      setHasActiveSubscription(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Redirect to payment if status is not active
  if (!hasActiveSubscription && location.pathname !== '/payment') {
    return <Navigate to="/payment" replace />;
  }

  // Only redirect away from payment page if subscription is active
  if (hasActiveSubscription && location.pathname === '/payment') {
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
} 