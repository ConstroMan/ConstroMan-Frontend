import React, { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  isLoading?: boolean
}

export const Input: React.FC<InputProps> = ({ 
  className = '', 
  label, 
  id, 
  error,
  hint,
  leftIcon,
  rightIcon,
  isLoading,
  disabled,
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} 
          ${leftIcon ? 'pl-10' : ''} ${rightIcon || isLoading ? 'pr-10' : ''}
          ${disabled ? 'bg-gray-100 text-gray-500' : ''}
          focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-teal-500'} ${className}`}
          disabled={disabled || isLoading}
          {...props}
        />
        {(rightIcon || isLoading) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isLoading ? <div className="h-4 w-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" /> : rightIcon}
          </div>
        )}
      </div>
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}