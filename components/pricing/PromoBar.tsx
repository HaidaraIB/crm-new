import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { queryKeys, useActivePromotion } from '../../hooks/useQueries';
import { useCountdown } from '../../hooks/useCountdown';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import PromoBarView from './PromoBarView';
import type { PromotionAudience, PublicPromotion } from './types';

const dismissKey = (p: PublicPromotion) => `promo-dismissed:${p.id}:${p.updated_at}`;

function isDismissed(p: PublicPromotion): boolean {
  try {
    return localStorage.getItem(dismissKey(p)) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed(p: PublicPromotion) {
  try {
    localStorage.setItem(dismissKey(p), '1');
  } catch {
    /* private mode / blocked storage: dismiss for this view only */
  }
}

interface PromoBarProps {
  audience: Extract<PromotionAudience, 'public' | 'dashboard'>;
  /** Where the CTA goes when the promotion has no explicit link. */
  defaultHref?: string;
  /** SPA navigation for the default CTA (dashboard); falls back to a normal link. */
  onDefaultCta?: () => void;
  /** Hide the CTA when the viewer is already where it would take them. */
  hideDefaultCta?: boolean;
}

/**
 * Platform promotion bar (Super Admin → Subscriptions → Promotions).
 * Display only: it never changes what anyone is charged.
 */
const PromoBar: React.FC<PromoBarProps> = ({ audience, defaultHref, onDefaultCta, hideDefaultCta }) => {
  const { t, language } = useAppContext();
  const queryClient = useQueryClient();
  const { data } = useActivePromotion(audience);
  const promo = data?.promotion ?? null;
  const [dismissedNow, setDismissedNow] = useState<string | null>(null);

  const countdown = useCountdown(promo?.show_countdown ? promo.ends_at : null, {
    serverOffsetMs: data?.serverOffsetMs ?? 0,
    onExpire: () => {
      // The promotion just ended: drop it and let the server confirm.
      void queryClient.invalidateQueries({ queryKey: queryKeys.activePromotion(audience) });
    },
  });

  if (!promo) return null;
  if (dismissedNow === dismissKey(promo) || (promo.dismissible && isDismissed(promo))) return null;
  // Past its end on this device (before the refetch lands): hide rather than show a zero countdown.
  if (promo.ends_at && countdown?.expired) return null;

  const isAr = language === 'ar';
  const messages = promo.messages.map((m) => (isAr ? m.ar || m.en : m.en || m.ar));
  const label = isAr ? promo.cta_label_ar || promo.cta_label : promo.cta_label || promo.cta_label_ar;
  const explicitHref = (promo.cta_url || '').trim();
  const href = explicitHref || defaultHref;
  const showCta = !!label && !!href && !(hideDefaultCta && !explicitHref);
  const endsOn = promo.ends_at
    ? t('promoEndsOn').replace(
        '{date}',
        new Intl.DateTimeFormat(isAr ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' })).format(
          new Date(promo.ends_at),
        ),
      )
    : undefined;

  const handleCta = (e: React.MouseEvent) => {
    if (!explicitHref && onDefaultCta) {
      e.preventDefault();
      onDefaultCta();
    }
  };

  return (
    <PromoBarView
      messages={messages}
      theme={promo.theme}
      ctaLabel={showCta ? label : undefined}
      ctaHref={showCta ? href : undefined}
      onCta={showCta ? handleCta : undefined}
      countdown={promo.show_countdown ? countdown : null}
      dismissible={promo.dismissible}
      onDismiss={() => {
        rememberDismissed(promo);
        setDismissedNow(dismissKey(promo));
      }}
      labels={{
        endsIn: t('promoEndsIn'),
        days: t('promoUnitD'),
        hours: t('promoUnitH'),
        minutes: t('promoUnitM'),
        seconds: t('promoUnitS'),
        dismiss: t('promoDismiss'),
        region: t('promoRegion'),
        endsOn,
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    />
  );
};

export default PromoBar;
