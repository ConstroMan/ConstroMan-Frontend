import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const { currentTheme } = useTheme();
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };
  
  const logoSrc = currentTheme === 'light' 
    ? '/images/Logo-removebg.png'
    : '/images/Logo_Dark_mode-removebg-preview.png';
    
  return (
    <img
      src={logoSrc}
      alt="ConstroMan Logo"
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
};

export default Logo; 