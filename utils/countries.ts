/**
 * Dial-code country list for PhoneInput.
 * Keep in sync with CRM-admin-panel/utils/countries.ts and crm_mobile/lib/core/constants/countries.dart.
 */

export interface Country {
  code: string;
  name: string;
  nameAr: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', dialCode: '+963', flag: '🇸🇾' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', dialCode: '+964', flag: '🇮🇶' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', dialCode: '+971', flag: '🇦🇪' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', dialCode: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', dialCode: '+974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', dialCode: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', nameAr: 'عمان', dialCode: '+968', flag: '🇴🇲' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', dialCode: '+962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', flag: '🇱🇧' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', dialCode: '+20', flag: '🇪🇬' },
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

/** Countries sorted by dial-code length descending for longest-prefix matching. */
const BY_DIAL_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
);

export function getCountryByCode(code: string, fallback = 'IQ'): Country {
  return (
    COUNTRIES.find((c) => c.code === code) ||
    COUNTRIES.find((c) => c.code === fallback) ||
    COUNTRIES[0]
  );
}

/** Match E.164 value to the longest dial-code prefix. */
export function matchCountryByPhone(value: string): { country: Country; national: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const country = BY_DIAL_LENGTH.find((c) => trimmed.startsWith(c.dialCode));
  if (!country) return null;
  const national = trimmed.slice(country.dialCode.length).replace(/\D/g, '');
  return { country, national };
}

/** PNG flag URL (Windows does not render emoji flags as images). */
export function countryFlagSrc(code: string, width: 20 | 40 = 40): string {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}

export function filterCountries(query: string, language: 'en' | 'ar'): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES;
  return COUNTRIES.filter((c) => {
    const name = (language === 'ar' ? c.nameAr : c.name).toLowerCase();
    return (
      name.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(query.trim()) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });
}
