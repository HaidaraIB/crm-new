import React from 'react';

type FieldErrorProps = {
  /** Message from `catalogFieldErrors`/`serverFieldErrors` (forms/), or any field-level error string. */
  children?: React.ReactNode;
  className?: string;
};

/**
 * Inline field error — the single source of truth for the "small red text under
 * a field" pattern used by every catalog-validated form. Renders nothing when
 * there is no message, so callers can write `<FieldError>{errors.foo}</FieldError>`
 * unconditionally instead of `{errors.foo && <p>...</p>}`.
 */
export const FieldError: React.FC<FieldErrorProps> = ({ children, className = '' }) => {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={`mt-1 text-sm text-red-600 dark:text-red-400 [unicode-bidi:plaintext] ${className}`}
    >
      {children}
    </p>
  );
};
