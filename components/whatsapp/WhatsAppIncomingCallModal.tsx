import React from 'react';
import { PhoneText } from '../PhoneText';
import { PhoneIcon } from '../icons';
import type { WhatsAppCallRecord } from '../../services/api';

type Props = {
  call: WhatsAppCallRecord;
  busy?: boolean;
  t: (key: string) => string;
  onAccept: () => void;
  onReject: () => void;
};

export const WhatsAppIncomingCallModal: React.FC<Props> = ({
  call,
  busy,
  t,
  onAccept,
  onReject,
}) => {
  const title = call.client_name || call.peer_name || t('whatsappIncomingCall');
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-primary-200 bg-white p-6 shadow-xl dark:border-primary-800 dark:bg-gray-900">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
          {t('whatsappIncomingCallVia')}
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
            <PhoneIcon className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <PhoneText className="text-sm text-primary-600 dark:text-primary-400">
            {call.peer_phone}
          </PhoneText>
          {call.client_stage ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {t('stage')}: {call.client_stage}
            </span>
          ) : null}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {t('whatsappRejectCall')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {t('whatsappAcceptAndRecord')}
          </button>
        </div>
      </div>
    </div>
  );
};
