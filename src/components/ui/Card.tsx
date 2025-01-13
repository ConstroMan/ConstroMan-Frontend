import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { themes } from '../../utils/theme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => {
  const { currentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  
  return (
    <div className={`${themeStyles.cardBg} rounded-lg shadow-md ${className}`}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }: CardProps) => {
  const { currentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  
  return (
    <div className={`p-6 ${themeStyles.cardBg} ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '' }: CardProps) => {
  const { currentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  
  return (
    <h3 className={`text-lg font-semibold ${themeStyles.text} ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ children, className = '' }: CardProps) => {
  const { currentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  
  return (
    <div className={`p-6 ${themeStyles.cardBg} ${className}`}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardTitle, CardContent };
