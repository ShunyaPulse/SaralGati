import React, { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'error';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, variant = 'default', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
    // The validation message and the hint share one slot, so a single described-by
    // id is enough. Without it the error text was rendered but never announced.
    const messageId = `${inputId}-message`;
    const hasMessage = Boolean(error || helperText);
    
    const baseStyles = 'flex w-full rounded-md border bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    const variantStyles = error || variant === 'error' 
      ? 'border-red-500 focus-visible:ring-red-500' 
      : 'border-gray-300 focus-visible:ring-[#0074c8]';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-gray-900">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={`${baseStyles} ${variantStyles} ${className}`}
          {...props}
        />
        {error && (
          <p id={messageId} className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p id={messageId} className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
