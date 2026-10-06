import React from 'react';
import { Alert } from '../../Alert';
import { Button } from '../../Button';
import { Card } from '../../Card';
import { Loader } from '../../Loader';
import { ToggleSwitch } from '../../ToggleSwitch';
import { useAppContext } from '../../../context/AppContext';

/**
 * Settings body for credential integrations (SMS, AI).
 * `dirty === false` disables Save; omit `dirty` when the form always allows a save.
 */
export const SettingsFormCard: React.FC<{
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  enabledLabel?: string;
  enableDisabled?: boolean;
  dirty?: boolean;
  saving?: boolean;
  onSave: () => void;
  saveDisabled?: boolean;
  extraActions?: React.ReactNode;
  error?: string | null;
  success?: string | null;
  children: React.ReactNode;
}> = ({
  title,
  description,
  icon,
  enabled,
  onEnabledChange,
  enabledLabel,
  enableDisabled,
  dirty,
  saving,
  onSave,
  saveDisabled,
  extraActions,
  error,
  success,
  children,
}) => {
  const { t } = useAppContext();
  const blocked = saveDisabled || dirty === false || saving;
  return (
    <Card>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            {description ? <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</div> : null}
          </div>
        </div>
        {error ? <Alert variant="error">{error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}
        {onEnabledChange != null && enabled != null ? (
          <div className="flex items-center gap-3">
            <ToggleSwitch enabled={enabled} setEnabled={onEnabledChange} disabled={enableDisabled} />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {enabledLabel || t('twilioIntegrationEnabled')}
            </span>
            {enableDisabled ? (
              <span className="sr-only">{t('integrationStatusDisabled')}</span>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-4">{children}</div>
        <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-white/95 dark:bg-gray-800/95 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onSave} disabled={blocked}>
              {saving ? <Loader size="sm" variant="primary" /> : t('save')}
            </Button>
            {extraActions}
          </div>
        </div>
      </div>
    </Card>
  );
};
