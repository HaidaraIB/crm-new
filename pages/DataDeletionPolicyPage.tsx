import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, MoonIcon, SunIcon } from '../components/index';

export const DataDeletionPolicyPage = () => {
    const { t, language, setLanguage, theme, setTheme } = useAppContext();

    return (
        <div className={`min-h-screen ${language === 'ar' ? 'font-arabic' : 'font-sans'} bg-gray-50 dark:bg-gray-900 relative`}>
            {/* Theme and Language Toggle Buttons */}
            <div className={`absolute top-4 end-4 z-10 flex ${language === 'ar' ? 'gap-4' : 'gap-2'}`}>
                <button
                    onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
                >
                    <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
                </button>
                <Button variant="ghost" className="p-2 h-auto" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                </Button>
            </div>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Card>
                    <div className="prose dark:prose-invert max-w-none">
                        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                            {language === 'ar' ? 'سياسة حذف البيانات' : 'Data Deletion Policy'}
                        </h1>
                        
                        <div className="text-gray-700 dark:text-gray-300 space-y-6">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '1. نظرة عامة' : '1. Overview'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'نحن ملتزمون بحماية خصوصية المستخدمين وضمان أن لديهم السيطرة الكاملة على بياناتهم الشخصية. تشرح هذه السياسة كيفية طلب حذف بياناتك وكيفية معالجة طلبات الحذف.'
                                        : 'We are committed to protecting user privacy and ensuring that users have full control over their personal data. This policy explains how to request deletion of your data and how deletion requests are processed.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '2. حقك في حذف البيانات' : '2. Your Right to Delete Data'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'لديك الحق في طلب حذف بياناتك الشخصية في أي وقت. عند تقديم طلب حذف، سنقوم بحذف جميع بياناتك الشخصية من أنظمتنا، باستثناء المعلومات التي قد نحتاج إلى الاحتفاظ بها لأغراض قانونية أو تنظيمية.'
                                        : 'You have the right to request deletion of your personal data at any time. When you submit a deletion request, we will delete all your personal data from our systems, except for information we may need to retain for legal or regulatory purposes.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '3. كيفية طلب حذف البيانات' : '3. How to Request Data Deletion'}
                                </h2>
                                <p className="mb-2">
                                    {language === 'ar' ? 'يمكنك طلب حذف بياناتك من خلال:' : 'You can request deletion of your data by:'}
                                </p>
                                <ul className="list-disc list-inside space-y-2 ms-4">
                                    <li>
                                        {language === 'ar'
                                            ? 'إرسال بريد إلكتروني إلى فريق الدعم'
                                            : 'Sending an email to our support team'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'استخدام نموذج الاتصال على موقعنا'
                                            : 'Using the contact form on our website'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'الاتصال بنا مباشرة من خلال معلومات الاتصال المقدمة'
                                            : 'Contacting us directly through the provided contact information'}
                                    </li>
                                </ul>
                                <p className="mt-4">
                                    {language === 'ar'
                                        ? 'يرجى تضمين معلومات الهوية المطلوبة للتحقق من هويتك قبل معالجة طلب الحذف.'
                                        : 'Please include the identity information required to verify your identity before processing the deletion request.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '4. البيانات التي سيتم حذفها' : '4. Data That Will Be Deleted'}
                                </h2>
                                <p className="mb-2">
                                    {language === 'ar' ? 'عند معالجة طلب الحذف، سنقوم بحذف:' : 'When processing a deletion request, we will delete:'}
                                </p>
                                <ul className="list-disc list-inside space-y-2 ms-4">
                                    <li>
                                        {language === 'ar'
                                            ? 'معلومات الحساب الشخصية (الاسم، البريد الإلكتروني، رقم الهاتف)'
                                            : 'Personal account information (name, email, phone number)'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'بيانات الاستخدام والأنشطة'
                                            : 'Usage and activity data'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'المحتوى الذي أنشأته أو شاركته'
                                            : 'Content you created or shared'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'أي معلومات شخصية أخرى مرتبطة بحسابك'
                                            : 'Any other personal information associated with your account'}
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '5. البيانات المحتفظ بها' : '5. Data We Retain'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'قد نحتفظ ببعض المعلومات لأغراض قانونية أو تنظيمية، مثل: السجلات المالية المطلوبة قانونيًا، معلومات مطلوبة لحل النزاعات، معلومات مطلوبة لحماية حقوقنا أو حقوق المستخدمين الآخرين.'
                                        : 'We may retain some information for legal or regulatory purposes, such as: Financial records required by law, information required to resolve disputes, information required to protect our rights or the rights of other users.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '6. وقت المعالجة' : '6. Processing Time'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'سنقوم بمعالجة طلب حذف البيانات الخاص بك في غضون 30 يومًا من استلام الطلب. قد نتواصل معك للتحقق من هويتك أو للحصول على معلومات إضافية إذا لزم الأمر.'
                                        : 'We will process your data deletion request within 30 days of receiving the request. We may contact you to verify your identity or to obtain additional information if necessary.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '7. الاتصال بنا' : '7. Contact Us'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'إذا كان لديك أي أسئلة حول سياسة حذف البيانات هذه أو ترغب في تقديم طلب حذف، يرجى الاتصال بنا.'
                                        : 'If you have any questions about this Data Deletion Policy or would like to submit a deletion request, please contact us.'}
                                </p>
                            </section>

                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                                <p>
                                    {language === 'ar'
                                        ? `آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}`
                                        : `Last updated: ${new Date().toLocaleDateString('en-US')}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

