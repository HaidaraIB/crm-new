import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getCompanyRoute, navigateToCompanyRoute } from '../../utils/routing';
import { readImpersonation } from '../../utils/impersonation';
import PromoBar from './PromoBar';

/**
 * Promotion bar inside the logged-in shell. Only company owners can buy, so
 * only they see it; support staff impersonating an owner do not.
 */
const DashboardPromoBar: React.FC = () => {
  const { currentUser, setCurrentPage, currentPage } = useAppContext();
  const impersonating = useMemo(() => Boolean(readImpersonation()), []);
  const isOwner = Boolean((currentUser as any)?.is_company_owner ?? (currentUser as any)?.isCompanyOwner);
  if (!isOwner || impersonating) return null;

  const company = currentUser?.company;
  return (
    <PromoBar
      audience="dashboard"
      defaultHref={getCompanyRoute(company?.name, company?.domain, 'Billing')}
      hideDefaultCta={currentPage === 'Billing'}
      onDefaultCta={() => {
        setCurrentPage('Billing');
        navigateToCompanyRoute(company?.name, company?.domain, 'Billing');
      }}
    />
  );
};

export default DashboardPromoBar;
