import React from 'react';

type Variant = 'accept' | 'decline' | 'end' | 'mute' | 'muteActive' | 'neutral';

type Props = {
  label: string;
  variant: Variant;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg';
};

const variantClass: Record<Variant, string> = {
  accept: 'bg-[#25D366] text-white hover:bg-[#1ebe57] shadow-[0_8px_24px_rgba(37,211,102,0.35)]',
  decline: 'bg-[#F15C6D] text-white hover:bg-[#e04a5c] shadow-[0_8px_24px_rgba(241,92,109,0.35)]',
  end: 'bg-[#F15C6D] text-white hover:bg-[#e04a5c] shadow-[0_8px_24px_rgba(241,92,109,0.35)]',
  mute: 'bg-[#233138] text-white hover:bg-[#2a3a42]',
  muteActive: 'bg-white text-[#111b21] hover:bg-gray-100',
  neutral: 'bg-[#233138] text-white hover:bg-[#2a3a42]',
};

/**
 * Circular call control matching WhatsApp voice-call buttons.
 * Control row should use dir="ltr" so decline stays left / accept stays right in RTL UIs.
 */
export const WhatsAppCallControlButton: React.FC<Props> = ({
  label,
  variant,
  disabled,
  onClick,
  children,
  size = 'lg',
}) => {
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-14 w-14';
  const icon = size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="group flex flex-col items-center gap-2 disabled:opacity-50"
    >
      <span
        className={`inline-flex ${dim} items-center justify-center rounded-full transition-transform active:scale-95 ${variantClass[variant]}`}
      >
        <span className={`inline-flex ${icon} items-center justify-center [&>svg]:h-full [&>svg]:w-full`}>
          {children}
        </span>
      </span>
      <span className="max-w-[5.5rem] text-center text-xs font-medium text-white/85 group-disabled:text-white/50">
        {label}
      </span>
    </button>
  );
};
