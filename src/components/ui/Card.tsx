import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { themes } from '../../utils/theme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  footer?: React.ReactNode;
  borderColor?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

const Card = ({ 
  children, 
  className = '',
  title,
  footer,
  borderColor,
  hoverable = false,
  onClick
}: CardProps) => {
  const { currentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  
  return (
    <div 
      className={`
        ${themeStyles.cardBg} 
        rounded-xl 
        shadow-md 
        ${borderColor ? `border-l-4 ${borderColor}` : ''} 
        ${hoverable ? 'transition-transform hover:scale-[1.02] hover:shadow-lg' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {title && (
        <div className={`${themeStyles.cardBg} px-6 py-4 rounded-t-xl border-b ${themeStyles.borderColor}`}>
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className={`${themeStyles.cardBg} px-6 py-3 rounded-b-xl border-t ${themeStyles.borderColor}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

const CardHeader = ({ children, className = '' }: CardProps) => {
  const { currentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  
  return (
    <div className={`p-6 ${themeStyles.cardBg} rounded-t-xl ${className}`}>
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
    <div className={`p-6 ${themeStyles.cardBg} rounded-b-xl ${className}`}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardTitle, CardContent };
