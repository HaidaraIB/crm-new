import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Loader } from '../Loader';
import { getLeadsAPI, getWhatsAppContactByPhoneAPI } from '../../services/api';
import {
  getWhatsAppContactAvatarLabel,
  getWhatsAppContactSubtitle,
  getWhatsAppContactTitle,
} from '../../utils/whatsappContactDisplay';
import { PhoneText, isPhoneLike } from '../PhoneText';
import { validatePhoneField } from '../../utils/formValidation';
import { clearFieldError } from '../../utils/formFieldErrors';

type Client = {
  id: number | string;
  name?: string;
  lead_company_name?: string;
  company_name?: string;
  phone_number?: string;
  is_manual?: boolean;
  [k: string]: any;
};

type StartNewConversationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  t(key: string): string;
  onSelectClient: (client: Client) => void;
};

export const StartNewConversationModal = ({ isOpen, onClose, t, onSelectClient }: StartNewConversationModalProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [startingPhone, setStartingPhone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getLeadsAPI({ search: search || undefined })
      .then((res) => {
        const list = res?.results ?? (Array.isArray(res) ? res : []);
        setClients(list);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, [isOpen, search]);

  const handleSelect = (client: Client) => {
    onSelectClient(client);
    onClose();
  };

  const handleStartWithNumber = async () => {
    const compact = manualPhone.replace(/\s+/g, '');
    const withPlus = compact.startsWith('+') ? compact : `+${compact}`;
    const phoneErr = validatePhoneField(withPlus, t);
    if (phoneErr) {
      setErrors({ phone: phoneErr });
      return;
    }
    setErrors({});
    const normalized = compact.replace(/^\+/, '');
    setStartingPhone(true);
    try {
      const contact = await getWhatsAppContactByPhoneAPI(normalized);
      if (contact?.id) {
        onSelectClient({
          id: contact.id,
          name: contact.name,
          phone_number: contact.phone_number || normalized,
          lead_company_name: contact.lead_company_name || contact.company_name || '',
        });
        setManualPhone('');
        onClose();
        return;
      }
      onSelectClient({
        id: `manual:${normalized}`,
        name: normalized,
        phone_number: normalized,
        is_manual: true,
      });
      setManualPhone('');
      onClose();
    } catch (e: any) {
      const key = e?.error_key || e?.code;
      if (key === 'whatsapp_contact_not_found' || e?.status === 404) {
        setErrors({ phone: t('whatsappContactNotFound') || 'Contact not found' });
        return;
      }
      setErrors({ phone: t('whatsappContactNotFound') || 'Contact not found' });
    } finally {
      setStartingPhone(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('startNewConversation')}
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('chooseClientFromDb')}</p>
        <div>
          <div className="flex gap-2">
            <input
              type="tel"
              value={manualPhone}
              onChange={(e) => {
                setManualPhone(e.target.value.replace(/[^\d+\s]/g, ''));
                clearFieldError(setErrors, 'phone');
              }}
              placeholder={t('enterPhoneNumber') || 'Type phone number (e.g. +971501234567)'}
              className={`w-full rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm ${errors.phone ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => void handleStartWithNumber()}
              disabled={!manualPhone.trim() || startingPhone}
              className="px-3 py-2 rounded bg-primary text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingPhone ? '…' : t('start') || 'Start'}
            </button>
          </div>
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
          )}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchConversations')}
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
        />
        <div className="max-h-80 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-600 rounded-lg">
          {loading ? (
            <div className="flex justify-center py-8"><Loader variant="primary" className="h-8" /></div>
          ) : clients.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">{t('noAccountsConnected') || 'No clients'}</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {clients.map((client) => {
                const title = getWhatsAppContactTitle(client);
                const subtitle = getWhatsAppContactSubtitle(client);
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(client)}
                      className="w-full flex items-center gap-3 p-3 text-start hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center text-primary-800 dark:text-primary-50 font-bold text-sm ring-2 ring-primary-200/80 dark:ring-primary-600">
                        {getWhatsAppContactAvatarLabel(client)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isPhoneLike(title) ? (
                          <PhoneText as="p" className="font-medium text-gray-900 dark:text-white truncate">{title}</PhoneText>
                        ) : (
                          <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
                        )}
                        {subtitle && (
                          isPhoneLike(subtitle) ? (
                            <PhoneText as="p" className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</PhoneText>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
                          )
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
