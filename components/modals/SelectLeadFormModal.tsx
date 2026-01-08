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
  pageId: string;
  pageName: string;
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
  pageId,
  pageName,
  onSuccess,
}) => {
  const { t, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  // Fetch lead forms
  const { data: leadFormsData, isLoading: loadingForms } = useLeadForms(accountId, pageId);
  const leadForms = leadFormsData?.lead_forms || [];

  // Fetch campaigns
  const { data: campaignsData } = useCampaigns();
  const campaigns = campaignsData?.results || [];

  // Select lead form mutation
  const selectFormMutation = useSelectLeadForm();

  useEffect(() => {
    if (isOpen) {
      setSelectedFormId('');
      setSelectedCampaignId('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedFormId) {
      alert(t('pleaseSelectLeadForm') || 'Please select a lead form');
      return;
    }

    try {
      await selectFormMutation.mutateAsync({
        accountId,
        data: {
          page_id: pageId,
          form_id: selectedFormId,
          campaign_id: selectedCampaignId ? parseInt(selectedCampaignId) : undefined,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('selectLeadForm') || 'Select Lead Form'}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('selectLeadFormForPage') || 'Select a lead form for'}: <strong>{pageName}</strong>
          </p>
        </div>

        {loadingForms ? (
          <div className="flex items-center justify-center py-8">
            <Loader variant="primary" className="h-8" />
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



