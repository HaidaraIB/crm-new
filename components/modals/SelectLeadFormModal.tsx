import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Loader } from '../Loader';
import { useLeadForms, useSelectLeadForm, useCampaigns } from '../../hooks/useQueries';

interface SelectLeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  /** Facebook Pages returned from Meta ( /me/accounts ); user picks one to load leadgen_forms */
  pages: { id: string; name: string }[];
  /** When set, this page id has selected_form_id in CRM metadata (pre-fill when that page is selected) */
  linkedPageId?: string;
  linkedFormId?: string;
  linkedCampaignId?: string;
  onSuccess?: () => void;
}

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    {children}
  </label>
);

const Select = ({
  id,
  children,
  value,
  onChange,
  disabled,
}: {
  id: string;
  children?: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}) => (
  <select
    id={id}
    value={value}
    onChange={onChange}
    disabled={disabled}
    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {children}
  </select>
);

export const SelectLeadFormModal: React.FC<SelectLeadFormModalProps> = ({
  isOpen,
  onClose,
  accountId,
  pages,
  linkedPageId,
  linkedFormId: initialFormId,
  linkedCampaignId: initialCampaignId,
  onSuccess,
}) => {
  const { t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !pages.length) return;
    const initial =
      linkedPageId && pages.some((p) => p.id === linkedPageId) ? linkedPageId : pages[0].id;
    setSelectedPageId(initial);
    if (linkedPageId && initial === linkedPageId) {
      setSelectedFormId(initialFormId ?? '');
      setSelectedCampaignId(initialCampaignId ?? '');
    } else {
      setSelectedFormId('');
      setSelectedCampaignId('');
    }
  }, [isOpen, pages, linkedPageId, initialFormId, initialCampaignId]);

  const { data: leadFormsData, isLoading: loadingForms, isError: leadFormsError, error: leadFormsErrorObj } =
    useLeadForms(accountId, selectedPageId || null);
  const leadForms = leadFormsData?.lead_forms || [];
  const errorMessage = leadFormsErrorObj && (leadFormsErrorObj as any)?.message;

  const { data: campaignsData } = useCampaigns();
  const campaigns = campaignsData?.results || [];

  const selectFormMutation = useSelectLeadForm();

  const selectedPageName = pages.find((p) => p.id === selectedPageId)?.name || selectedPageId;

  const handleSubmit = async () => {
    if (!selectedFormId) {
      alert(t('pleaseSelectLeadForm') || 'Please select a lead form');
      return;
    }

    try {
      await selectFormMutation.mutateAsync({
        accountId,
        data: {
          page_id: selectedPageId,
          form_id: selectedFormId,
          campaign_id: selectedCampaignId ? parseInt(selectedCampaignId, 10) : undefined,
        },
      });

      setSuccessMessage(t('leadFormLinkedSuccessfully') || 'Lead form linked successfully!');
      setIsSuccessModalOpen(true);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error linking lead form:', error);
      alert(error?.message || t('errorLinkingLeadForm') || 'Failed to link lead form. Please try again.');
    }
  };

  const onPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setSelectedPageId(next);
    if (linkedPageId && next === linkedPageId) {
      setSelectedFormId(initialFormId ?? '');
      setSelectedCampaignId(initialCampaignId ?? '');
    } else {
      setSelectedFormId('');
      setSelectedCampaignId('');
    }
  };

  if (!pages.length) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('selectLeadForm') || 'Select Lead Form'}>
      <div className="space-y-4">
        {pages.length > 1 && (
          <div>
            <Label htmlFor="meta-page">{t('selectFacebookPage') || 'Facebook Page'}</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t('selectPageForLeadFormsHint') ||
                'Choose the Page that runs your Lead Ads. Forms are loaded from that Page only.'}
            </p>
            <Select id="meta-page" value={selectedPageId} onChange={onPageChange} disabled={selectFormMutation.isPending}>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('selectLeadFormForPage') || 'Select a lead form for'}: <strong>{selectedPageName}</strong>
          </p>
        </div>

        {loadingForms ? (
          <div className="flex items-center justify-center py-8">
            <Loader variant="primary" className="h-8" />
          </div>
        ) : leadFormsError && errorMessage ? (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        ) : leadForms.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t('noLeadFormsFound') || 'No lead forms found for this page'}
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="lead-form">{t('leadForm') || 'Lead Form'}</Label>
              <Select
                id="lead-form"
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                disabled={selectFormMutation.isPending}
              >
                <option value="">{t('selectLeadForm') || 'Select a lead form'}</option>
                {leadForms.map((form: any) => (
                  <option key={form.id} value={form.id}>
                    {form.name} ({form.leads_count || 0} {t('leads') || 'leads'})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="campaign">
                {t('campaign') || 'Campaign'} ({t('optional') || 'Optional'})
              </Label>
              <Select
                id="campaign"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                disabled={selectFormMutation.isPending}
              >
                <option value="">{t('noCampaign') || 'No campaign'}</option>
                {campaigns.map((campaign: any) => (
                  <option key={campaign.id} value={campaign.id.toString()}>
                    {campaign.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('campaignDescription') || 'Leads from this form will be automatically linked to the selected campaign'}
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={selectFormMutation.isPending}>
            {t('cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFormId || selectFormMutation.isPending || loadingForms}
            loading={selectFormMutation.isPending}
          >
            {t('link') || 'Link'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
