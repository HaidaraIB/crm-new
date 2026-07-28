import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useCampaigns } from '../../hooks/useQueries';
import type { MarketingReportFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_MARKETING_REPORT_FILTERS: MarketingReportFilters = {
  selectedCampaign: 'all',
  startDate: '',
  endDate: '',
};

export const MarketingReportFilterDrawer = () => {
  const {
    isMarketingReportFilterDrawerOpen,
    setIsMarketingReportFilterDrawerOpen,
    t,
    marketingReportFilters,
    setMarketingReportFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(marketingReportFilters);

  const { data: campaignsData, isLoading: campaignsLoading, error: campaignsError } =
    useCampaigns();
  const campaigns = Array.isArray(campaignsData)
    ? campaignsData
    : campaignsData?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(marketingReportFilters);
  }, [marketingReportFilters]);

  const handleClose = () => {
    setLocalFilters(marketingReportFilters);
    setIsMarketingReportFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof MarketingReportFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_MARKETING_REPORT_FILTERS);
    setMarketingReportFilters(DEFAULT_MARKETING_REPORT_FILTERS);
  };

  const handleApply = () => {
    setMarketingReportFilters(localFilters);
    setIsMarketingReportFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isMarketingReportFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterMarketingReport')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('reportInfo')}>
        <div className="space-y-3">
          <div>
            <FilterLabel htmlFor="marketing-report-filter-campaign">{t('campaign')}</FilterLabel>
            <FilterSelect
              id="marketing-report-filter-campaign"
              value={localFilters.selectedCampaign}
              onChange={(e) => handleFilterChange('selectedCampaign', e.target.value)}
            >
              <option value="all">{t('allCampaigns')}</option>
              {campaignsLoading ? (
                <option disabled>{t('loading')}</option>
              ) : campaignsError ? (
                <option disabled>{t('errorLoadingCampaigns')}</option>
              ) : (
                (campaigns || []).map((campaign) => (
                  <option key={campaign.id} value={campaign.id.toString()}>
                    {campaign.name}
                  </option>
                ))
              )}
            </FilterSelect>
          </div>
          <div>
            <FilterLabel htmlFor="marketing-report-filter-start-date">{t('startDate')}</FilterLabel>
            <FilterInput
              id="marketing-report-filter-start-date"
              type="date"
              value={localFilters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="marketing-report-filter-end-date">{t('endDate')}</FilterLabel>
            <FilterInput
              id="marketing-report-filter-end-date"
              type="date"
              value={localFilters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
