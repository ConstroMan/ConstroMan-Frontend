import React, { useState, useEffect } from 'react'
import { Button } from './ui/Button.tsx'
import { Input } from './ui/Input.tsx'
import { signup, companySignup, getCompanies, sendVerificationCode, verifyCode } from '../services/api.ts'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import { themes } from '../utils/theme'
import { useToast } from '../contexts/ToastContext'
import { ERROR_MESSAGES } from '../constants/errorMessages'

interface SignupResponse {
  message: string;
  temp_id: string;
  verification_required: boolean;
  company_contact: string;
}

export const Signup: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [designation, setDesignation] = useState('')
  const [error, setError] = useState('')
  const [isCompanySignup, setIsCompanySignup] = useState(false)
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Array<{ id: number; name: string }>>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { currentTheme, setCurrentTheme } = useTheme()
  const themeStyles = themes[currentTheme]
  const { showToast } = useToast()
  const [showOtpVerification, setShowOtpVerification] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [entityId, setEntityId] = useState<number | null>(null)
  const [verificationContact, setVerificationContact] = useState('')
  const [tempId, setTempId] = useState<string>('')
  const [companyContact, setCompanyContact] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companiesData = await getCompanies()
        setCompanies(companiesData)
      } catch (err) {
        console.error('Error fetching companies:', err)
        setError('Failed to load companies. Please try again.')
      }
    }

    if (!isCompanySignup) {
      fetchCompanies()
    }
  }, [isCompanySignup])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const selectedCompany = companies.find(c => c.name === company);
      if (!selectedCompany) {
        setError('Please select a valid company');
        return;
      }

      const response = await signup({
        name,
        email,
        password,
        company_id: selectedCompany.id,
        contact,
        designation
      });

      // Response is directly the data object
      setTempId(response.temp_id);
      setCompanyContact(response.company_contact);
      setShowOtpVerification(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to sign up', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('Raw company contact:', companyContact);
      console.log('Temp ID:', tempId);

      // Clean the phone number to get exactly 10 digits
      const cleanedNumber = companyContact.replace(/\D/g, '').slice(-10);
      const formattedContact = `+91${cleanedNumber}`;
      
      console.log('Formatted contact:', formattedContact);
      console.log('Verification payload:', {
        identifier: formattedContact,
        code: otpCode,
        entity_type: 'employee',
        entity_id: tempId,
        type: 'phone'
      });

      await verifyCode({
        identifier: formattedContact,
        code: otpCode,
        entity_type: 'employee',
        entity_id: tempId,
        type: 'phone'
      });
      
      showToast('Verification successful!', 'success');
      navigate('/login');
    } catch (err: any) {
      console.error('Verification error:', err);
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the OTP verification UI
  const renderOtpVerification = () => (
    <AnimatePresence>
      {showOtpVerification && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          <h3 className={`text-center text-xl font-bold ${themeStyles.text}`}>
            Verify Company Contact
          </h3>
          <p className={`text-center text-sm ${themeStyles.subtext}`}>
            We've sent a verification code to company contact number ending in {companyContact}
          </p>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <Input
              id="otp-code"
              name="otp"
              type="text"
              required
              placeholder="Enter verification code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} rounded-full`}
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              className={`w-full ${themeStyles.buttonBg} ${themeStyles.buttonHoverBg} ${themeStyles.buttonText}`}
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <motion.div 
      className={`min-h-screen flex flex-col items-center justify-center ${themeStyles.background}`}
    >
      <div className="mb-1 w-full max-w-md flex justify-center">
        <img 
          src={currentTheme === 'dark' 
            ? '/images/Logo_Full_Dark_Mode-removebg-preview.png'
            : '/images/Logo_Full_Light_mode-removebg-preview.png'
          } 
          alt="ConstroMan Logo" 
          className="w-4/5 h-auto"
        />
      </div>

      <motion.div 
        className={`max-w-md w-full space-y-8 ${themeStyles.cardBg} p-10 rounded-xl shadow-2xl relative`}
      >
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

        <div>
          <h2 className={`text-center text-3xl font-extrabold ${themeStyles.text}`}>
            {isCompanySignup ? "Create your company account" : "Create your ConstroMan account"}
          </h2>
        </div>

        {showOtpVerification ? renderOtpVerification() : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-2">
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} rounded-full`}
              />
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} rounded-full`}
              />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} rounded-full`}
              />
              {!isCompanySignup && (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      className={`w-full px-4 py-2 border rounded-full text-left ${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500`}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      {company || "Select a company"}
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <svg className={`h-5 w-5 ${themeStyles.text}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </button>
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.ul
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className={`absolute z-10 mt-1 w-full ${themeStyles.cardBg} shadow-lg max-h-60 rounded-xl py-1 text-base overflow-auto focus:outline-none sm:text-sm`}
                        >
                          {companies.map((company, index) => (
                            <li
                              key={index}
                              className={`cursor-pointer select-none relative py-2 px-4 ${themeStyles.text} hover:bg-teal-500 hover:text-white transition-colors duration-150`}
                              onClick={() => {
                                setCompany(company.name)
                                setIsDropdownOpen(false)
                              }}
                            >
                              {company.name}
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                  <Input
                    id="contact"
                    name="contact"
                    type="tel"
                    required
                    placeholder="Contact Number"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} rounded-full`}
                  />
                  <Input
                    id="designation"
                    name="designation"
                    type="text"
                    required
                    placeholder="Designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} rounded-full`}
                  />
                </>
              )}
            </div>

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <div>
              <Button 
                type="submit" 
                className={`w-full ${themeStyles.buttonBg} ${themeStyles.buttonHoverBg} ${themeStyles.buttonText}`}
                disabled={isLoading}
              >
                {isLoading ? 'Signing up...' : 'Sign up'}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          <p className={`text-center text-sm ${themeStyles.text}`}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-teal-600 hover:text-teal-500">
              Sign in
            </Link>
          </p>
          <p className={`text-center text-sm ${themeStyles.text}`}>
            <button
              onClick={() => setIsCompanySignup(!isCompanySignup)}
              className="font-medium text-teal-600 hover:text-teal-500"
            >
              {isCompanySignup ? "Switch to Employee Signup" : "Switch to Company Signup"}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}