import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './ui/Button.tsx'
import { Input } from './ui/Input.tsx'
import { motion } from 'framer-motion'
import { companySignup } from '../services/api.ts'
import { Sun, Moon } from 'lucide-react'
import { Theme, themes } from '../utils/theme'
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export const CompanySignup: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    contact: '',
    address: '',
    officePhone: '',
    website: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { currentTheme, setCurrentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  const navigate = useNavigate();
  const { showToast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    if (!isLongEnough) return "Password must be at least 8 characters long";
    if (!hasUpperCase) return "Password must contain at least one uppercase letter";
    if (!hasLowerCase) return "Password must contain at least one lowercase letter";
    if (!hasNumbers) return "Password must contain at least one number";
    if (!hasSpecialChar) return "Password must contain at least one special character";
    return "";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    switch (name) {
      case 'email':
        if (!value) {
          setErrors(prev => ({ ...prev, email: 'Email is required' }));
        } else if (!validateEmail(value)) {
          setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
        } else {
          setErrors(prev => ({ ...prev, email: '' }));
        }
        break;

      case 'password':
        const passwordError = validatePassword(value);
        setErrors(prev => ({ ...prev, password: passwordError }));
        // Also validate confirm password if it exists
        if (formData.confirmPassword) {
          setErrors(prev => ({
            ...prev,
            confirmPassword: value !== formData.confirmPassword ? 'Passwords do not match' : ''
          }));
        }
        break;

      case 'confirmPassword':
        setErrors(prev => ({
          ...prev,
          confirmPassword: value !== formData.password ? 'Passwords do not match' : ''
        }));
        break;

      case 'contact':
        if (!value) {
          setErrors(prev => ({ ...prev, contact: 'Contact number is required' }));
        } else if (!/^\+?[\d\s-]{10,}$/.test(value)) {
          setErrors(prev => ({ ...prev, contact: 'Please enter a valid contact number' }));
        } else {
          setErrors(prev => ({ ...prev, contact: '' }));
        }
        break;

      case 'name':
        if (!value.trim()) {
          setErrors(prev => ({ ...prev, name: 'Company name is required' }));
        } else {
          setErrors(prev => ({ ...prev, name: '' }));
        }
        break;

      case 'address':
        if (!value.trim()) {
          setErrors(prev => ({ ...prev, address: 'Office address is required' }));
        } else {
          setErrors(prev => ({ ...prev, address: '' }));
        }
        break;

      default:
        if (errors[name]) {
          setErrors(prev => ({ ...prev, [name]: '' }));
        }
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Company name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Contact validation
    if (!formData.contact) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.contact)) {
      newErrors.contact = 'Please enter a valid contact number';
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Office address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await companySignup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        contact: formData.contact,
        address: formData.address,
        office_phone: formData.officePhone,
        website: formData.website
      });
      showToast('Registration successful! Please log in.', 'success');
      navigate('/company-login');
    } catch (err: any) {
      showToast(err.message || ERROR_MESSAGES.VALIDATION_ERROR, 'error');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${themeStyles.background}`}>
      {/* Logo above dialog */}
      <div className="mb-8">
        <img src="Logo.png" alt="ConstroMan Logo" className="h-16 w-auto" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`max-w-md w-full space-y-8 ${themeStyles.cardBg} p-10 rounded-xl shadow-2xl relative`}
      >
        {/* Theme Toggle Button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
            className={`w-10 h-10 rounded-full ${themeStyles.cardBg} shadow-lg flex items-center justify-center`}
          >
            <motion.div
              initial={false}
              animate={{
                rotate: currentTheme === 'light' ? 0 : 180,
                scale: currentTheme === 'light' ? 1 : 0
              }}
              transition={{ duration: 0.3 }}
              className="absolute"
            >
              <Sun className={themeStyles.subtext} />
            </motion.div>
            <motion.div
              initial={false}
              animate={{
                rotate: currentTheme === 'light' ? -180 : 0,
                scale: currentTheme === 'light' ? 0 : 1
              }}
              transition={{ duration: 0.3 }}
              className="absolute"
            >
              <Moon className={themeStyles.subtext} />
            </motion.div>
          </button>
        </div>

        <div className="space-y-6">
          <h2 className={`text-center text-3xl font-extrabold ${themeStyles.text}`}>
            Create Company Account
          </h2>
          <p className={`text-center text-sm ${themeStyles.subtext}`}>
            Sign up your company for ConstroMan
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <Input
              id="company-name"
              name="name"
              type="text"
              required
              placeholder="Company Name"
              value={formData.name}
              onChange={handleInputChange}
              className={`${themeStyles.inputBg} ${themeStyles.text} ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}

            <Input
              id="email-address"
              name="email"
              type="email"
              required
              placeholder="Email address"
              value={formData.email}
              onChange={handleInputChange}
              className={`${themeStyles.inputBg} ${themeStyles.text} ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}

            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className={`${themeStyles.inputBg} ${themeStyles.text} ${errors.password ? 'border-red-500' : ''}`}
            />
            {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}

            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`${themeStyles.inputBg} ${themeStyles.text} ${errors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}

            <Input
              id="contact"
              name="contact"
              type="tel"
              required
              placeholder="Contact Number"
              value={formData.contact}
              onChange={handleInputChange}
              className={`${themeStyles.inputBg} ${themeStyles.text} ${errors.contact ? 'border-red-500' : ''}`}
            />
            {errors.contact && <p className="text-red-500 text-xs">{errors.contact}</p>}

            <Input
              id="address"
              name="address"
              type="text"
              required
              placeholder="Office Address"
              value={formData.address}
              onChange={handleInputChange}
              className={`${themeStyles.inputBg} ${themeStyles.text} ${errors.address ? 'border-red-500' : ''}`}
            />
            {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}

            <Input
              id="office-phone"
              name="officePhone"
              type="tel"
              placeholder="Office Phone (Optional)"
              value={formData.officePhone}
              onChange={handleInputChange}
              className={`${themeStyles.inputBg} ${themeStyles.text}`}
            />

            <Input
              id="website"
              name="website"
              type="url"
              placeholder="Company Website (Optional)"
              value={formData.website}
              onChange={handleInputChange}
              className={`${themeStyles.inputBg} ${themeStyles.text}`}
            />
          </div>

          <div>
            <Button 
              type="submit" 
              className={`w-full ${themeStyles.buttonBg} ${themeStyles.buttonHoverBg} ${themeStyles.buttonText}`}
            >
              Sign up
            </Button>
          </div>
        </form>
        
        <div className="space-y-2">
          <p className={`text-center text-sm ${themeStyles.subtext}`}>
            Already have an account?{' '}
            <Link 
              to="/company-login" 
              className={`font-medium ${themeStyles.linkColor} ${themeStyles.linkHoverColor}`}
            >
              Sign in
            </Link>
          </p>
          <p className={`text-center text-sm ${themeStyles.subtext}`}>
            <Link 
              to="/signup" 
              className={`font-medium ${themeStyles.linkColor} ${themeStyles.linkHoverColor}`}
            >
              Employee Signup
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
