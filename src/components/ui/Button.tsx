import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rounded?: 'full' | 'md' | 'none';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'default',
  className = '',
  isLoading = false,
  leftIcon,
  rightIcon,
  rounded = 'full',
  disabled,
  ...props
}) => {
  const baseClasses = 'font-semibold transition-colors duration-200';
  const variantClasses = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 rounded-full',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full',
    ghost: 'text-gray-700 hover:bg-gray-100 rounded-full',
    destructive: 'bg-red-600 text-white hover:bg-red-700 rounded-full',
  };
  const sizeClasses = {
    default: 'px-4 py-2 flex items-center justify-center',
    sm: 'px-2 py-1 text-sm flex items-center justify-center',
    lg: 'px-6 py-3 text-lg flex items-center justify-center',
    icon: 'p-2 flex items-center justify-center',
  };

  const roundedClasses = {
    full: 'rounded-full',
    md: 'rounded-md',
    none: 'rounded-none',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClasses[rounded]} ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};