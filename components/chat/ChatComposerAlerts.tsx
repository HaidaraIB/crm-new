import React from 'react';
import { WA_ALERT_ERROR, WA_ALERT_INFO, WA_ALERT_WARN } from '../whatsapp/whatsappChatTheme';
import type { translations } from '../../constants';
import type { SessionInfo } from '../whatsapp/ChatComposer';

type ComposerAlert = { variant: 'error' | 'warning' | 'info'; message: string };

type Props = {
  t: (key: keyof typeof translations.en) => string;
  whatsappSendBlocked: boolean;
  blockFreeText: boolean;
  displayNameBlockedHint?: string | null;
  composerAlert?: ComposerAlert | null;
  session: SessionInfo;
  blockFreeTextMessage?: string;
  windowAlerts?: React.ReactNode;
  suppressBlockFreeTextAlert?: boolean;
};

export const ChatComposerAlerts: React.FC<Props> = ({
  t,
  whatsappSendBlocked,
  blockFreeText,
  displayNameBlockedHint,
  composerAlert,
  session,
  blockFreeTextMessage,
  windowAlerts,
  suppressBlockFreeTextAlert,
}) => {
  const alertNode = whatsappSendBlocked ? (
    <div className={WA_ALERT_WARN}>
      {t('whatsappReconnectRequired')}
    </div>
  ) : displayNameBlockedHint ? (
    <div className={WA_ALERT_ERROR}>{displayNameBlockedHint}</div>
  ) : composerAlert ? (
    <div
      className={
        composerAlert.variant === 'error'
          ? WA_ALERT_ERROR
          : composerAlert.variant === 'warning'
            ? WA_ALERT_WARN
            : WA_ALERT_INFO
      }
    >
      {composerAlert.message}
    </div>
  ) : blockFreeText && !suppressBlockFreeTextAlert ? (
    <div className={WA_ALERT_WARN}>
      {blockFreeTextMessage ?? t('whatsappSessionClosedHint')}
    </div>
  ) : null;

  return (
    <>
      {windowAlerts}
      {alertNode}
      {!blockFreeText && session?.in_session && session.hours_remaining != null && (
        <p className="px-0.5 text-[10px] text-gray-500 dark:text-gray-400">
          {t('whatsappSessionOpenHint').replace(
            '{h}',
            String(Math.max(0, Math.round(session.hours_remaining * 10) / 10))
          )}
        </p>
      )}
    </>
  );
};
