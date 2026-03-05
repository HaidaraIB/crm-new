import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import type { MessageTemplateType } from '../../services/api';
import { createMessageTemplateAPI, updateMessageTemplateAPI, deleteMessageTemplateAPI } from '../../services/api';
import { SelectMediaModal } from './SelectMediaModal';

const NAME_MAX = 200;
const BODY_MAX = 1000;
const FOOTER_MAX = 60;
/** Template name: English only (letters, numbers, spaces, hyphens, underscores) - required by WhatsApp/Meta */
const TEMPLATE_NAME_ENGLISH_REGEX = /^[a-zA-Z0-9_\s\-]+$/;
const BUTTON_TEXT_MAX = 25;
const PHONE_MAX = 20;
const URL_MAX = 1000;

const PLACEHOLDERS = [
  { key: 'templatePlaceholderCustomerName' as const, insertEn: '[Customer Name]', insertAr: '[اسم_العميل]' },
  { key: 'templatePlaceholderCompany' as const, insertEn: '[Company]', insertAr: '[الشركة]' },
  { key: 'templatePlaceholderAmount' as const, insertEn: '[Amount]', insertAr: '[المبلغ]' },
  { key: 'templatePlaceholderInvoiceNumber' as const, insertEn: '[Invoice Number]', insertAr: '[رقم_الفاتورة]' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', code: 'EN' },
  { value: 'en_US', label: 'English (US)', code: 'EN_US' },
  { value: 'ar', label: 'Arabic', code: 'AR' },
  { value: 'zh_CN', label: 'Chinese (CHN)', code: 'ZH_CN' },
  { value: 'zh_HK', label: 'Chinese (HKG)', code: 'ZH_HK' },
  { value: 'zh_TW', label: 'Chinese (TAI)', code: 'ZH_TW' },
  { value: 'hr', label: 'Croatian', code: 'HR' },
  { value: 'cs', label: 'Czech', code: 'CS' },
  { value: 'da', label: 'Danish', code: 'DA' },
  { value: 'nl', label: 'Dutch', code: 'NL' },
  { value: 'fil', label: 'Filipino', code: 'FIL' },
  { value: 'fi', label: 'Finnish', code: 'FI' },
  { value: 'fr', label: 'French', code: 'FR' },
  { value: 'de', label: 'German', code: 'DE' },
  { value: 'el', label: 'Greek', code: 'EL' },
  { value: 'he', label: 'Hebrew', code: 'HE' },
  { value: 'hi', label: 'Hindi', code: 'HI' },
  { value: 'hu', label: 'Hungarian', code: 'HU' },
  { value: 'id', label: 'Indonesian', code: 'ID' },
  { value: 'it', label: 'Italian', code: 'IT' },
  { value: 'ja', label: 'Japanese', code: 'JA' },
  { value: 'ko', label: 'Korean', code: 'KO' },
  { value: 'ms', label: 'Malay', code: 'MS' },
  { value: 'nb', label: 'Norwegian', code: 'NB' },
  { value: 'pl', label: 'Polish', code: 'PL' },
  { value: 'pt_BR', label: 'Portuguese (BR)', code: 'PT_BR' },
  { value: 'pt_PT', label: 'Portuguese (POR)', code: 'PT_PT' },
  { value: 'ro', label: 'Romanian', code: 'RO' },
  { value: 'ru', label: 'Russian', code: 'RU' },
  { value: 'es', label: 'Spanish', code: 'ES' },
  { value: 'es_AR', label: 'Spanish (ARG)', code: 'ES_AR' },
  { value: 'sv', label: 'Swedish', code: 'SV' },
  { value: 'th', label: 'Thai', code: 'TH' },
  { value: 'tr', label: 'Turkish', code: 'TR' },
];

const CATEGORY_OPTIONS: { value: string; labelKey: string; descKey: string; backendValue: string }[] = [
  { value: 'marketing', labelKey: 'categoryMarketingLabel', descKey: 'categoryMarketingDesc', backendValue: 'marketing' },
  { value: 'auth', labelKey: 'categoryAuthLabel', descKey: 'categoryAuthDesc', backendValue: 'auth' },
  { value: 'utility', labelKey: 'categoryUtilityLabel', descKey: 'categoryUtilityDesc', backendValue: 'utility' },
  { value: 'carousel', labelKey: 'categoryCarouselLabel', descKey: 'categoryCarouselDesc', backendValue: 'utility' },
  { value: 'single_product', labelKey: 'categorySingleProductLabel', descKey: 'categorySingleProductDesc', backendValue: 'utility' },
  { value: 'multi_product', labelKey: 'categoryMultiProductLabel', descKey: 'categoryMultiProductDesc', backendValue: 'utility' },
  { value: 'product_card_carousel', labelKey: 'categoryProductCardCarouselLabel', descKey: 'categoryProductCardCarouselDesc', backendValue: 'utility' },
  { value: 'limited_time_offer', labelKey: 'categoryLimitedTimeOfferLabel', descKey: 'categoryLimitedTimeOfferDesc', backendValue: 'utility' },
];

const HEADER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'location', label: 'Location' },
];

