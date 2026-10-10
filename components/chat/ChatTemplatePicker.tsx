import React, { useMemo } from 'react';
import { Button, Loader } from '../index';
import type { MessageTemplateType } from '../../services/api';
import type { translations } from '../../constants';

type Props = {
  t: (key: keyof typeof translations.en) => string;
  whatsappSendBlocked: boolean;
  freeTextDisabled: boolean;
  showTemplates: boolean;
  setShowTemplates: (v: boolean | ((prev: boolean) => boolean)) => void;
  approvedTemplates: MessageTemplateType[];
  chatTemplateSendId: number | '';
  setChatTemplateSendId: (v: number | '') => void;
  onSendTemplate: () => void;
  chatTemplateSending: boolean;
  onInsertQuickTemplate: (content: string, templateId?: number) => void;
};

export const ChatTemplatePicker: React.FC<Props> = ({
  t,
  whatsappSendBlocked,
  freeTextDisabled,
  showTemplates,
  setShowTemplates,
  approvedTemplates,
  chatTemplateSendId,
  setChatTemplateSendId,
  onSendTemplate,
  chatTemplateSending,
  onInsertQuickTemplate,
}) => {
  const quickTemplates = useMemo(() => approvedTemplates.slice(0, 6), [approvedTemplates]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          disabled={whatsappSendBlocked}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
            showTemplates
              ? 'border-primary/40 bg-primary/10 text-primary dark:text-primary-200'
              : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {t('template')}
        </button>
        {showTemplates && (
          <>
            <select
              value={chatTemplateSendId === '' ? '' : String(chatTemplateSendId)}
              onChange={(e) => setChatTemplateSendId(e.target.value ? Number(e.target.value) : '')}
              disabled={whatsappSendBlocked}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
            >
              <option value="">{t('selectApprovedTemplate')}</option>
              {approvedTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              className="!shrink-0 !px-2 !py-1 !text-xs"
              disabled={whatsappSendBlocked || !chatTemplateSendId || chatTemplateSending}
              onClick={onSendTemplate}
            >
              {chatTemplateSending ? (
                <Loader size="sm" variant="primary" />
              ) : (
                t('sendTemplateMessage')
              )}
            </Button>
          </>
        )}
      </div>

      {showTemplates && quickTemplates.length > 0 && (
        <div className="custom-scrollbar flex gap-1.5 overflow-x-auto overflow-y-hidden pb-0.5">
          {quickTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              disabled={freeTextDisabled}
              onClick={() => onInsertQuickTemplate(tpl.content || '', tpl.id)}
              className="shrink-0 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 disabled:opacity-50 hover:border-primary/40 hover:text-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-primary-200"
            >
              {tpl.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
};
