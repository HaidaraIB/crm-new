import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from '../Alert';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';
import { useAppContext } from '../../context/AppContext';
import { useUsers } from '../../hooks/useQueries';
import { buildLeadAssigneePickerOptions } from '../../utils/roles';
import type { SocialConversationPayload } from '../../services/api';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  conversation: SocialConversationPayload | null;
  onSubmit: (payload: {
    name: string;
    phone?: string;
    assignedTo: number | null;
    autoAssign: boolean;
    notes?: string;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

/**
 * Convert an inbox conversation into a CRM lead.
 *
 * Phone is optional on purpose: Instagram and Messenger carry no phone number,
 * so most leads created here have none. The backend refuses to fabricate one —
 * a placeholder would consume the company-wide unique phone key.
 */
export const ConvertConversationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  conversation,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const { t, currentUser } = useAppContext();
  const { data: users } = useUsers();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);
  const [assignedTo, setAssignedTo] = useState<number | null>(null);

  // Reuses the shared picker rule so call-center/data-entry never appear as
  // assignees here either — see utils/roles.ts showInLeadAssigneePicker.
  const assignees = useMemo(
    () =>
      buildLeadAssigneePickerOptions(
        Array.isArray(users) ? (users as any[]) : [],
        currentUser as any
      ),
    [users, currentUser]
  );

  useEffect(() => {
    if (!isOpen || !conversation) return;
    const contact = conversation.contact;
    setName(contact?.name || contact?.username || contact?.display_name || '');
    setPhone('');
    setNotes('');
    setAutoAssign(true);
    setAssignedTo(null);
  }, [isOpen, conversation]);

  if (!conversation) return null;

  const handleSubmit = async () => {
    await onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      assignedTo: autoAssign ? null : assignedTo,
      autoAssign,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('convertConversationTitle')} maxWidth="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('convertConversationHint')}
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('leadName')}
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('phoneOptional')}
          </label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('phoneOptionalHint')}</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            {t('autoAssign')}
          </label>

          {!autoAssign && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('pickAssignee')}
              </label>
              <select
                value={assignedTo ?? ''}
                onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">{t('unassigned')}</option>
                {assignees.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {errorMessage && (
          <Alert variant="error">{errorMessage}</Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={!name.trim()}>
            {t('convertToLead')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConvertConversationModal;