type TemplateButton = {
  id: string;
  type: 'phone' | 'url' | 'reply' | 'flow';
  buttonText: string;
  phone?: string;
  url?: string;
  dynamicUrl?: boolean;
};

type EditTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  template: MessageTemplateType | null;
  t: (key: string) => string;
  language: 'en' | 'ar';
  onSuccess: () => void;
  onSendToReview?: (templateId: number, language: string) => Promise<void>;
  /** When provided, Delete button opens this callback instead of window.confirm (e.g. to show app ConfirmDeleteModal) */
  onRequestDelete?: (template: MessageTemplateType) => void;
};

export const EditTemplateModal = ({ isOpen, onClose, template, t, language, onSuccess, onSendToReview, onRequestDelete }: EditTemplateModalProps) => {
  const [channelType, setChannelType] = useState<'sms' | 'whatsapp_api'>('whatsapp_api');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('utility');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState('none');
  const [headerText, setHeaderText] = useState('');
  const [footer, setFooter] = useState('');
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [saving, setSaving] = useState(false);
  const [sendingToReview, setSendingToReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidationConfirm, setShowValidationConfirm] = useState(false);
  const [showSelectMedia, setShowSelectMedia] = useState(false);
  const [headerMediaName, setHeaderMediaName] = useState<string | null>(null);

  const isEdit = !!template?.id;
  const isWhatsApp = channelType === 'whatsapp_api';

  useEffect(() => {
    if (template) {
      setChannelType((template.channel_type === 'sms' ? 'sms' : 'whatsapp_api') as 'sms' | 'whatsapp_api');
      setName(template.name);
      setContent(template.content);
      const cat = (template.category || '').toLowerCase();
      setCategory(cat === 'marketing' ? 'marketing' : cat === 'auth' ? 'auth' : 'utility');
      setTemplateLanguage((template as any).language || 'en_US');
      setHeaderType((template as any).header_type || 'none');
      setHeaderText((template as any).header_text || '');
      setFooter((template as any).footer || '');
      const rawButtons = (template as any).buttons;
      if (Array.isArray(rawButtons) && rawButtons.length > 0) {
        setButtons(
          rawButtons.map((b: any, i: number) => ({
            id: `btn-${i}-${Date.now()}`,
            type: (b.type === 'phone' || b.type === 'url' || b.type === 'reply' ? b.type : 'reply') as 'phone' | 'url' | 'reply',
            buttonText: b.button_text ?? b.buttonText ?? '',
            ...(b.type === 'phone' && { phone: b.phone ?? '' }),
            ...(b.type === 'url' && { url: b.url ?? '', dynamicUrl: false }),
          }))
        );
      } else {
        setButtons([]);
      }
    } else {
      setChannelType('whatsapp_api');
      setName('');
      setContent('');
      setCategory('marketing');
      setTemplateLanguage('en_US');
      setHeaderType('none');
      setHeaderText('');
      setFooter('');
      setButtons([]);
    }
    setError(null);
  }, [template, isOpen]);

  const insertPlaceholder = (insert: string) => {
    setContent((prev) => prev + insert);
  };

  const addButton = (type: TemplateButton['type']) => {
    setButtons((prev) => [...prev, {
      id: `btn-${Date.now()}-${prev.length}`,
      type,
      buttonText: '',
      ...(type === 'phone' && { phone: '' }),
      ...(type === 'url' && { url: '', dynamicUrl: false }),
    }]);
  };

  const updateButton = (id: string, updates: Partial<TemplateButton>) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeButton = (id: string) => {
    setButtons((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('templateName') + ' ' + (t('required') || 'required'));
      return;
    }
    if (isWhatsApp && !TEMPLATE_NAME_ENGLISH_REGEX.test(name.trim())) {
      setError(t('templateNameEnglishOnly'));
      return;
    }
    if (!content.trim()) {
      setError((t('messageContent') || 'Message content') + ' ' + (t('required') || 'required'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const categoryForBackend = isWhatsApp ? (CATEGORY_OPTIONS.find((c) => c.value === category)?.backendValue ?? category) : 'utility';
      const payload: Parameters<typeof createMessageTemplateAPI>[0] = {
        name: name.trim(),
        channel_type: channelType,
        content: content.trim(),
        category: categoryForBackend,
        ...(isWhatsApp && {
          language: templateLanguage,
          header_type: headerType,
          ...(headerType === 'text' && headerText.trim() && { header_text: headerText.trim() }),
          ...(footer.trim() && { footer: footer.trim() }),
          ...(buttons.length > 0 && {
            buttons: buttons.map((b) => {
              const item: { type: string; button_text: string; phone?: string; url?: string } = {
                type: b.type,
                button_text: b.buttonText.trim(),
              };
              if (b.type === 'phone' && b.phone) item.phone = b.phone.trim();
              if (b.type === 'url' && b.url) item.url = b.url.trim();
              return item;
            }),
          }),
        }),
      };
      if (isEdit && template) {
        await updateMessageTemplateAPI(template.id, payload);
      } else {
        await createMessageTemplateAPI(payload);
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || (t('save') || 'Save') + ' failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToReview = async () => {
    if (!template?.id || !onSendToReview) return;
    setError(null);
    setSendingToReview(true);
    try {
      await onSendToReview(template.id, templateLanguage);
      setShowValidationConfirm(false);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.data?.error || e?.message || 'Failed to send to review');
    } finally {
      setSendingToReview(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('editTemplate') : (t('addNewTemplate') || 'Add New Template')}
      maxWidth="4xl"
    >
      {/* Channel type: SMS or WhatsApp */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('channelType')}</label>
        <select
          value={channelType}
          onChange={(e) => setChannelType(e.target.value as 'sms' | 'whatsapp_api')}
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
        >
          <option value="whatsapp_api">{t('whatsAppApi')}</option>
          <option value="sms">SMS</option>
        </select>
      </div>

      {/* ---------- SMS: simple form (previous form as-is) ---------- */}
      {channelType === 'sms' && (
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
            >
              <option value="auth">{t('categoryAuth')}</option>
              <option value="marketing">{t('categoryMarketing')}</option>
              <option value="utility">{t('categoryUtility')}</option>
            </select>
          </div>
        </div>
      )}

      {/* ---------- WhatsApp: full form (Name, Category, Language, Header, Body, Footer, Buttons) ---------- */}
      {isWhatsApp && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">* {t('templateName')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                maxLength={NAME_MAX}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                placeholder={t('templateNamePlaceholderEn') || 'Enter message template name in English'}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{name.length}/{NAME_MAX}</p>
            </div>

            {/* Category / Type and Language in one row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">* {t('templateCategoryType') || 'Category / Type'}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} title={t(opt.descKey)}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">* {t('templateLanguage')}</label>
                <select
                  value={templateLanguage}
                  onChange={(e) => setTemplateLanguage(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label} - {opt.code}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{t('templateLanguageNote') || 'Please note, the language of the text below must match with the language selected above.'}</p>
              </div>
            </div>

            {/* Header */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('templateHeader')}</label>
              <select
                value={headerType}
                onChange={(e) => { setHeaderType(e.target.value); setHeaderMediaName(null); }}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm mb-2"
              >
                {HEADER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {headerType === 'text' && (
                <input type="text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder={t('templateHeader')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              )}
              {headerType === 'image' && (
                <div role="button" tabIndex={0} onClick={() => setShowSelectMedia(true)} onKeyDown={(e) => e.key === 'Enter' && setShowSelectMedia(true)} className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary/50">
                  <svg className="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                  <span className="text-sm font-medium uppercase">{headerMediaName || 'Image'}</span>
                </div>
              )}
              {headerType === 'video' && (
                <div role="button" tabIndex={0} onClick={() => setShowSelectMedia(true)} onKeyDown={(e) => e.key === 'Enter' && setShowSelectMedia(true)} className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary/50">
                  <svg className="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  <span className="text-sm font-medium uppercase">{headerMediaName || 'Video'}</span>
                </div>
              )}
              {headerType === 'document' && (
                <div role="button" tabIndex={0} onClick={() => setShowSelectMedia(true)} onKeyDown={(e) => e.key === 'Enter' && setShowSelectMedia(true)} className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary/50">
                  <svg className="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="text-sm font-medium">{headerMediaName || 'File'}</span>
                </div>
              )}
              {headerType === 'location' && (
                <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary/50">
                  <svg className="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-sm font-medium uppercase">Location</span>
                </div>
              )}
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">* {t('templateBody') || t('messageContent')}</label>
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
                <span className="inline-flex items-center text-gray-400 dark:text-gray-500 text-sm" title={t('messageContent')}>&lt;/&gt;</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, BODY_MAX))}
                maxLength={BODY_MAX}
                rows={5}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                placeholder={t('messageContent')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{content.length}/{BODY_MAX}</p>
            </div>

            {/* Footer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('templateFooter')}</label>
              <input
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value.slice(0, FOOTER_MAX))}
                maxLength={FOOTER_MAX}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                placeholder={t('templateFooterPlaceholder')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{footer.length}/{FOOTER_MAX}</p>
            </div>

            {/* Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Buttons</label>
              {buttons.map((btn) => (
                <div key={btn.id} className="flex flex-wrap items-start gap-2 mb-3 p-3 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30">
                  <div className="flex-1 min-w-[120px]">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('templateButtonText') || 'Button Text'}</span>
                    <input
                      type="text"
                      value={btn.buttonText}
                      onChange={(e) => updateButton(btn.id, { buttonText: e.target.value.slice(0, BUTTON_TEXT_MAX) })}
                      maxLength={BUTTON_TEXT_MAX}
                      placeholder="0/25"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                    />
                    <span className="text-xs text-gray-400">{btn.buttonText.length}/{BUTTON_TEXT_MAX}</span>
                  </div>
                  {btn.type === 'phone' && (
                    <div className="flex-1 min-w-[140px]">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('templatePhoneNumber') || 'Phone number'}</span>
                      <input
                        type="text"
                        value={btn.phone || ''}
                        onChange={(e) => updateButton(btn.id, { phone: e.target.value.slice(0, PHONE_MAX) })}
                        maxLength={PHONE_MAX}
                        placeholder="+61412345678"
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                      />
                    </div>
                  )}
                  {btn.type === 'url' && (
                    <div className="flex-1 min-w-[180px]">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('templateWebsiteUrl') || 'Website URL'}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="text"
                          value={btn.url || ''}
                          onChange={(e) => updateButton(btn.id, { url: e.target.value.slice(0, URL_MAX) })}
                          maxLength={URL_MAX}
                          placeholder="https://www.example.com"
                          className="flex-1 min-w-0 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                        />
                        <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                          <input type="checkbox" checked={!!btn.dynamicUrl} onChange={(e) => updateButton(btn.id, { dynamicUrl: e.target.checked })} className="rounded" />
                          {t('dynamic')}
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="flex items-end shrink-0 pt-6">
                    <button type="button" onClick={() => removeButton(btn.id)} className="p-1.5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-red-600" title={t('delete')}>🗑</button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addButton('phone')} className="px-3 py-2 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary">{t('phoneButtonAdd')}</button>
                <button type="button" onClick={() => addButton('url')} className="px-3 py-2 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary">{t('urlButtonAdd')}</button>
                <button type="button" onClick={() => addButton('reply')} className="px-3 py-2 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary">{t('replyButtonAdd')}</button>
              </div>
            </div>
          </div>

          {/* Preview - WhatsApp-style message bubble */}
          <div className="lg:col-span-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('templatePreview')}</p>
            <div className="rounded-2xl rounded-tl-md shadow-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden max-w-[280px]">
              {headerType !== 'none' && (
                <div className="w-full overflow-hidden bg-gray-100 dark:bg-gray-600 flex flex-col items-center justify-center min-h-[72px] px-2 py-2">
                  {headerType === 'text' && <span className="text-sm text-gray-800 dark:text-gray-200 text-center line-clamp-2 break-words w-full px-2">{headerText || (t('templateHeader') || 'Header text')}</span>}
                  {headerType !== 'text' && (
                    <>
                      <span className="text-2xl">{headerType === 'image' ? '🖼' : headerType === 'video' ? '🎬' : headerType === 'document' ? '📎' : '📍'}</span>
                      <span className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400 mt-0.5">{headerType === 'document' ? 'DOCUMENT' : headerType === 'location' ? 'LOCATION' : headerType.toUpperCase()}</span>
                    </>
                  )}
                </div>
              )}
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[14px] text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words leading-snug">{content || '—'}</p>
                {footer && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 pt-1 border-t border-gray-100 dark:border-gray-600">{footer}</p>}
              </div>
              {buttons.length > 0 && (
                <div className="px-2 pb-2 pt-0 space-y-1">
                  {buttons.map((btn) => (
                    <div key={btn.id} className="flex items-center justify-center">
                      {btn.type === 'phone' && (
                        <span className="inline-flex items-center gap-1.5 w-full justify-center py-2 rounded-lg bg-[#e7f3ff] dark:bg-[#1a3a52] text-[#0084ff] dark:text-[#53bdeb] text-[13px] font-medium border border-[#0084ff]/30">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                          {btn.buttonText || (t('templatePhoneNumber') || 'Phone')}
                        </span>
                      )}
                      {btn.type === 'url' && (
                        <span className="inline-flex items-center gap-1.5 w-full justify-center py-2 rounded-lg bg-[#e7f3ff] dark:bg-[#1a3a52] text-[#0084ff] dark:text-[#53bdeb] text-[13px] font-medium border border-[#0084ff]/30">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                          {btn.buttonText || (t('templateWebsiteUrl') || 'URL')}
                        </span>
                      )}
                      {btn.type === 'reply' && (
                        <span className="inline-flex items-center w-full justify-center py-2 rounded-lg border-2 border-[#0084ff] text-[#0084ff] dark:border-[#53bdeb] dark:text-[#53bdeb] text-[13px] font-medium bg-transparent">
                          {btn.buttonText || (t('reply') || 'Reply')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          {isEdit && template && (
            <Button
              variant="danger"
              onClick={() => {
                if (onRequestDelete) {
                  onRequestDelete(template);
                } else if (window.confirm(t('deleteTemplateConfirm'))) {
                  deleteMessageTemplateAPI(template.id).then(onSuccess).then(onClose);
                }
              }}
            >
              {t('delete') || 'Delete'}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={onClose}>{t('cancel') || 'Cancel'}</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader variant="primary" className="h-4 w-4" /> : t('saveTemplate')}
          </Button>
          {isEdit && isWhatsApp && onSendToReview && (
            <Button variant="primary" onClick={() => setShowValidationConfirm(true)}>
              {t('sendToReview') || 'Send to review'}
            </Button>
          )}
        </div>
      </div>
    </Modal>

    {/* Validation confirmation modal */}
    <SelectMediaModal
      isOpen={showSelectMedia}
      onClose={() => setShowSelectMedia(false)}
      t={t}
      accept={headerType === 'image' ? 'image' : headerType === 'video' ? 'video' : headerType === 'document' ? 'document' : 'all'}
      onSelect={(url, file) => { setHeaderMediaName(file?.name || url.split('/').pop() || 'Selected'); setShowSelectMedia(false); }}
    />

    {showValidationConfirm && (
      <Modal
        isOpen={showValidationConfirm}
        onClose={() => setShowValidationConfirm(false)}
        title={t('confirm') || 'Confirm'}
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
            <span className="text-2xl text-amber-600 dark:text-amber-400">!</span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{t('templateValidationConfirm') || 'This template is now eligible for validation. Would you like to start Template validation?'}</p>
          <div className="flex gap-3 w-full justify-end">
            <Button variant="secondary" onClick={() => setShowValidationConfirm(false)}>{t('cancel') || 'Cancel'}</Button>
            <Button onClick={handleSendToReview} disabled={sendingToReview}>
              {sendingToReview ? <Loader variant="primary" className="w-4 h-4" /> : (t('submit') || 'Submit')}
            </Button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
};
