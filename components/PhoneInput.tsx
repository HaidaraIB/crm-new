import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Country,
  getCountryByCode,
  matchCountryByPhone,
  filterCountries,
  countryFlagSrc,
} from '../utils/countries';

function CountryFlag({ code, size = 'sm' }: { code: string; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-[14px] w-[18px]' : 'h-4 w-5';
  return (
    <img
      src={countryFlagSrc(code)}
      srcSet={`${countryFlagSrc(code)} 1x, https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      alt=""
      width={size === 'sm' ? 18 : 20}
      height={size === 'sm' ? 14 : 16}
      loading="lazy"
      decoding="async"
      className={`${dims} rounded-[2px] object-cover flex-shrink-0`}
      aria-hidden
    />
  );
}

interface PhoneInputProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  defaultCountry?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  id,
  value = '',
  onChange,
  placeholder,
  className = '',
  error = false,
  defaultCountry = 'IQ',
}) => {
  const { language, t } = useAppContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(() =>
    getCountryByCode(defaultCountry)
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      const matched = matchCountryByPhone(value);
      if (matched) {
        setSelectedCountry(matched.country);
        setPhoneNumber(matched.national);
      } else {
        setPhoneNumber(value.replace(/\D/g, ''));
      }
    } else {
      setSelectedCountry(getCountryByCode(defaultCountry));
      setPhoneNumber('');
    }
  }, [value, defaultCountry]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isDropdownOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isDropdownOpen]);

  const filteredCountries = useMemo(
    () => filterCountries(searchQuery, language === 'ar' ? 'ar' : 'en'),
    [searchQuery, language]
  );

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery('');
    onChange?.(country.dialCode + phoneNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPhoneNumber(digitsOnly);
    onChange?.(selectedCountry.dialCode + digitsOnly);
  };

  return (
    <div className={`relative ${className}`} dir="ltr">
      <div
        className={`flex items-center border rounded-md ${
          error
            ? 'border-red-500 dark:border-red-500'
            : 'border-gray-300 dark:border-gray-700'
        } bg-gray-50 dark:bg-gray-800 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary`}
      >
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            aria-label={t('searchCountries')}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDropdownOpen((open) => !open);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 border-r border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap rounded-l-md"
          >
            <CountryFlag code={selectedCountry.code} size="sm" />
            <span className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 tabular-nums">
              {selectedCountry.dialCode}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-gray-500 transition-transform flex-shrink-0 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div
              className="absolute z-[9999] left-0 top-full mt-1 w-72 max-h-80 flex flex-col bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-xl overflow-hidden"
              role="listbox"
            >
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchCountries')}
                  dir="ltr"
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsDropdownOpen(false);
                      setSearchQuery('');
                    }
                  }}
                />
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 max-h-64">
                {filteredCountries.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    —
                  </div>
                ) : (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      role="option"
                      aria-selected={selectedCountry.code === country.code}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCountrySelect(country);
                      }}
                      className={`w-full inline-flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                        selectedCountry.code === country.code
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : ''
                      }`}
                    >
                      <CountryFlag code={country.code} size="md" />
                      <span className="flex-1 min-w-0 text-sm font-medium leading-none text-gray-900 dark:text-gray-100 truncate">
                        {language === 'ar' ? country.nameAr : country.name}
                      </span>
                      <span className="text-sm leading-none text-gray-600 dark:text-gray-400 flex-shrink-0 tabular-nums">
                        {country.dialCode}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          dir="ltr"
          className="flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 min-w-0 text-left rounded-r-md"
        />
      </div>
    </div>
  );
};
