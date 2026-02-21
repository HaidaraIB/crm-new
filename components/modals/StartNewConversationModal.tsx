import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Loader } from '../Loader';
import { getLeadsAPI } from '../../services/api';

type Client = { id: number; name?: string; company_name?: string; phone_number?: string; [k: string]: any };

type StartNewConversationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
  onSelectClient: (client: Client) => void;
};

export const StartNewConversationModal = ({ isOpen, onClose, t, onSelectClient }: StartNewConversationModalProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

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

  const displayName = (c: Client) => c.company_name || c.name || `#${c.id}`;
  const displaySub = (c: Client) => (c.name && c.company_name ? c.name : c.phone_number || '');

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
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchConversations')}
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
        />
        <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
          {loading ? (
            <div className="flex justify-center py-8"><Loader variant="primary" className="h-8" /></div>
          ) : clients.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">{t('noAccountsConnected') || 'No clients'}</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {clients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(client)}
                    className="w-full flex items-center gap-3 p-3 text-start hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                      {(displayName(client) || 'ش').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{displayName(client)}</p>
                      {displaySub(client) && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{displaySub(client)}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
