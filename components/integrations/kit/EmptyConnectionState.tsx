import React from 'react';
import { Button } from '../../Button';
import { IntegrationPlatform, IntegrationPlatformIcon } from '../IntegrationPlatformIcon';

export const EmptyConnectionState: React.FC<{
  platform?: IntegrationPlatform;
  title: string;
  prompt: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  actionDisabled?: boolean;
}> = ({ platform, title, prompt, actionLabel, onAction, actionLoading, actionDisabled }) => (
  <div className="text-center py-16 px-6">
    {platform ? (
      <IntegrationPlatformIcon platform={platform} size="xl" variant="muted" className="mx-auto mb-5" />
    ) : null}
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">{prompt}</p>
    {actionLabel && onAction ? (
      <Button className="mt-4" onClick={onAction} loading={actionLoading} disabled={actionDisabled}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);
