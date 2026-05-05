import React from 'react';
import { reportHero } from './reportStyles';

type ReportHeroProps = {
  title: string;
  subtitle?: string;
  language: 'en' | 'ar';
};

export const ReportHero = ({ title, subtitle, language }: ReportHeroProps) => (
  <div className={`${reportHero} ${language === 'ar' ? 'font-arabic' : ''}`}>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:text-primary-300">LOOP CRM</p>
    <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">{title}</h2>
    {subtitle ? (
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">{subtitle}</p>
    ) : null}
  </div>
);
