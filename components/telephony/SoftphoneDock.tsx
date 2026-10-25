/**
 * Floating softphone dock (Loop Cloud PBX). State lives in SoftphoneProvider;
 * this only renders it: registration pill, inbound popup, click-to-call progress,
 * in-call controls (mute, hold, keypad, transfer, hang up) and the ended card.
 * Phone numbers render through PhoneText (RTL rule); all copy comes from t().
 */
import React, { useEffect, useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { MicOffIcon, MicrophoneIcon, PauseIcon, PhoneHangupIcon, PhoneIcon, PlayIcon, XIcon } from '../icons';
import { PhoneText, isPhoneLike } from '../PhoneText';
import { useSoftphoneOptional } from './SoftphoneProvider';
import { softphoneEndLabelKey } from '../../utils/pbxCallOutcome';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

function useElapsed(startedAt: number | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return '';
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const SoftphoneDock: React.FC = () => {
  const { t, openLeadDetails } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  const phone = useSoftphoneOptional();
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [dialerOpen, setDialerOpen] = useState(false);
  const [dialTo, setDialTo] = useState('');
  const call = phone?.call ?? null;
  const elapsed = useElapsed(call?.phase === 'active' ? call.startedAt : null);

  useEffect(() => {
    // A call is under way (the CRM accepted ours, or one came in): the dialer has done
    // its job. A refused call keeps the typed number, so it can be corrected.
    if (call && call.phase !== 'ended' && (call.callId || call.direction === 'inbound')) {
      setDialerOpen(false);
      setDialTo('');
    }
    if (!call || call.phase === 'ended') {
      setKeypadOpen(false);
      setTransferOpen(false);
      setTransferTo('');
    }
  }, [call]);

  if (!phone) return null;
  const { me, registration } = phone;

  // Idle: a small registration pill for browser extensions only. Once registered it
  // opens a dialer: numbers that are on no lead, and emergency numbers (which a
  // lead's phone field cannot hold), are reachable only from here.
  if (!call) {
    if (!me?.webrtc) return null;
    const label =
      registration === 'registered' ? tr('softphoneReady') : registration === 'connecting' ? tr('softphoneConnecting') : tr('softphoneOffline');
    const dot = registration === 'registered' ? 'bg-emerald-500' : registration === 'connecting' ? 'bg-amber-400' : 'bg-gray-400';
    const canDial = registration === 'registered' && Boolean(me.can_click_to_call);
    const pillClass =
      'inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800/95 dark:text-gray-200';
    const pillContent = (
      <>
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
        <PhoneIcon className="h-3.5 w-3.5" />
        <span>{label}</span>
        {me.extension ? <PhoneText className="text-gray-500 dark:text-gray-400">{me.extension.number}</PhoneText> : null}
      </>
    );
    const number = dialTo.replace(/[^0-9+*#]/g, '');
    const dial = () => {
      if (!number) return;
      void phone.placeCall(number, null);
    };
    return (
      <div className="fixed bottom-4 end-4 z-40 flex flex-col items-end gap-2" role="status" aria-live="polite">
        {canDial && dialerOpen ? (
          <form
            className="w-[19rem] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
            aria-label={tr('softphoneDialer')}
            onSubmit={(e) => {
              e.preventDefault();
              dial();
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tr('softphoneDialer')}</p>
              <IconButton icon={<XIcon className="h-4 w-4" />} label={tr('close')} onClick={() => setDialerOpen(false)} />
            </div>
            <div className="mt-2 flex gap-1.5">
              <input
                dir="ltr"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={dialTo}
                onChange={(e) => setDialTo(e.target.value.replace(/[^0-9+*#\s()-]/g, '').slice(0, 20))}
                placeholder={tr('softphoneDialerPlaceholder')}
                aria-label={tr('softphoneDialer')}
                aria-describedby="softphone-dialer-hint"
                className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              <IconButton
                size="md"
                icon={<span aria-hidden>⌫</span>}
                label={tr('softphoneBackspace')}
                title={tr('softphoneBackspace')}
                disabled={!dialTo}
                onClick={() => setDialTo((v) => v.slice(0, -1))}
              />
            </div>
            <p id="softphone-dialer-hint" className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{tr('softphoneDialerHint')}</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5" dir="ltr">
              {[...KEYS.slice(0, 9), '+', '0', '#'].map((k) => (
                <button
                  key={k}
                  type="button"
                  className="h-10 rounded-md bg-gray-100 text-base font-semibold text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                  onClick={() => setDialTo((v) => (v + k).slice(0, 20))}
                >
                  {k}
                </button>
              ))}
            </div>
            <Button type="submit" className="mt-3 w-full !bg-emerald-600 hover:!bg-emerald-700" disabled={!number}>
              <PhoneIcon className="h-4 w-4" />
              {tr('softphoneCall')}
            </Button>
          </form>
        ) : null}
        {canDial ? (
          <button
            type="button"
            className={`${pillClass} hover:bg-gray-50 dark:hover:bg-gray-700`}
            aria-expanded={dialerOpen}
            title={tr('softphoneDialer')}
            onClick={() => setDialerOpen((v) => !v)}
          >
            {pillContent}
          </button>
        ) : (
          <div className={pillClass}>{pillContent}</div>
        )}
      </div>
    );
  }

  const who = call.contactName || '';
  const number = call.remoteNumber;
  const showNumber = number && (isPhoneLike(number) || /^\d{2,6}$/.test(number));
  const canControl = call.viaBrowser && call.phase === 'active';

  let subtitle = '';
  if (call.phase === 'ringing-in') subtitle = tr('softphoneIncoming');
  else if (call.phase === 'dialing') subtitle = call.viaBrowser ? tr('softphoneRingingYourPhone') : tr('softphonePickUpDeskPhone');
  else if (call.phase === 'active') subtitle = call.held ? tr('softphoneOnHold') : `${tr('softphoneInCall')} · ${elapsed}`;
  else {
    const outcome = softphoneEndLabelKey(call.endStatus);
    subtitle = outcome ? `${tr('softphoneCallEnded')} · ${tr(outcome)}` : tr('softphoneCallEnded');
  }

  return (
    <div
      className="fixed bottom-4 end-4 z-50 w-[19rem] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
      role="dialog"
      aria-live="assertive"
      aria-label={tr('softphoneTitle')}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            call.phase === 'ringing-in' ? 'animate-pulse bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-primary/10 text-primary dark:text-primary-300'
          }`}
          aria-hidden
        >
          <PhoneIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {call.phase === 'dialing' ? `${tr('softphoneDialing')} ` : ''}
            {who || (showNumber ? <PhoneText>{number}</PhoneText> : tr('softphoneUnknownCaller'))}
          </p>
          {who && showNumber ? (
            <PhoneText as="p" className="text-xs text-gray-500 dark:text-gray-400">{number}</PhoneText>
          ) : null}
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{subtitle}</p>
          {phone.otherOnHold ? (
            <p className="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">{tr('softphoneOtherOnHold')}</p>
          ) : null}
          {me?.recording_mode && me.recording_mode !== 'off' && call.phase !== 'ended' ? (
            <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">● {tr('softphoneRecordedNotice')}</p>
          ) : null}
        </div>
        {call.phase === 'ended' ? (
          <IconButton icon={<XIcon className="h-4 w-4" />} label={tr('close')} onClick={phone.dismissEnded} />
        ) : null}
      </div>

      {call.contactId && call.phase !== 'ended' ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-primary hover:underline dark:text-primary-300"
          onClick={() => openLeadDetails({ id: call.contactId as number })}
        >
          {tr('softphoneOpenLead')}
        </button>
      ) : null}

      {phone.waiting ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">{tr('softphoneAnotherCall')}</p>
          <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
            {phone.waiting.contactName || (
              phone.waiting.remoteNumber
                ? <PhoneText>{phone.waiting.remoteNumber}</PhoneText>
                : tr('softphoneUnknownCaller')
            )}
          </p>
          <div className="mt-2 flex gap-2">
            <Button className="flex-1 !bg-emerald-600 hover:!bg-emerald-700" aria-label={tr('softphoneAnswerWaiting')} onClick={phone.answerWaiting}>
              <PhoneIcon className="h-4 w-4" />
              {tr('softphoneAnswer')}
            </Button>
            <Button variant="danger" className="flex-1" onClick={phone.declineWaiting}>
              <PhoneHangupIcon className="h-4 w-4" />
              {tr('softphoneDecline')}
            </Button>
          </div>
        </div>
      ) : null}

      {call.phase === 'ringing-in' ? (
        <div className="mt-3 flex gap-2">
          <Button className="flex-1 !bg-emerald-600 hover:!bg-emerald-700" onClick={phone.answer}>
            <PhoneIcon className="h-4 w-4" />
            {tr('softphoneAnswer')}
          </Button>
          <Button variant="danger" className="flex-1" onClick={phone.decline}>
            <PhoneHangupIcon className="h-4 w-4" />
            {tr('softphoneDecline')}
          </Button>
        </div>
      ) : null}

      {call.phase === 'dialing' || call.phase === 'active' ? (
        <>
          {canControl ? (
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <IconButton
                size="md"
                icon={call.muted ? <MicOffIcon className="h-4 w-4" /> : <MicrophoneIcon className="h-4 w-4" />}
                label={call.muted ? tr('softphoneUnmute') : tr('softphoneMute')}
                title={call.muted ? tr('softphoneUnmute') : tr('softphoneMute')}
                aria-pressed={call.muted}
                onClick={phone.toggleMute}
              />
              <IconButton
                size="md"
                icon={call.held ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
                label={call.held ? tr('softphoneResume') : tr('softphoneHold')}
                title={call.held ? tr('softphoneResume') : tr('softphoneHold')}
                aria-pressed={call.held}
                onClick={phone.toggleHold}
              />
              <Button size="md" variant={keypadOpen ? 'secondary' : 'ghost'} title={tr('softphoneKeypad')} onClick={() => setKeypadOpen((v) => !v)}>
                <span aria-hidden>#</span>
                <span className="sr-only">{tr('softphoneKeypad')}</span>
              </Button>
              <Button size="md" variant={transferOpen ? 'secondary' : 'ghost'} className="!px-1 text-xs" onClick={() => setTransferOpen((v) => !v)}>
                {tr('softphoneTransfer')}
              </Button>
            </div>
          ) : null}

          {canControl && keypadOpen ? (
            <div className="mt-2 grid grid-cols-3 gap-1.5" dir="ltr">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="h-10 rounded-md bg-gray-100 text-base font-semibold text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                  onClick={() => phone.sendDtmf(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          ) : null}

          {canControl && transferOpen ? (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                phone.transfer(transferTo.trim());
              }}
            >
              <input
                dir="ltr"
                inputMode="numeric"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder={tr('softphoneTransferPlaceholder')}
                aria-label={tr('softphoneTransferPlaceholder')}
                className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              <Button type="submit" variant="secondary" disabled={!/^[1-9][0-9]{1,5}$/.test(transferTo)}>
                {tr('softphoneTransfer')}
              </Button>
            </form>
          ) : null}

          <Button variant="danger" className="mt-3 w-full" onClick={phone.hangUp}>
            <PhoneHangupIcon className="h-4 w-4" />
            {tr('softphoneHangUp')}
          </Button>
        </>
      ) : null}
    </div>
  );
};
