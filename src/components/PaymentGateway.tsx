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

export function PaymentGateway() {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme } = useTheme();
  const { showToast } = useToast();
  const themeStyles = themes[currentTheme];

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
      const orderData = await initiateSubscription();
      
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ConstroMan',
        description: 'Monthly Subscription',
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

      <div className={`max-w-md w-full p-8 ${themeStyles.cardBg} rounded-xl shadow-xl`}>
        <div className="text-center mb-8">
          <CreditCard className={`h-12 w-12 mx-auto mb-4 ${themeStyles.text}`} />
          <h2 className={`text-2xl font-bold ${themeStyles.text}`}>
            Subscribe to ConstroMan
          </h2>
          <p className={`mt-2 ${themeStyles.subtext}`}>
            Get full access to all features
          </p>
        </div>

        <div className={`border-t border-b ${themeStyles.borderColor} py-6 my-6`}>
          <div className="flex justify-between items-center mb-4">
            <span className={themeStyles.text}>Monthly Subscription</span>
            <div className="text-right">
              <span className={`font-bold ${themeStyles.text} text-2xl`}>₹8,499</span>
              <span className={`${themeStyles.subtext} text-sm`}>/month</span>
            </div>
          </div>
          
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
            'Subscribe Now'
          )}
        </Button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Secured by Razorpay
        </p>
      </div>
    </div>
  );
} 