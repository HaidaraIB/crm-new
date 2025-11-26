import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

interface Country {
    code: string;
    name: string;
    nameAr: string;
    dialCode: string;
    flag: string;
}

const countries: Country[] = [
    { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', dialCode: '+966', flag: '🇸🇦' },
    { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', dialCode: '+971', flag: '🇦🇪' },
    { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', dialCode: '+965', flag: '🇰🇼' },
    { code: 'QA', name: 'Qatar', nameAr: 'قطر', dialCode: '+974', flag: '🇶🇦' },
    { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', dialCode: '+973', flag: '🇧🇭' },
    { code: 'OM', name: 'Oman', nameAr: 'عمان', dialCode: '+968', flag: '🇴🇲' },
    { code: 'JO', name: 'Jordan', nameAr: 'الأردن', dialCode: '+962', flag: '🇯🇴' },
    { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', flag: '🇱🇧' },
    { code: 'EG', name: 'Egypt', nameAr: 'مصر', dialCode: '+20', flag: '🇪🇬' },
    { code: 'IQ', name: 'Iraq', nameAr: 'العراق', dialCode: '+964', flag: '🇮🇶' },
    { code: 'SY', name: 'Syria', nameAr: 'سوريا', dialCode: '+963', flag: '🇸🇾' },
    { code: 'YE', name: 'Yemen', nameAr: 'اليمن', dialCode: '+967', flag: '🇾🇪' },
    { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', dialCode: '+970', flag: '🇵🇸' },
    { code: 'MA', name: 'Morocco', nameAr: 'المغرب', dialCode: '+212', flag: '🇲🇦' },
    { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', dialCode: '+213', flag: '🇩🇿' },
    { code: 'TN', name: 'Tunisia', nameAr: 'تونس', dialCode: '+216', flag: '🇹🇳' },
    { code: 'LY', name: 'Libya', nameAr: 'ليبيا', dialCode: '+218', flag: '🇱🇾' },
    { code: 'SD', name: 'Sudan', nameAr: 'السودان', dialCode: '+249', flag: '🇸🇩' },
    { code: 'SO', name: 'Somalia', nameAr: 'الصومال', dialCode: '+252', flag: '🇸🇴' },
    { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي', dialCode: '+253', flag: '🇩🇯' },
    { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا', dialCode: '+222', flag: '🇲🇷' },
    { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', dialCode: '+1', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', nameAr: 'كندا', dialCode: '+1', flag: '🇨🇦' },
    { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', flag: '🇬🇧' },
    { code: 'IE', name: 'Ireland', nameAr: 'أيرلندا', dialCode: '+353', flag: '🇮🇪' },
    { code: 'FR', name: 'France', nameAr: 'فرنسا', dialCode: '+33', flag: '🇫🇷' },
    { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', dialCode: '+49', flag: '🇩🇪' },
    { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', dialCode: '+39', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', dialCode: '+34', flag: '🇪🇸' },
    { code: 'PT', name: 'Portugal', nameAr: 'البرتغال', dialCode: '+351', flag: '🇵🇹' },
    { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', dialCode: '+31', flag: '🇳🇱' },
    { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا', dialCode: '+32', flag: '🇧🇪' },
    { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', dialCode: '+41', flag: '🇨🇭' },
    { code: 'AT', name: 'Austria', nameAr: 'النمسا', dialCode: '+43', flag: '🇦🇹' },
    { code: 'SE', name: 'Sweden', nameAr: 'السويد', dialCode: '+46', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', nameAr: 'النرويج', dialCode: '+47', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك', dialCode: '+45', flag: '🇩🇰' },
    { code: 'FI', name: 'Finland', nameAr: 'فنلندا', dialCode: '+358', flag: '🇫🇮' },
    { code: 'PL', name: 'Poland', nameAr: 'بولندا', dialCode: '+48', flag: '🇵🇱' },
    { code: 'CZ', name: 'Czech Republic', nameAr: 'التشيك', dialCode: '+420', flag: '🇨🇿' },
    { code: 'GR', name: 'Greece', nameAr: 'اليونان', dialCode: '+30', flag: '🇬🇷' },
    { code: 'RU', name: 'Russia', nameAr: 'روسيا', dialCode: '+7', flag: '🇷🇺' },
    { code: 'UA', name: 'Ukraine', nameAr: 'أوكرانيا', dialCode: '+380', flag: '🇺🇦' },
    { code: 'IN', name: 'India', nameAr: 'الهند', dialCode: '+91', flag: '🇮🇳' },
    { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', dialCode: '+92', flag: '🇵🇰' },
    { code: 'BD', name: 'Bangladesh', nameAr: 'بنغلاديش', dialCode: '+880', flag: '🇧🇩' },
    { code: 'AF', name: 'Afghanistan', nameAr: 'أفغانستان', dialCode: '+93', flag: '🇦🇫' },
    { code: 'TR', name: 'Turkey', nameAr: 'تركيا', dialCode: '+90', flag: '🇹🇷' },
    { code: 'IR', name: 'Iran', nameAr: 'إيران', dialCode: '+98', flag: '🇮🇷' },
    { code: 'CN', name: 'China', nameAr: 'الصين', dialCode: '+86', flag: '🇨🇳' },
    { code: 'JP', name: 'Japan', nameAr: 'اليابان', dialCode: '+81', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية', dialCode: '+82', flag: '🇰🇷' },
    { code: 'TH', name: 'Thailand', nameAr: 'تايلاند', dialCode: '+66', flag: '🇹🇭' },
    { code: 'VN', name: 'Vietnam', nameAr: 'فيتنام', dialCode: '+84', flag: '🇻🇳' },
    { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا', dialCode: '+62', flag: '🇮🇩' },
    { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', dialCode: '+60', flag: '🇲🇾' },
    { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة', dialCode: '+65', flag: '🇸🇬' },
    { code: 'PH', name: 'Philippines', nameAr: 'الفلبين', dialCode: '+63', flag: '🇵🇭' },
    { code: 'AU', name: 'Australia', nameAr: 'أستراليا', dialCode: '+61', flag: '🇦🇺' },
    { code: 'NZ', name: 'New Zealand', nameAr: 'نيوزيلندا', dialCode: '+64', flag: '🇳🇿' },
    { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', dialCode: '+27', flag: '🇿🇦' },
    { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا', dialCode: '+234', flag: '🇳🇬' },
    { code: 'KE', name: 'Kenya', nameAr: 'كينيا', dialCode: '+254', flag: '🇰🇪' },
    { code: 'GH', name: 'Ghana', nameAr: 'غانا', dialCode: '+233', flag: '🇬🇭' },
    { code: 'ET', name: 'Ethiopia', nameAr: 'إثيوبيا', dialCode: '+251', flag: '🇪🇹' },
    { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', dialCode: '+55', flag: '🇧🇷' },
    { code: 'MX', name: 'Mexico', nameAr: 'المكسيك', dialCode: '+52', flag: '🇲🇽' },
    { code: 'AR', name: 'Argentina', nameAr: 'الأرجنتين', dialCode: '+54', flag: '🇦🇷' },
    { code: 'CO', name: 'Colombia', nameAr: 'كولومبيا', dialCode: '+57', flag: '🇨🇴' },
    { code: 'CL', name: 'Chile', nameAr: 'تشيلي', dialCode: '+56', flag: '🇨🇱' },
    { code: 'PE', name: 'Peru', nameAr: 'بيرو', dialCode: '+51', flag: '🇵🇪' },
    { code: 'VE', name: 'Venezuela', nameAr: 'فنزويلا', dialCode: '+58', flag: '🇻🇪' },
    { code: 'EC', name: 'Ecuador', nameAr: 'الإكوادور', dialCode: '+593', flag: '🇪🇨' },
];

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
    defaultCountry = 'SA',
}) => {
    const { language } = useAppContext();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
        return countries.find(c => c.code === defaultCountry) || countries[0];
    });
    const [phoneNumber, setPhoneNumber] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            const country = countries.find(c => value.startsWith(c.dialCode));
            if (country) {
                setSelectedCountry(country);
                setPhoneNumber(value.replace(country.dialCode, '').trim());
            } else {
                setPhoneNumber(value.replace(/\D/g, ''));
            }
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setIsDropdownOpen(false);
        const fullNumber = country.dialCode + phoneNumber;
        onChange?.(fullNumber);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digitsOnly = e.target.value.replace(/\D/g, '');
        setPhoneNumber(digitsOnly);
        onChange?.(selectedCountry.dialCode + digitsOnly);
    };

    const isRTL = language === 'ar';

    return (
        <div className={`relative ${className}`}>
            <div 
                className={`flex items-center border rounded-md ${
                    error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
                } bg-gray-50 dark:bg-gray-800 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary`}
                dir="ltr"
            >
                {/* Country Selector */}
                <div className="relative flex-shrink-0" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDropdownOpen(!isDropdownOpen);
                        }}
                        className="flex items-center gap-2 px-3 py-2 border-r dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                        dir="ltr"
                    >
                        <span className="text-xl flex-shrink-0">{selectedCountry.flag}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3.5rem] text-left">
                            {selectedCountry.dialCode}
                        </span>
                        <svg
                            className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown */}
                    {isDropdownOpen && (
                        <div 
                            className="absolute z-[9999] left-0 top-full mt-1 w-72 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-xl"
                            dir="ltr"
                            style={{ position: 'absolute' }}
                        >
                            {countries.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCountrySelect(country);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                                        selectedCountry.code === country.code 
                                            ? 'bg-primary-50 dark:bg-primary-900/20' 
                                            : ''
                                    }`}
                                    dir="ltr"
                                >
                                    <span className="text-xl flex-shrink-0">{country.flag}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {language === 'ar' ? country.nameAr : country.name}
                                        </div>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
                                        {country.dialCode}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Phone Input */}
                <input
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder={placeholder}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={`flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 min-w-0 ${
                        isRTL ? 'text-right' : 'text-left'
                    }`}
                />
            </div>
        </div>
    );
};
