import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, UsersIcon } from '../icons';
import type { translations } from '../../constants';

export type InboxAssignAgent = {
  id: number;
  full_name?: string;
  username?: string;
};

type Props = {
  t: (key: keyof typeof translations.en) => string;
  agents: InboxAssignAgent[];
  value: number | null;
  onChange: (agentId: number | null) => void;
  disabled?: boolean;
};

function agentLabel(agent: InboxAssignAgent): string {
  return (agent.full_name || agent.username || '').trim() || String(agent.id);
}

function initials(label: string): string {
  const parts = label.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

/**
 * Header assignee picker for the social Inbox — custom menu so the native
 * OS `<select>` list never flashes white over the purple chat chrome.
 */
export const InboxAssignAgentMenu: React.FC<Props> = ({
  t,
  agents,
  value,
  onChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => (value == null ? null : agents.find((a) => a.id === value) ?? null),
    [agents, value]
  );
  const triggerLabel = selected ? agentLabel(selected) : t('chatFilterUnassigned');

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25 disabled:opacity-50"
        aria-label={t('inboxAssignAgent')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <UsersIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 opacity-90 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={t('inboxAssignAgent')}
          className="absolute end-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-white/10 bg-gray-900 py-1 text-sm text-white shadow-xl shadow-black/40 ring-1 ring-black/20"
        >
          <button
            type="button"
            role="option"
            aria-selected={value == null}
            className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-start transition-colors ${
              value == null
                ? 'bg-primary/25 text-white'
                : 'text-gray-100 hover:bg-white/10'
            }`}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-gray-300"
              aria-hidden
            >
              <UsersIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">
              {t('chatFilterUnassigned')}
            </span>
            {value == null ? (
              <CheckIcon className="h-4 w-4 shrink-0 text-primary-300" aria-hidden />
            ) : null}
          </button>

          {agents.length > 0 ? (
            <div className="my-1 border-t border-white/10" role="separator" />
          ) : null}

          <div className="max-h-56 overflow-y-auto">
            {agents.map((agent) => {
              const label = agentLabel(agent);
              const isSelected = value === agent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-start transition-colors ${
                    isSelected
                      ? 'bg-primary/25 text-white'
                      : 'text-gray-100 hover:bg-white/10'
                  }`}
                  onClick={() => {
                    onChange(agent.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/40 text-[10px] font-bold tracking-wide text-white"
                    aria-hidden
                  >
                    {initials(label)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {isSelected ? (
                    <CheckIcon className="h-4 w-4 shrink-0 text-primary-300" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default InboxAssignAgentMenu;
