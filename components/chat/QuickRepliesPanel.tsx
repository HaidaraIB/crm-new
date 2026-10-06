import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, TableHorizontalScroll } from '../index';
import { EditIcon, PlusIcon, SearchIcon } from '../icons';
import { Input, AutoDirTextarea } from '../Input';
import { Modal } from '../Modal';
import { useAppContext } from '../../context/AppContext';
import { normalizeRole } from '../../utils/roles';
import {
  createQuickReplyAPI,
  deleteQuickReplyAPI,
  getQuickRepliesAPI,
  resolveLocalizedApiError,
  updateQuickReplyAPI,
  type QuickReplyPayload,
} from '../../services/api';

const fieldClass =
  'w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-300';

/** Strip seed markers from local demo data so the settings UI stays clean. */
function displayText(value: string): string {
  return value
    .replace(/\[INBOX-SEED\]\s*/g, '')
    .replace(/\n?\[INBOX-SEED\]/g, '')
    .trim();
}

export function QuickReplyInsert({ onInsert }: { onInsert: (body: string) => void }) {
  const { t } = useAppContext();
  const { data } = useQuery({
    queryKey: ['quickReplies'],
    queryFn: getQuickRepliesAPI,
  });
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return null;
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        const row = rows.find((item) => String(item.id) === e.target.value);
        if (row) onInsert(displayText(row.body));
        e.target.value = '';
      }}
      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
    >
      <option value="">{t('quickReplies')}</option>
      {rows.map((row) => (
        <option key={row.id} value={row.id}>
          {displayText(row.title)}
        </option>
      ))}
    </select>
  );
}

export function QuickRepliesManager() {
  const {
    t,
    showToast,
    showAlert,
    currentUser,
    setConfirmDeleteConfig,
    setIsConfirmDeleteModalOpen,
  } = useAppContext();
  const isOwner = normalizeRole(currentUser?.role) === 'Owner';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReplyPayload | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quickReplies'],
    queryFn: getQuickRepliesAPI,
    enabled: isOwner,
  });
  const rows = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        displayText(row.title).toLowerCase().includes(q) ||
        displayText(row.body).toLowerCase().includes(q),
    );
  }, [rows, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['quickReplies'] });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { title: title.trim(), body: body.trim() };
      if (editing) return updateQuickReplyAPI(editing.id, payload);
      return createQuickReplyAPI(payload);
    },
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      setTitle('');
      setBody('');
      invalidate();
    },
    onError: (err: any) =>
      showToast(resolveLocalizedApiError(err, t, t('errorSavingAccount')), { variant: 'error' }),
  });

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setBody('');
    setModalOpen(true);
  };

  const openEdit = (row: QuickReplyPayload) => {
    setEditing(row);
    setTitle(displayText(row.title));
    setBody(displayText(row.body));
    setModalOpen(true);
  };

  const requestDelete = (row: QuickReplyPayload) => {
    setConfirmDeleteConfig({
      title: t('deleteQuickReply'),
      message: t('deleteQuickReplyConfirm'),
      itemName: displayText(row.title),
      confirmButtonText: t('delete'),
      confirmButtonVariant: 'danger',
      onConfirm: async () => {
        try {
          await deleteQuickReplyAPI(row.id);
          invalidate();
        } catch (e: any) {
          showAlert(resolveLocalizedApiError(e, t, t('errorSavingAccount')), 'error');
        }
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };

  if (!isOwner) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end flex-wrap gap-3">
        <Button onClick={openCreate}>
          <PlusIcon className="w-4 h-4 me-2" /> {t('addQuickReply')}
        </Button>
      </div>

      <div className="relative">
        <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ps-9 pe-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <Card className="overflow-hidden">
        <TableHorizontalScroll>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="py-3 px-4 text-start text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('quickReplyTitle')}
                </th>
                <th className="py-3 px-4 text-start text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('quickReplyBodyColumn')}
                </th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-[120px]">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {rows.length === 0
                      ? t('noQuickReplies')
                      : `${t('search')} — ${t('noResultsFound')}`}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="bg-white dark:bg-gray-900/40">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-50 align-top">
                      {displayText(row.title)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 align-top">
                      <p className="line-clamp-2 whitespace-pre-wrap">{displayText(row.body)}</p>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-primary-700 dark:hover:text-primary-200"
                          title={t('edit')}
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(row)}
                          className="p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-red-600"
                          title={t('deleteQuickReply')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableHorizontalScroll>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? t('editQuickReply') : t('addQuickReply')}
        maxWidth="lg"
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('quickReplyTitle')}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('quickReplyTitle')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('quickReplyBody')}
            </label>
            <AutoDirTextarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('quickReplyBody')}
              rows={5}
              className={fieldClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              disabled={!title.trim() || !body.trim()}
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
