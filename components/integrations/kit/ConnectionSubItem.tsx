import React from 'react';
import { Button } from '../../Button';
import { IntegrationPlatform, IntegrationPlatformIcon } from '../IntegrationPlatformIcon';
import { ConnectionPrimaryAction } from './ConnectionCard';

/** Nested row under a connection (a Meta page, a WhatsApp number). */
export const ConnectionSubItem: React.FC<{
  platform?: IntegrationPlatform;
  muted?: boolean;
  title: React.ReactNode;
  meta?: React.ReactNode;
  primary?: ConnectionPrimaryAction;
  secondary?: ConnectionPrimaryAction;
  danger?: ConnectionPrimaryAction;
  note?: React.ReactNode;
}> = ({ platform, muted, title, meta, primary, secondary, danger, note }) => (
  <li className="p-5 sm:p-6 flex flex-col gap-3 bg-white dark:bg-gray-800/50">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        {platform ? (
          <IntegrationPlatformIcon platform={platform} size="md" variant={muted ? 'muted' : 'badge'} />
        ) : null}
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 dark:text-white truncate">{title}</div>
          {meta ? <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">{meta}</div> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {primary ? (
          <Button
            variant="primary"
            className="rounded-lg text-sm"
            onClick={primary.onClick}
            loading={primary.loading}
            disabled={primary.disabled}
          >
            {primary.label}
          </Button>
        ) : null}
        {secondary ? (
          <Button
            variant="secondary"
            className="rounded-lg text-sm"
            onClick={secondary.onClick}
            loading={secondary.loading}
            disabled={secondary.disabled}
          >
            {secondary.label}
          </Button>
        ) : null}
        {danger ? (
          <Button
            variant="danger"
            className="rounded-lg text-sm"
            onClick={danger.onClick}
            loading={danger.loading}
            disabled={danger.disabled}
          >
            {danger.label}
          </Button>
        ) : null}
      </div>
    </div>
    {note ? <p className="text-xs text-amber-700 dark:text-amber-300">{note}</p> : null}
  </li>
);
