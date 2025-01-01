import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Login } from './components/Login.tsx'
import { Signup } from './components/Signup.tsx'
import { CompanyLogin } from './components/CompanyLogin.tsx'
import { CompanySignup } from './components/CompanySignup.tsx'
import { ProjectSelector } from './components/ProjectSelector.tsx'
import { ProjectDetails } from './components/ProjectDetails'
import './index.css'
import Chat from './components/Chat.tsx'
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AnimatePresence mode="wait">
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Routes>
              <Route path="/company-login" element={<CompanyLogin />} />
              <Route path="/company-signup" element={<CompanySignup />} />
              <Route path="/projects" element={<ProjectSelector />} />
              <Route path="/project/:projectId" element={<ProjectDetails />} />
              <Route path="/chat/:projectId" element={<Chat />} />
              <Route path="/" element={<CompanyLogin />} />
            </Routes>
          </div>
        </Router>
      </AnimatePresence>
    </ThemeProvider>
  )
}

export default App
