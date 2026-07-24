import React from 'react';

/**
 * MinimalInput — warm design system text input with orange focus ring.
 */
export default function MinimalInput({ label, id, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[11px] font-bold text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium transition-all duration-200 outline-none border border-black/[0.07] placeholder:text-muted/60 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 ${error ? 'border-error focus:border-error focus:ring-error/10' : ''}`}
        {...props}
      />
      {error && <span className="text-xs font-semibold text-error mt-1">{error}</span>}
    </div>
  );
}
