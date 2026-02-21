import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import type { MessageTemplateType } from '../../services/api';
import { createMessageTemplateAPI, updateMessageTemplateAPI } from '../../services/api';

const PLACEHOLDERS = [
  { key: 'templatePlaceholderCustomerName' as const, insertEn: '[Customer Name]', insertAr: '[اسم_العميل]' },
  { key: 'templatePlaceholderCompany' as const, insertEn: '[Company]', insertAr: '[الشركة]' },
  { key: 'templatePlaceholderAmount' as const, insertEn: '[Amount]', insertAr: '[المبلغ]' },
  { key: 'templatePlaceholderInvoiceNumber' as const, insertEn: '[Invoice Number]', insertAr: '[رقم_الفاتورة]' },
];

type EditTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  template: MessageTemplateType | null;
  t: (key: string) => string;
  language: 'en' | 'ar';
  onSuccess: () => void;
};

export const EditTemplateModal = ({ isOpen, onClose, template, t, language, onSuccess }: EditTemplateModalProps) => {
  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState('whatsapp_api');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('utility');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!template?.id;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setChannelType(template.channel_type);
      setContent(template.content);
      setCategory(template.category);
    } else {
      setName('');
      setChannelType('whatsapp_api');
      setContent('');
      setCategory('utility');
    }
    setError(null);
  }, [template, isOpen]);

  const insertPlaceholder = (insert: string) => {
    setContent((prev) => prev + insert);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('templateName') + ' ' + (t('required') || 'required'));
      return;
    }
    if (!content.trim()) {
      setError((t('messageContent') || 'Message content') + ' ' + (t('required') || 'required'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit && template) {
        await updateMessageTemplateAPI(template.id, { name: name.trim(), channel_type: channelType, content: content.trim(), category });
      } else {
        await createMessageTemplateAPI({ name: name.trim(), channel_type: channelType, content: content.trim(), category });
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || (t('save') || 'Save') + ' failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('editTemplate') : t('newTemplate')}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('templateName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
            placeholder={t('templateName')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('channelType')}</label>
          <select
            value={channelType}
            onChange={(e) => setChannelType(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
          >
            <option value="whatsapp_api">{t('whatsAppApi')}</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('messageContent')}</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PLACEHOLDERS.map((p) => {
              const insert = language === 'ar' ? p.insertAr : p.insertEn;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => insertPlaceholder(insert)}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t(p.key)}
                </button>
              );
            })}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
            placeholder={t('messageContent')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('status')} / Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
          >
            <option value="auth">{t('categoryAuth') || 'Auth'}</option>
            <option value="marketing">{t('categoryMarketing') || 'Marketing'}</option>
            <option value="utility">{t('categoryUtility') || 'Utility'}</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('cancel') || 'Cancel'}</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader variant="primary" className="h-4 w-4" /> : t('saveTemplate')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
