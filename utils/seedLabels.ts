/**
 * English seed keys stored by the API, and the Arabic label shown when the UI
 * language is Arabic. Custom names are returned unchanged.
 */
const SEED_LABELS: Record<string, string> = {
  WhatsApp: 'واتساب',
  Phone: 'الهاتف',
  Website: 'الموقع الإلكتروني',
  'Social media': 'وسائل التواصل',
  'New inquiry': 'استفسار جديد',
  Qualification: 'تأهيل',
  'Viewing scheduled': 'معاينة مجدولة',
  Negotiation: 'تفاوض',
  Closed: 'مغلق',
  'New patient': 'مريض جديد',
  Registered: 'مسجّل',
  'With doctor': 'عند الطبيب',
  'Follow-up': 'متابعة',
  Completed: 'مكتمل',
  'New lead': 'عميل جديد',
  Discovery: 'استكشاف',
  Proposal: 'عرض سعر',
  'On-site appointment': 'موعد ميداني',
  'Quote sent': 'تم إرسال العرض',
  'Order placed': 'تم الطلب',
  Fulfillment: 'تجهيز الطلب',
  Contacted: 'تم التواصل',
  Qualified: 'مؤهل',
  'Follow up': 'متابعة',
  'Closed won': 'مغلق رابح',
  'Closed lost': 'مغلق خاسر',
  Visited: 'تمت الزيارة',
  'Phone call': 'مكالمة هاتفية',
  'Video call': 'مكالمة فيديو',
  'Property viewing': 'معاينة عقار',
  'Office consultation': 'استشارة في المكتب',
  'Virtual tour': 'جولة افتراضية',
  'First consultation': 'استشارة أولى',
  'Follow-up visit': 'زيارة متابعة',
  'Procedure / treatment': 'إجراء أو علاج',
  'On-site service': 'خدمة ميدانية',
  'Office appointment': 'موعد في المكتب',
  'Remote consultation': 'استشارة عن بعد',
  Sales: 'المبيعات',
  'In progress': 'قيد التنفيذ',
  'On hold': 'معلّقة',
  Won: 'رابحة',
  Lost: 'خاسرة',
  Cancelled: 'ملغاة',
  Price: 'السعر',
  Competitor: 'منافس',
  'No response': 'لا يوجد رد',
  'Not a fit': 'غير مناسب',
  Other: 'أخرى',
};

export function seedLabel(name: string | null | undefined, language: string): string {
  if (!name) return '';
  if (language !== 'ar') return name;
  return SEED_LABELS[name] ?? name;
}

/** Value to persist. The Arabic label of an untouched seed row stays the English key. */
export function seedNameForSave(edited: string, stored: string, language: string): string {
  const next = edited.trim();
  if (next === stored || next === seedLabel(stored, language)) return stored;
  return next;
}
