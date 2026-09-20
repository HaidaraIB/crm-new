import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button, Card, Input, MoonIcon, SunIcon, PhoneInput, ArrowLeftIcon, ChevronDownIcon, Loader, PhoneText, CheckIcon } from '../components/index';
import {
  createPublicDemoBookingAPI,
  getPublicDemoBookingConfigAPI,
  getPublicDemoBookingSlotsAPI,
  lookupPublicDemoBookingAPI,
  PublicDemoBookingConfig,
  PublicDemoBookingRecord,
  PublicDemoBookingSlot,
} from '../services/api';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';

const DEMO_BOOKING_STORAGE_KEY = 'loop.publicDemoBooking.v1';

const pad2 = (n: number) => String(n).padStart(2, '0');

type StoredDemoBooking = { id: number; email: string };

const readStoredDemoBooking = (): StoredDemoBooking | null => {
  try {
    const raw = localStorage.getItem(DEMO_BOOKING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDemoBooking;
    if (typeof parsed?.id !== 'number' || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStoredDemoBooking = (id: number, email: string) => {
  localStorage.setItem(DEMO_BOOKING_STORAGE_KEY, JSON.stringify({ id, email: email.trim().toLowerCase() }));
};

const clearStoredDemoBooking = () => {
  localStorage.removeItem(DEMO_BOOKING_STORAGE_KEY);
};

const monthRange = (year: number, monthIndex: number) => {
  const from = `${year}-${pad2(monthIndex + 1)}-01`;
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const to = `${year}-${pad2(monthIndex + 1)}-${pad2(last)}`;
  return { from, to };
};

const formatSlotTime = (iso: string, timeZone: string, language: string) => {
  try {
    return new Intl.DateTimeFormat(
      language === 'ar' ? ARABIC_DATE_LOCALE : 'en-GB',
      withLatinDigits({
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      })
    ).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
};

const formatBookingDateTime = (iso: string, timeZone: string, language: string) => {
  try {
    return new Intl.DateTimeFormat(
      language === 'ar' ? ARABIC_DATE_LOCALE : 'en-GB',
      withLatinDigits({
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
      })
    ).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
};

const statusLabelKey = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bookDemoStatusCompleted';
    case 'cancelled':
      return 'bookDemoStatusCancelled';
    case 'no_show':
      return 'bookDemoStatusNoShow';
    default:
      return 'bookDemoStatusConfirmed';
  }
};

const NOTES_TEXTAREA_CLASS =
  'w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100';

const STATUS_BADGE_CLASS: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100',
  completed: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  no_show: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
};

type BookingSummaryRowProps = {
  label: string;
  children: React.ReactNode;
};

const BookingSummaryRow: React.FC<BookingSummaryRowProps> = ({ label, children }) => (
  <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 sm:text-end break-all">{children}</dd>
  </div>
);

type BookingSummaryProps = {
  booking: PublicDemoBookingRecord;
  timeZone: string;
  language: string;
  t: (key: string) => string;
  onBookAnother: () => void;
};

const BookingSummary: React.FC<BookingSummaryProps> = ({ booking, timeZone, language, t, onBookAnother }) => {
  const scheduledFor = formatBookingDateTime(booking.starts_at, timeZone, language);
  const statusClass = STATUS_BADGE_CLASS[booking.status] || STATUS_BADGE_CLASS.confirmed;

  return (
    <div className="space-y-6 -mt-1">
      <div className="text-center space-y-4 pt-2">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/35 ring-8 ring-green-50 dark:ring-green-950/50"
          aria-hidden
        >
          <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('bookDemoSuccessTitle')}</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            {t('bookDemoSuccessMessage')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary-200/80 dark:border-primary-800/80 bg-gradient-to-b from-primary-50 to-white dark:from-primary-950/50 dark:to-gray-900/40 px-5 py-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300">
          {t('bookDemoConfirmationNumber')}
        </p>
        <p className="mt-2 text-4xl font-bold tabular-nums text-primary-900 dark:text-primary-50">#{booking.id}</p>
        <p className="mt-3 text-xs leading-relaxed text-primary-800/90 dark:text-primary-200/90 max-w-sm mx-auto">
          {t('bookDemoConfirmationSaveHint')}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('bookDemoScheduledFor')}
        </p>
        <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{scheduledFor}</p>
        <span className={`inline-flex mt-4 px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
          {t(statusLabelKey(booking.status))}
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 px-5 divide-y divide-gray-200 dark:divide-gray-700">
        <dl>
          <BookingSummaryRow label={t('bookDemoName')}>{booking.name}</BookingSummaryRow>
          <BookingSummaryRow label={t('bookDemoEmail')}>{booking.email}</BookingSummaryRow>
          <BookingSummaryRow label={t('bookDemoPhone')}>
            <PhoneText>{booking.phone}</PhoneText>
          </BookingSummaryRow>
        </dl>
      </div>

      <Button type="button" variant="secondary" className="w-full" onClick={onBookAnother}>
        {t('bookDemoBookAnother')}
      </Button>
    </div>
  );
};

type BookDemoFlowSectionProps = {
  step: number;
  title: string;
  isActive: boolean;
  isComplete: boolean;
  children: React.ReactNode;
};

const BookDemoFlowSection: React.FC<BookDemoFlowSectionProps> = ({
  step,
  title,
  isActive,
  isComplete,
  children,
}) => (
  <section
    className={`rounded-xl border px-5 py-5 transition-all ${
      isActive
        ? 'border-primary-300/80 dark:border-primary-700 bg-white dark:bg-gray-900/50 shadow-sm ring-1 ring-primary-500/10'
        : isComplete
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/20'
    }`}
  >
    <div className="flex items-center gap-3 mb-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isComplete && !isActive
            ? 'bg-green-600 text-white'
            : isActive
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
      >
        {isComplete && !isActive ? <CheckIcon className="h-5 w-5" /> : step}
      </span>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
    </div>
    {children}
  </section>
);

type BookDemoFieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
};

const BookDemoField: React.FC<BookDemoFieldProps> = ({ label, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

export const BookDemoPage = () => {
  const { t, language, setLanguage, theme, setTheme } = useAppContext();
  const [config, setConfig] = useState<PublicDemoBookingConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [restoringBooking, setRestoringBooking] = useState(false);
  const [savedBooking, setSavedBooking] = useState<PublicDemoBookingRecord | null>(null);
  const [slots, setSlots] = useState<PublicDemoBookingSlot[]>([]);
  const [datesWithSlots, setDatesWithSlots] = useState<Set<string>>(new Set());
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<PublicDemoBookingSlot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingConfig(true);
      try {
        const c = await getPublicDemoBookingConfigAPI();
        if (!cancelled) setConfig(c);
      } catch {
        if (!cancelled) setConfig({ is_enabled: false } as PublicDemoBookingConfig);
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loadingConfig || !config?.is_enabled || savedBooking) return;
    const stored = readStoredDemoBooking();
    if (!stored) return;
    let cancelled = false;
    setRestoringBooking(true);
    lookupPublicDemoBookingAPI(stored.id, stored.email)
      .then((booking) => {
        if (!cancelled) setSavedBooking(booking);
      })
      .catch(() => {
        clearStoredDemoBooking();
      })
      .finally(() => {
        if (!cancelled) setRestoringBooking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config?.is_enabled, loadingConfig, savedBooking]);

  const loadSlots = useCallback(async () => {
    if (!config?.is_enabled || savedBooking) return;
    const { from, to } = monthRange(viewDate.getFullYear(), viewDate.getMonth());
    setLoadingSlots(true);
    try {
      const data = await getPublicDemoBookingSlotsAPI(from, to);
      setSlots(data.slots || []);
      setDatesWithSlots(new Set(data.dates_with_slots || []));
    } catch {
      setSlots([]);
      setDatesWithSlots(new Set());
    } finally {
      setLoadingSlots(false);
    }
  }, [config?.is_enabled, viewDate, savedBooking]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const intro = useMemo(() => {
    if (!config) return '';
    return language === 'ar' ? (config.intro_ar || config.intro_en) : (config.intro_en || config.intro_ar);
  }, [config, language]);

  const tz = savedBooking?.timezone || config?.timezone || 'Asia/Baghdad';

  const daySlots = useMemo(() => {
    if (!selectedDay) return [];
    return slots.filter((s) => s.date === selectedDay);
  }, [slots, selectedDay]);

  const calendarCells = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    return cells;
  }, [viewDate]);

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(
        language === 'ar' ? ARABIC_DATE_LOCALE : 'en-GB',
        withLatinDigits({
          month: 'long',
          year: 'numeric',
        })
      ).format(viewDate);
    } catch {
      return `${viewDate.getFullYear()}-${pad2(viewDate.getMonth() + 1)}`;
    }
  }, [viewDate, language]);

  const weekdayLabels = useMemo(() => {
    const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-GB';
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, 7 + i);
      return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date);
    });
  }, [language]);

  const selectedDateTimeLabel = useMemo(() => {
    if (!selectedSlot) return '';
    return formatBookingDateTime(selectedSlot.starts_at, tz, language);
  }, [selectedSlot, tz, language]);

  const handleSubmit = async () => {
    if (!selectedSlot || !name.trim() || !email.trim() || !phone.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createPublicDemoBookingAPI({
        starts_at: selectedSlot.starts_at,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company_name: companyName.trim(),
        notes: notes.trim(),
        language,
      });
      writeStoredDemoBooking(booking.id, booking.email);
      setSavedBooking(booking);
    } catch {
      setError(t('bookDemoError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async () => {
    const id = parseInt(lookupId.trim(), 10);
    if (!id || !lookupEmail.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const booking = await lookupPublicDemoBookingAPI(id, lookupEmail);
      writeStoredDemoBooking(booking.id, booking.email);
      setSavedBooking(booking);
      setShowLookup(false);
    } catch {
      setLookupError(t('bookDemoLookupNotFound'));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleBookAnother = () => {
    clearStoredDemoBooking();
    setSavedBooking(null);
    setSelectedDay(null);
    setSelectedSlot(null);
    setError(null);
  };

  return (
    <div className={`min-h-screen ${language === 'ar' ? 'font-arabic' : 'font-sans'} bg-gray-50 dark:bg-gray-900 relative`}>
      <div className={`absolute top-4 end-4 z-10 flex ${language === 'ar' ? 'gap-4' : 'gap-2'}`}>
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
        </button>
        <Button variant="ghost" className="p-2 h-auto" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
        </Button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <button
          type="button"
          onClick={() => {
            window.location.href = '/login';
          }}
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4 shrink-0" />
          {t('bookDemoBackToLogin')}
        </button>

        <Card>
          {!savedBooking ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('bookDemoTitle')}</h1>
              {intro ? <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-wrap">{intro}</p> : null}
            </>
          ) : null}

          {loadingConfig || restoringBooking ? (
            <div className="flex justify-center py-8">
              <Loader size="md" />
            </div>
          ) : !config?.is_enabled ? (
            <p className="text-gray-600 dark:text-gray-300">{t('bookDemoClosed')}</p>
          ) : savedBooking ? (
            <BookingSummary
              booking={savedBooking}
              timeZone={tz}
              language={language}
              t={t}
              onBookAnother={handleBookAnother}
            />
          ) : (
            <div className="space-y-5">
              <section className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/25 overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start hover:bg-gray-100/80 dark:hover:bg-gray-700/30 transition-colors"
                  onClick={() => setShowLookup((v) => !v)}
                  aria-expanded={showLookup}
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('bookDemoViewExisting')}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${showLookup ? 'rotate-180' : ''}`}
                  />
                </button>
                {showLookup ? (
                  <div className="space-y-3 px-4 pb-4 pt-0 border-t border-gray-200/80 dark:border-gray-700/80">
                    <p className="text-sm text-gray-600 dark:text-gray-400 pt-3">{t('bookDemoViewExistingHint')}</p>
                    <BookDemoField label={t('bookDemoConfirmationNumber')}>
                      <Input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={t('bookDemoConfirmationNumber')}
                        value={lookupId}
                        onChange={(e) => setLookupId(e.target.value.replace(/\D/g, ''))}
                      />
                    </BookDemoField>
                    <BookDemoField label={t('bookDemoEmail')}>
                      <Input
                        type="email"
                        placeholder={t('bookDemoEmail')}
                        value={lookupEmail}
                        onChange={(e) => setLookupEmail(e.target.value)}
                      />
                    </BookDemoField>
                    {lookupError ? <p className="text-sm text-red-600 dark:text-red-400">{lookupError}</p> : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      loading={lookupLoading}
                      disabled={lookupLoading || !lookupId.trim() || !lookupEmail.trim()}
                      onClick={() => void handleLookup()}
                    >
                      {t('bookDemoLookupSubmit')}
                    </Button>
                  </div>
                ) : null}
              </section>

              <BookDemoFlowSection
                step={1}
                title={t('bookDemoSelectDay')}
                isActive={!selectedDay}
                isComplete={!!selectedDay}
              >
                <div className="flex items-center justify-between mb-4 gap-2 rounded-lg bg-gray-100/80 dark:bg-gray-800/60 px-2 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 p-0 shrink-0"
                    aria-label={language === 'ar' ? 'الشهر السابق' : 'Previous month'}
                    onClick={() => {
                      setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
                      setSelectedDay(null);
                      setSelectedSlot(null);
                    }}
                  >
                    <ChevronDownIcon className="h-5 w-5 rotate-90 rtl:-rotate-90" />
                  </Button>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{monthLabel}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 p-0 shrink-0"
                    aria-label={language === 'ar' ? 'الشهر التالي' : 'Next month'}
                    onClick={() => {
                      setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
                      setSelectedDay(null);
                      setSelectedSlot(null);
                    }}
                  >
                    <ChevronDownIcon className="h-5 w-5 -rotate-90 rtl:rotate-90" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
                  {weekdayLabels.map((d, i) => (
                    <span key={`${d}-${i}`} className="py-1">
                      {d}
                    </span>
                  ))}
                </div>
                {loadingSlots ? (
                  <div className="flex justify-center py-8">
                    <Loader size="sm" />
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarCells.map((day, idx) => {
                      if (day === null) return <div key={`e-${idx}`} aria-hidden />;
                      const iso = `${viewDate.getFullYear()}-${pad2(viewDate.getMonth() + 1)}-${pad2(day)}`;
                      const hasSlots = datesWithSlots.has(iso);
                      const isSelected = selectedDay === iso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={!hasSlots}
                          onClick={() => {
                            setSelectedDay(iso);
                            setSelectedSlot(null);
                          }}
                          className={`aspect-square max-h-11 rounded-lg text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                              : hasSlots
                                ? 'bg-primary-50 dark:bg-primary-900/35 text-primary-800 dark:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-900/50'
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                )}
              </BookDemoFlowSection>

              <BookDemoFlowSection
                step={2}
                title={t('bookDemoSelectTime')}
                isActive={!!selectedDay && !selectedSlot}
                isComplete={!!selectedSlot}
              >
                {!selectedDay ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('bookDemoPickDayFirst')}</p>
                ) : daySlots.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('bookDemoNoSlots')}</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {daySlots.map((slot) => {
                      const isSlotSelected = selectedSlot?.starts_at === slot.starts_at;
                      return (
                        <button
                          key={slot.starts_at}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition-all ${
                            isSlotSelected
                              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 ring-2 ring-primary-400/50'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-900 dark:hover:text-primary-100 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          {formatSlotTime(slot.starts_at, tz, language)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </BookDemoFlowSection>

              {selectedSlot ? (
                <BookDemoFlowSection step={3} title={t('bookDemoYourDetails')} isActive isComplete={false}>
                  <div className="rounded-lg border border-primary-200/80 dark:border-primary-800/80 bg-primary-50/90 dark:bg-primary-950/40 px-4 py-3 mb-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                      {t('bookDemoScheduledFor')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary-950 dark:text-primary-50">
                      {selectedDateTimeLabel}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <BookDemoField label={t('bookDemoName')}>
                      <Input placeholder={t('bookDemoName')} value={name} onChange={(e) => setName(e.target.value)} />
                    </BookDemoField>
                    <BookDemoField label={t('bookDemoEmail')}>
                      <Input
                        type="email"
                        placeholder={t('bookDemoEmail')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </BookDemoField>
                    <BookDemoField label={t('bookDemoPhone')}>
                      <PhoneInput value={phone} onChange={setPhone} placeholder={t('bookDemoPhone')} />
                    </BookDemoField>
                    <BookDemoField label={t('bookDemoCompany')}>
                      <Input
                        placeholder={t('bookDemoCompany')}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </BookDemoField>
                    <BookDemoField label={t('bookDemoNotes')}>
                      <textarea
                        className={NOTES_TEXTAREA_CLASS}
                        placeholder={t('bookDemoNotes')}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </BookDemoField>
                  </div>
                  {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
                  <Button
                    className="w-full mt-6 py-3 text-base"
                    loading={submitting}
                    disabled={submitting || !name.trim() || !email.trim() || !phone.trim()}
                    onClick={() => void handleSubmit()}
                  >
                    {t('bookDemoSubmit')}
                  </Button>
                </BookDemoFlowSection>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
