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
        const allGateways = Array.isArray(data) ? data : [];
        
        // Find Paytabs and Stripe gateways
        const paytabsGateway = allGateways.find(g => g.name.toLowerCase().includes('paytabs'));
        const stripeGateway = allGateways.find(g => g.name.toLowerCase().includes('stripe'));
        
        // Filter out Paytabs and Stripe from the list (keep QiCard and Zain Cash as separate options)
        const otherGateways = allGateways.filter(g => {
          const nameLower = g.name.toLowerCase();
          return !nameLower.includes('paytabs') && !nameLower.includes('stripe');
        });
        
        // Determine which card payment gateway to use
        let cardPaymentGateway: PaymentGateway | null = null;
        
        if (paytabsGateway && stripeGateway) {
          // Both active - prioritize Paytabs (shouldn't happen, but handle it)
          cardPaymentGateway = paytabsGateway;
        } else if (paytabsGateway) {
          // Only Paytabs active
          cardPaymentGateway = paytabsGateway;
        } else if (stripeGateway) {
          // Only Stripe active
          cardPaymentGateway = stripeGateway;
        }
        // If neither is active, cardPaymentGateway remains null
        
        // Combine card payment (if exists) with other gateways
        const processedGateways = cardPaymentGateway 
          ? [cardPaymentGateway, ...otherGateways]
          : otherGateways;
        
        setGateways(processedGateways);
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
      return <img src="/visa_master_logo.png" alt="Card Payment" className="h-10 w-auto object-contain" />;
    } else if (nameLower.includes('stripe')) {
      return <img src="/visa_master_logo.png" alt="Card Payment" className="h-10 w-auto object-contain" />;
    } else if (nameLower.includes('zaincash') || nameLower.includes('zain cash')) {
      return <img src="/zain_cash_logo.png" alt="Zain Cash" className="h-10 w-auto object-contain" />;
    } else if (nameLower.includes('qicard') || nameLower.includes('qi card') || nameLower.includes('qi-card')) {
      return <img src="/q_card_logo.svg" alt="QiCard" className="h-10 w-auto object-contain" />;
    } else if (nameLower.includes('fib') || nameLower.includes('first iraqi')) {
      return <span className="text-xl font-bold text-blue-700 dark:text-blue-400">FIB</span>;
    }
    return null;
  };

  const getGatewayDisplayName = (gatewayName: string) => {
    const nameLower = gatewayName.toLowerCase();
    if (nameLower.includes('paytabs') || nameLower.includes('stripe')) {
      return language === 'ar' 
        ? 'بطاقة الدفع'
        : 'Card Payment';
    }
    if (nameLower.includes('fib') || nameLower.includes('first iraqi')) {
      return language === 'ar' ? 'FIB (البنك العراقي الأول)' : 'FIB (First Iraqi Bank)';
    }
    return gatewayName;
  };

  const getGatewayDescription = (gatewayName: string) => {
    const nameLower = gatewayName.toLowerCase();
    // Don't show description if it's the same as display name
    if (nameLower.includes('paytabs') || nameLower.includes('stripe')) {
      return null;
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
      <label className="block text-sm font-medium mb-4 text-gray-700 dark:text-gray-300">
        {t('selectPaymentMethod') || 'Select Payment Method'}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gateways.map((gateway) => {
          const logo = getGatewayLogo(gateway.name);
          const displayName = getGatewayDisplayName(gateway.name);
          const isSelected = selectedGateway === gateway.id;
          return (
            <button
              key={gateway.id}
              type="button"
              onClick={() => onSelect(gateway.id)}
              className={`group relative flex flex-col items-center justify-center gap-3 p-6 border-2 rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/60 hover:shadow-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {logo && (
                <div className={`transition-transform duration-200 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {logo}
                </div>
              )}
              <div className={`text-sm font-medium transition-colors ${
                isSelected
                  ? 'text-primary dark:text-primary'
                  : 'text-gray-700 dark:text-gray-300 group-hover:text-primary'
              }`}>
                {displayName}
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

