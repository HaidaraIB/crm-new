import React from 'react';
import { Button } from '../../Button';
import { Card } from '../../Card';
import { SettingsIcon, TrashIcon } from '../../icons';
import { PhoneText, isPhoneLike } from '../../PhoneText';
import { IntegrationPlatform, IntegrationPlatformIcon } from '../IntegrationPlatformIcon';
import { StatusBadge } from './StatusBadge';
import { ConnectionStatus } from './status';

export type ConnectionAction = {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

export type ConnectionPrimaryAction = {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** One connected account. Every action is a button on the row. */
export const ConnectionCard: React.FC<{
  platform?: IntegrationPlatform;
  name: string;
  status: ConnectionStatus;
  statusLabel?: string;
  extra?: React.ReactNode;
  primary?: ConnectionPrimaryAction;
  menu?: ConnectionAction[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ platform, name, status, statusLabel, extra, primary, menu, children, footer }) => {
  const actions = (menu || []).filter(Boolean);
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {platform ? <IntegrationPlatformIcon platform={platform} size="md" /> : null}
            <div className="min-w-0">
              {isPhoneLike(name) ? (
                <PhoneText as="p" className="font-semibold text-gray-900 dark:text-white truncate">
                  {name}
                </PhoneText>
              ) : (
                <p className="font-semibold text-gray-900 dark:text-white truncate">{name}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={status} label={statusLabel} />
                {extra}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {primary ? (
              <Button
                variant="primary"
                onClick={primary.onClick}
                loading={primary.loading}
                disabled={primary.disabled}
                className="rounded-lg shadow-sm"
              >
                {primary.label}
              </Button>
            ) : null}
            {actions.map((action) => {
              const danger = action.danger || action.key === 'disconnect';
              const edit = action.key === 'edit';
              return (
                <Button
                  key={action.key}
                  variant={danger ? 'danger' : edit ? 'ghost' : 'secondary'}
                  onClick={action.onClick}
                  loading={action.loading}
                  disabled={action.disabled}
                  className={
                    edit
                      ? 'rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      : 'rounded-lg text-sm'
                  }
                >
                  {danger ? <TrashIcon className="w-4 h-4" /> : null}
                  {edit ? <SettingsIcon className="w-4 h-4" /> : null}
                  <span className="sm:inline">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
        {children}
        {footer ? (
          <div className="pt-3 border-t border-gray-200/80 dark:border-gray-700/80">{footer}</div>
        ) : null}
      </div>
    </Card>
  );
};
