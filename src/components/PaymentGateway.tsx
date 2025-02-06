import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/Button';
import { getPaymentStatus, initiateSubscription, verifyPayment } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from '../utils/theme';
import { Loader2, CreditCard, Shield } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlanOption {
  users: number;
  monthlyPrice: number;
  yearlyPrice: number;
}

export function PaymentGateway() {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTier, setSelectedTier] = useState<number>(5);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme } = useTheme();
  const { showToast } = useToast();
  const themeStyles = themes[currentTheme];

  const planOptions: PlanOption[] = [
    {
      users: 5,
      monthlyPrice: 6499,
      yearlyPrice: Math.round(6499 * 12 * 0.9) // 10% discount
    },
    {
      users: 8,
      monthlyPrice: 7499,
      yearlyPrice: Math.round(7499 * 12 * 0.9)
    },
    {
      users: 10,
      monthlyPrice: 8499,
      yearlyPrice: Math.round(8499 * 12 * 0.9)
    }
  ];

  useEffect(() => {
    checkPaymentStatus();
    loadRazorpayScript();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      console.log('Checking payment status...');
      const status = await getPaymentStatus();
      console.log('Payment status response:', status);
      
      if (status.status === "active") {
        console.log('Status is active, redirecting to /projects');
        navigate('/projects', { replace: true });
        return;
      }
      console.log('Status is not active, showing payment page');
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setIsLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const handleSubscription = async () => {
    try {
      setIsProcessing(true);
      const orderData = await initiateSubscription(selectedPlan, selectedTier);
      
      const selectedPlanData = planOptions.find(plan => plan.users === selectedTier);
      const amount = selectedPlan === 'monthly' 
        ? selectedPlanData?.monthlyPrice 
        : selectedPlanData?.yearlyPrice;

      const options = {
        key: orderData.key,
        amount: amount,
        currency: orderData.currency,
        name: 'ConstroMan',
        description: `${selectedTier} Users - ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Subscription`,
        order_id: orderData.order_id,
        image: '/logo.png',
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            
            showToast('Payment successful! Welcome to ConstroMan', 'success');
            
            navigate('/projects', { replace: true });
          } catch (error) {
            console.error('Payment verification failed:', error);
            showToast('Payment verification failed. Please contact support.', 'error');
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          email: orderData.company_email,
          contact: orderData.company_contact
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsProcessing(false);
          }
        },
        theme: {
          color: '#10B981'
        }
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', (response: any) => {
        showToast('Payment failed. Please try again.', 'error');
        console.error('Payment failed:', response.error);
        setIsProcessing(false);
      });

      razorpay.open();
    } catch (error) {
      console.error('Payment initiation failed:', error);
      showToast('Failed to initiate payment. Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${themeStyles.background}`}>
      <div className="fixed top-4 left-0 w-72">
        <img 
          src={currentTheme === 'dark' 
            ? '/src/assets/images/Logo_Full_Dark_Mode-removebg-preview.png'
            : '/src/assets/images/Logo_Full_Light_mode-removebg-preview.png'
          } 
          alt="ConstroMan Logo" 
          className="w-full h-auto"
        />
      </div>

      <div className={`max-w-2xl w-full p-8 ${themeStyles.cardBg} rounded-xl shadow-xl`}>
        <div className="text-center mb-8">
          <CreditCard className={`h-12 w-12 mx-auto mb-4 ${themeStyles.text}`} />
          <h2 className={`text-2xl font-bold ${themeStyles.text}`}>
            Subscribe to ConstroMan
          </h2>
          <p className={`mt-2 ${themeStyles.subtext}`}>
            Get full access to all features
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`px-6 py-2 rounded-full transition-all duration-200 ${
                selectedPlan === 'monthly' 
                  ? 'bg-teal-600 text-white shadow-lg scale-105' 
                  : `${themeStyles.borderColor} border hover:border-teal-600`
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`px-6 py-2 rounded-full transition-all duration-200 ${
                selectedPlan === 'yearly' 
                  ? 'bg-teal-600 text-white shadow-lg scale-105' 
                  : `${themeStyles.borderColor} border hover:border-teal-600`
              }`}
            >
              Yearly (10% off)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planOptions.map((plan) => (
              <div
                key={plan.users}
                onClick={() => setSelectedTier(plan.users)}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-xl relative ${
                  selectedTier === plan.users 
                    ? 'border-teal-600 shadow-lg transform -translate-y-2 bg-teal-50 dark:bg-teal-900/10' 
                    : `${themeStyles.borderColor} hover:border-teal-600 hover:-translate-y-1`
                }`}
              >
                {plan.users === 8 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Recommended
                  </div>
                )}
                <h3 className={`text-xl font-bold ${themeStyles.text} mb-4 ${
                  selectedTier === plan.users ? 'text-teal-600' : ''
                }`}>
                  {plan.users} Users
                </h3>
                <div className={`${themeStyles.text} text-2xl font-bold mb-2`}>
                  ₹{selectedPlan === 'monthly' ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12)}
                  <span className={`${themeStyles.subtext} text-sm`}>
                    /month
                  </span>
                </div>
                {selectedPlan === 'yearly' && (
                  <>
                    <div className={`${themeStyles.subtext} text-sm mb-2`}>
                      Total: ₹{plan.yearlyPrice} /year
                    </div>
                    <div className="text-teal-600 text-sm mb-4">
                      Save ₹{Math.round(plan.monthlyPrice * 12 * 0.1)} yearly
                    </div>
                  </>
                )}
                <ul className={`space-y-3 ${themeStyles.subtext}`}>
                  <li className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-teal-500" />
                    Unlimited Projects
                  </li>
                  <li className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-teal-500" />
                    AI-Powered Analytics
                  </li>
                  <li className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-teal-500" />
                    Priority Support
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubscription}
          disabled={isProcessing}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </div>
          ) : (
            `Subscribe Now - ₹${
              selectedPlan === 'monthly'
                ? planOptions.find(p => p.users === selectedTier)?.monthlyPrice
                : Math.round(planOptions.find(p => p.users === selectedTier)?.yearlyPrice || 0)
            }/${selectedPlan === 'monthly' ? 'month' : 'year'}`
          )}
        </Button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Secured by Razorpay
        </p>
      </div>
    </div>
  );
} 