import React, { HTMLAttributes } from 'react';

export function Card({ className = '', hover = false, ...props }: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white shadow-sm ${
        hover ? 'transition-shadow hover:shadow-md' : ''
      } ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`font-semibold leading-none tracking-tight text-gray-900 ${className}`} {...props} />;
}

export function CardDescription({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-gray-500 ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />;
}
