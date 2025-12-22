import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getPublicPaymentGatewaysAPI } from '../services/api';

interface PaymentGateway {
  id: number;
  name: string;
  description?: string;
}

interface PaymentGatewaySelectorProps {
  selectedGateway: number | null;
  onSelect: (gatewayId: number) => void;
  className?: string;
}

export const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = ({
  selectedGateway,
  onSelect,
  className = '',
}) => {
  const { t, language } = useAppContext();
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGateways = async () => {
      try {
        setLoading(true);
        const data = await getPublicPaymentGatewaysAPI();
        setGateways(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Error loading payment gateways:', err);
        setError(err.message || 'Failed to load payment gateways');
      } finally {
        setLoading(false);
      }
    };

    loadGateways();
  }, []);

  const getGatewayLogo = (gatewayName: string) => {
    const nameLower = gatewayName.toLowerCase();
    if (nameLower.includes('paytabs')) {
      return <img src="/paytabs_logo.png" alt="PayTabs" className="h-8 w-auto object-contain" />;
    } else if (nameLower.includes('stripe')) {
      return <img src="/stripe_logo.png" alt="Stripe" className="h-8 w-auto object-contain" />;
    } else if (nameLower.includes('zaincash') || nameLower.includes('zain cash')) {
      return <img src="/zain_cash_logo.png" alt="Zain Cash" className="h-8 w-auto object-contain" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          {t('selectPaymentMethod') || 'Select Payment Method'}
        </label>
        <div className="flex items-center justify-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (gateways.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-300 px-4 py-3 rounded-md">
          {t('noPaymentGatewaysAvailable') || 'No payment gateways available'}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
        {t('selectPaymentMethod') || 'Select Payment Method'}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gateways.map((gateway) => {
          const logo = getGatewayLogo(gateway.name);
          return (
            <button
              key={gateway.id}
              type="button"
              onClick={() => onSelect(gateway.id)}
              className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all text-left ${
                selectedGateway === gateway.id
                  ? 'border-primary bg-primary/10 dark:bg-primary/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary/50 bg-white dark:bg-gray-800'
              }`}
            >
              {logo && <div className="flex-shrink-0">{logo}</div>}
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">{gateway.name}</div>
                {gateway.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {gateway.description}
                  </div>
                )}
              </div>
              {selectedGateway === gateway.id && (
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

