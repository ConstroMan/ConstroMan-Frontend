import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { CompanyLogin } from './components/CompanyLogin'
import { CompanySignup } from './components/CompanySignup'
import { ProjectSelector } from './components/ProjectSelector'
import { ProjectDetails } from './components/ProjectDetails'
import { PaymentGateway } from './components/PaymentGateway'
import { PaymentGuard } from './components/PaymentGuard'
import Chat from './components/Chat'
import './index.css'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { NotFound } from './pages/NotFound'
import { Login } from './components/Login'
import { Signup } from './components/Signup'

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AnimatePresence mode="wait" initial={false}>
          <Router>
            <div className="min-h-screen">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<CompanyLogin />} />
                <Route path="/company-login" element={<CompanyLogin />} />
                <Route path="/company-signup" element={<CompanySignup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/payment" element={<PaymentGateway />} />

                {/* Protected routes that require payment */}
                <Route
                  path="/projects"
                  element={
                    <PaymentGuard>
                      <ProjectSelector />
                    </PaymentGuard>
                  }
                />
                <Route
                  path="/project/:projectId"
                  element={
                    <PaymentGuard>
                      <ProjectDetails />
                    </PaymentGuard>
                  }
                />
                <Route
                  path="/chat/:projectId"
                  element={
                    <PaymentGuard>
                      <Chat />
                    </PaymentGuard>
                  }
                />

                {/* Add this as the last route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Router>
        </AnimatePresence>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
