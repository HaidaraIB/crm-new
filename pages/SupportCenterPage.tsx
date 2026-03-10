import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Input, Button, Modal } from '../components/index';
import { EyeIcon, RefreshIcon } from '../components/icons';
import { createSupportTicketAPI, getSupportTicketsAPI } from '../services/api';

type TicketAttachment = { id: number; file: string; url: string; created_at: string };

type TicketItem = {
  id: number;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  attachments?: TicketAttachment[];
};

const Label = ({
  children,
  htmlFor,
}: {
  children?: React.ReactNode;
  htmlFor: string;
}) => (
  <label
    htmlFor={htmlFor}
    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
  >
    {children}
  </label>
);

const statusLabelKey: Record<string, string> = {
  open: 'statusOpen',
  in_progress: 'statusInProgress',
  closed: 'statusClosed',
};

export const SupportCenterPage = () => {
  const { t } = useAppContext();
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: ticketsData, isLoading: ticketsLoading, isFetching: ticketsFetching, refetch: refetchTickets } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => getSupportTicketsAPI(),
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = t('supportTicketTitle') ? `${t('supportTicketTitle')} (required)` : 'Subject is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = t('supportTicketDescription') ? `${t('supportTicketDescription')} (required)` : 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      await createSupportTicketAPI({
        title: formData.title.trim(),
        description: formData.description.trim(),
        screenshots: screenshots.length ? screenshots : undefined,
      });
      setFormData({ title: '', description: '' });
      setScreenshots([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setErrors({});
      setSuccessMessage(t('ticketSubmittedSuccess') || 'Your request has been submitted successfully.');
      refetchTickets();
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tickets = ticketsData?.results ?? [];

  return (
    <PageWrapper title={t('supportCenter') || 'Support Center'}>
      <div className="space-y-6 w-full">
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('submitTicket') || 'Submit a request'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="support-title">{t('supportTicketTitle') || 'Subject'}</Label>
              <Input
                id="support-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={t('supportTicketTitle') || 'Subject'}
                error={errors.title}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="support-description">{t('supportTicketDescription') || 'Description'}</Label>
              <textarea
                id="support-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t('supportTicketDescription') || 'Describe your issue...'}
                rows={4}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
              )}
            </div>
            <div>
              <Label htmlFor="support-screenshots">{t('screenshots') || 'Screenshots (optional)'}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('screenshotsHint') || 'You can select multiple images.'}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  id="support-screenshots"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const newFiles = e.target.files ? Array.from(e.target.files) : [];
                    setScreenshots((prev) => {
                      const combined = [...prev];
                      newFiles.forEach((f) => {
                        if (!combined.some((ex) => ex.name === f.name && ex.size === f.size)) combined.push(f);
                      });
                      return combined;
                    });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label={t('chooseFiles') || 'Choose Files'}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {screenshots.length === 0
                    ? (t('noFileChosen') || 'No file chosen')
                    : (t('filesChosen') || '{count} file(s) chosen').replace('{count}', String(screenshots.length))}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  {t('chooseFiles') || 'Choose Files'}
                </button>
              </div>
              {screenshots.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {screenshots.map((f, i) => (
                    <li key={`${f.name}-${f.size}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 text-sm text-gray-700 dark:text-gray-200">
                      <span className="truncate max-w-[120px]">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setScreenshots((prev) => prev.filter((_, j) => j !== i))}
                        className="text-red-600 dark:text-red-400 hover:underline"
                        aria-label={t('remove') || 'Remove'}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.submit && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            )}
            {successMessage && (
              <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (t('loading') || 'Sending...') : (t('submitTicket') || 'Submit')}
            </Button>
          </form>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('myTickets') || 'My Tickets'}
            </h2>
            <button
              type="button"
              onClick={() => refetchTickets()}
              disabled={ticketsFetching}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshIcon className="w-4 h-4" />
              {t('refresh') || 'Refresh'}
            </button>
          </div>
          {ticketsLoading ? (
            <div className="p-6 text-gray-500 dark:text-gray-400 text-center">
              {t('loading') || 'Loading...'}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-gray-500 dark:text-gray-400 text-center">
              {t('noData') || 'No tickets yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      {t('supportTicketTitle') || 'Subject'}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('status') || 'Status'}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('date') || 'Date'}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(ticket)}
                          className="cursor-pointer hover:underline focus:outline-none focus:underline text-left"
                        >
                          {ticket.title}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            ticket.status === 'closed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : ticket.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                          }`}
                        >
                          {t(statusLabelKey[ticket.status] || 'statusOpen') || ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {ticket.created_at
                          ? new Date(ticket.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(ticket)}
                          className="inline-flex items-center justify-center p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
                          title={t('viewDetails') || 'View details'}
                          aria-label={t('viewDetails') || 'View details'}
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.title ?? ''}
        maxWidth="lg"
      >
        {selectedTicket && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                {t('supportTicketDescription') || 'Description'}
              </h3>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 p-4">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description || '—'}
                </p>
              </div>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                {t('details') || 'Details'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 border border-gray-100 dark:border-gray-600/40">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('status') || 'Status'}</p>
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg ${
                      selectedTicket.status === 'closed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                        : selectedTicket.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                    }`}
                  >
                    {t(statusLabelKey[selectedTicket.status] || 'statusOpen') || selectedTicket.status}
                  </span>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 border border-gray-100 dark:border-gray-600/40">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('date') || 'Date'}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : '—'}
                  </p>
                </div>
                {selectedTicket.updated_at && (
                  <div className="sm:col-span-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 border border-gray-100 dark:border-gray-600/40">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('updatedAt') || 'Last updated'}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {new Date(selectedTicket.updated_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </section>
            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  {t('screenshots') || 'Screenshots'}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {selectedTicket.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700/50 hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                      <img
                        src={att.url}
                        alt=""
                        className="h-24 w-auto object-cover max-w-[180px]"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
};
