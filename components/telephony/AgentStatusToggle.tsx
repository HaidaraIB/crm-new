/**
 * Header control for the agent's phone status (Loop Cloud PBX, spec section 6
 * PUT /agents/me/status). Available: calls to the agent's extension ring.
 * Paused: callers hear busy (the PBX checks it before ringing); the agent can
 * still place calls. Shown only to users who have an extension.
 *
 * The dot also reflects whether the agent's phone is connected: the browser
 * softphone's live registration, or what the PBX last reported for a desk phone.
 */
import React from 'react';

import { useAppContext } from '../../context/AppContext';
import { Dropdown, DropdownItem } from '../Dropdown';
import { ChevronDownIcon, PhoneIcon } from '../icons';
import type { AgentStatus } from '../../services/api';
import { useSoftphoneOptional } from './SoftphoneProvider';

const OPTIONS: AgentStatus[] = ['available', 'paused'];

export const AgentStatusToggle: React.FC = () => {
  const { t } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  const phone = useSoftphoneOptional();
  const ext = phone?.me?.extension;
  if (!phone || !phone.me?.provisioned || !ext || !phone.agentStatus) return null;

  const paused = phone.agentStatus === 'paused';
  const connected = phone.me.webrtc ? phone.registration === 'registered' : ext.registered;
  const dot = paused ? 'bg-amber-400' : connected ? 'bg-emerald-500' : 'bg-gray-400';
  const label = paused ? tr('agentStatusPaused') : tr('agentStatusAvailable');
  const title = `${tr('agentStatusTitle')}: ${label}${connected ? '' : ` · ${tr('agentStatusPhoneOffline')}`}`;

  return (
    <Dropdown
      panelClassName="w-72"
      trigger={
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
          aria-label={title}
          title={title}
          aria-haspopup="menu"
          disabled={phone.agentStatusSaving}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
          <PhoneIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
        </button>
      }
    >
      {OPTIONS.map((option) => (
        <DropdownItem
          key={option}
          onClick={() => {
            if (option !== phone.agentStatus) void phone.setAgentStatus(option);
          }}
        >
          <span className="flex items-start gap-2" aria-current={option === phone.agentStatus ? 'true' : undefined}>
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${option === 'paused' ? 'bg-amber-400' : 'bg-emerald-500'}`}
              aria-hidden
            />
            <span className="min-w-0">
              <span className={`block ${option === phone.agentStatus ? 'font-semibold' : ''}`}>
                {option === 'paused' ? tr('agentStatusPaused') : tr('agentStatusAvailable')}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {option === 'paused' ? tr('agentStatusPausedHint') : tr('agentStatusAvailableHint')}
              </span>
            </span>
          </span>
        </DropdownItem>
      ))}
      {!connected ? (
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {tr('agentStatusPhoneOffline')}
        </p>
      ) : null}
    </Dropdown>
  );
};
