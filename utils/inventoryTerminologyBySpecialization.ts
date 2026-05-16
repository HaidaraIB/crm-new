import { translations } from '../constants';

type Lang = 'en' | 'ar';
type TranslationKey = keyof typeof translations.en;

type Pack = Partial<Record<TranslationKey, string>>;

/**
 * Medical tenants reuse the services inventory API but with clinic-catalog wording.
 * `services` / `products` / `real_estate` keep defaults from `constants.ts`.
 */
const MEDICAL_EN: Pack = {
  inventory: 'Clinical catalog',
  services: 'Procedures',
  servicePackages: 'Treatment packages',
  serviceProviders: 'Doctors',
  addService: 'Add procedure',
  editService: 'Edit procedure',
  deleteService: 'Delete procedure',
  confirmDeleteService: 'Are you sure you want to delete the procedure',
  addServicePackage: 'Add treatment package',
  editServicePackage: 'Edit treatment package',
  deleteServicePackage: 'Delete treatment package',
  confirmDeleteServicePackage: 'Are you sure you want to delete the treatment package',
  addServiceProvider: 'Add doctor',
  editServiceProvider: 'Edit doctor',
  deleteServiceProvider: 'Delete doctor',
  confirmDeleteServiceProvider: 'Are you sure you want to delete the doctor',
  enterServiceName: 'Enter procedure name',
  enterServiceDescription: 'Enter procedure description',
  noServicesAvailable: 'No procedures available',
  failedToCreateService: 'Failed to create procedure. Please try again.',
  failedToUpdateService: 'Failed to update procedure. Please try again.',
  failedToCreateServicePackage: 'Failed to create treatment package. Please try again.',
  failedToUpdateServicePackage: 'Failed to update treatment package. Please try again.',
  failedToCreateServiceProvider: 'Failed to create doctor. Please try again.',
  failedToUpdateServiceProvider: 'Failed to update doctor. Please try again.',
  servicesOnly:
    'This page is only available for services or medical-services companies.',
  supervisorsPermCanManageServices: 'Clinical catalog',
  errorLoadingServices: 'Error loading procedures. Please try again.',
  noServicesFound: 'No procedures found.',
  errorLoadingServicePackages: 'Error loading treatment packages. Please try again.',
  noServicePackagesFound: 'No treatment packages found.',
  errorLoadingServiceProviders: 'Error loading doctors. Please try again.',
  noServiceProvidersFound: 'No doctors found.',
  filterServicePackages: 'Filter treatment packages',
  filterServices: 'Filter procedures',
  serviceInfo: 'Procedure information',
  filterServiceProviders: 'Filter doctors',
  serviceCreatedSuccessfully: 'Procedure created successfully!',
  serviceUpdatedSuccessfully: 'Procedure updated successfully!',
  servicePackageCreatedSuccessfully: 'Treatment package created successfully!',
  servicePackageUpdatedSuccessfully: 'Treatment package updated successfully!',
  serviceProviderCreatedSuccessfully: 'Doctor created successfully!',
  serviceProviderUpdatedSuccessfully: 'Doctor updated successfully!',
  provider: 'Doctor',
  duration: 'Duration (minutes)',
};

const MEDICAL_AR: Pack = {
  inventory: 'الكتالوج الطبي',
  services: 'الإجراءات',
  servicePackages: 'باقات العلاج',
  serviceProviders: 'الأطباء',
  addService: 'إضافة إجراء',
  editService: 'تعديل إجراء',
  deleteService: 'حذف إجراء',
  confirmDeleteService: 'هل أنت متأكد أنك تريد حذف الإجراء',
  addServicePackage: 'إضافة باقة علاج',
  editServicePackage: 'تعديل باقة علاج',
  deleteServicePackage: 'حذف باقة علاج',
  confirmDeleteServicePackage: 'هل أنت متأكد أنك تريد حذف باقة العلاج',
  addServiceProvider: 'إضافة طبيب',
  editServiceProvider: 'تعديل طبيب',
  deleteServiceProvider: 'حذف طبيب',
  confirmDeleteServiceProvider: 'هل أنت متأكد أنك تريد حذف الطبيب',
  enterServiceName: 'أدخل اسم الإجراء',
  enterServiceDescription: 'أدخل وصف الإجراء',
  noServicesAvailable: 'لا توجد إجراءات متاحة',
  failedToCreateService: 'فشل إنشاء الإجراء. يرجى المحاولة مرة أخرى.',
  failedToUpdateService: 'فشل تحديث الإجراء. يرجى المحاولة مرة أخرى.',
  failedToCreateServicePackage: 'فشل إنشاء باقة العلاج. يرجى المحاولة مرة أخرى.',
  failedToUpdateServicePackage: 'فشل تحديث باقة العلاج. يرجى المحاولة مرة أخرى.',
  failedToCreateServiceProvider: 'فشل إنشاء الطبيب. يرجى المحاولة مرة أخرى.',
  failedToUpdateServiceProvider: 'فشل تحديث الطبيب. يرجى المحاولة مرة أخرى.',
  servicesOnly: 'هذه الصفحة متاحة فقط لشركات الخدمات أو خدمات طبية.',
  supervisorsPermCanManageServices: 'الكتالوج الطبي',
  errorLoadingServices: 'خطأ في تحميل الإجراءات. يرجى المحاولة مرة أخرى.',
  noServicesFound: 'لم يتم العثور على إجراءات.',
  errorLoadingServicePackages: 'خطأ في تحميل باقات العلاج. يرجى المحاولة مرة أخرى.',
  noServicePackagesFound: 'لم يتم العثور على باقات علاج.',
  errorLoadingServiceProviders: 'خطأ في تحميل الأطباء. يرجى المحاولة مرة أخرى.',
  noServiceProvidersFound: 'لم يتم العثور على أطباء.',
  filterServicePackages: 'تصفية باقات العلاج',
  filterServices: 'تصفية الإجراءات',
  serviceInfo: 'معلومات الإجراء',
  filterServiceProviders: 'تصفية الأطباء',
  serviceCreatedSuccessfully: 'تم إنشاء الإجراء بنجاح!',
  serviceUpdatedSuccessfully: 'تم تحديث الإجراء بنجاح!',
  servicePackageCreatedSuccessfully: 'تم إنشاء باقة العلاج بنجاح!',
  servicePackageUpdatedSuccessfully: 'تم تحديث باقة العلاج بنجاح!',
  serviceProviderCreatedSuccessfully: 'تم إنشاء الطبيب بنجاح!',
  serviceProviderUpdatedSuccessfully: 'تم تحديث الطبيب بنجاح!',
  provider: 'الطبيب',
  duration: 'المدة (دقائق)',
};

const BY_SPEC: Record<string, Record<Lang, Pack>> = {
  medical: { en: MEDICAL_EN, ar: MEDICAL_AR },
};

export function getInventoryTerminologyOverride(
  specialization: string | undefined | null,
  language: Lang,
  key: TranslationKey
): string | undefined {
  const spec = String(specialization || '').toLowerCase();
  const pack = BY_SPEC[spec]?.[language];
  if (!pack) return undefined;
  const v = pack[key];
  return v !== undefined && v !== '' ? v : undefined;
}
