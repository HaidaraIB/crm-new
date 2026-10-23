import React from 'react';
import { GiftIcon } from '../icons';
import type { PublicPlan } from './types';

/** "Black Friday: 2× AI credits" callout with a gift mark. Renders nothing without a note. */
const PlanOfferNote: React.FC<{ plan: PublicPlan; language: string }> = ({ plan, language }) => {
  const note = language === 'ar' ? plan.offerNoteAr || plan.offerNote : plan.offerNote || plan.offerNoteAr;
  if (!note) return null;
  return (
    <div className="mt-4 flex items-center gap-3 whitespace-normal rounded-xl bg-gray-50 p-3 dark:bg-white/[0.06]">
      <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-heading">{note}</p>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm" aria-hidden="true">
        <GiftIcon className="h-4 w-4" />
      </span>
    </div>
  );
};

export default PlanOfferNote;
