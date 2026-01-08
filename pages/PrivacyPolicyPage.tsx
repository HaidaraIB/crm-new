import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, MoonIcon, SunIcon } from '../components/index';

export const PrivacyPolicyPage = () => {
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
                            {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                        </h1>
                        
                        <div className="text-gray-700 dark:text-gray-300 space-y-6">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '1. مقدمة' : '1. Introduction'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'نحن ملتزمون بحماية خصوصيتك. تشرح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك الشخصية عند استخدامك لخدمتنا.'
                                        : 'We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our service.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '2. المعلومات التي نجمعها' : '2. Information We Collect'}
                                </h2>
                                <p className="mb-2">
                                    {language === 'ar' ? 'نجمع أنواعًا مختلفة من المعلومات:' : 'We collect different types of information:'}
                                </p>
                                <ul className="list-disc list-inside space-y-2 ms-4">
                                    <li>
                                        {language === 'ar'
                                            ? 'معلومات شخصية: الاسم، عنوان البريد الإلكتروني، رقم الهاتف، وغيرها من المعلومات التي تقدمها عند التسجيل.'
                                            : 'Personal Information: Name, email address, phone number, and other information you provide when registering.'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'معلومات الاستخدام: بيانات حول كيفية استخدامك للخدمة، بما في ذلك صفحات الويب التي تزورها والوقت الذي تقضيه على الموقع.'
                                            : 'Usage Information: Data about how you use the service, including web pages you visit and time spent on the site.'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'معلومات الجهاز: عنوان IP، نوع المتصفح، نظام التشغيل، ومعلومات الجهاز الأخرى.'
                                            : 'Device Information: IP address, browser type, operating system, and other device information.'}
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '3. كيفية استخدام المعلومات' : '3. How We Use Information'}
                                </h2>
                                <p className="mb-2">
                                    {language === 'ar' ? 'نستخدم المعلومات التي نجمعها لـ:' : 'We use the information we collect to:'}
                                </p>
                                <ul className="list-disc list-inside space-y-2 ms-4">
                                    <li>
                                        {language === 'ar'
                                            ? 'توفير وصيانة وتحسين خدماتنا'
                                            : 'Provide, maintain, and improve our services'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'معالجة المعاملات وإرسال الإشعارات المتعلقة بها'
                                            : 'Process transactions and send related notifications'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'إرسال التحديثات والتواصل معك حول الخدمة'
                                            : 'Send updates and communicate with you about the service'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'اكتشاف ومنع الاحتيال والأنشطة الضارة'
                                            : 'Detect and prevent fraud and harmful activities'}
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '4. مشاركة المعلومات' : '4. Information Sharing'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'لا نبيع معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في الحالات التالية: مع موفري الخدمات الذين يساعدوننا في تشغيل خدماتنا، عند الالتزام بذلك بموجب القانون، لحماية حقوقنا ومستخدمينا.'
                                        : 'We do not sell your personal information to third parties. We may only share your information in the following cases: with service providers who help us operate our services, when required by law, to protect our rights and our users.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '5. أمان البيانات' : '5. Data Security'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'نحن نستخدم تدابير أمنية تقنية وإدارية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به والاستخدام والكشف.'
                                        : 'We use appropriate technical and administrative security measures to protect your personal information from unauthorized access, use, and disclosure.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '6. حقوقك' : '6. Your Rights'}
                                </h2>
                                <p className="mb-2">
                                    {language === 'ar' ? 'لديك الحق في:' : 'You have the right to:'}
                                </p>
                                <ul className="list-disc list-inside space-y-2 ms-4">
                                    <li>
                                        {language === 'ar'
                                            ? 'الوصول إلى معلوماتك الشخصية'
                                            : 'Access your personal information'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'تصحيح معلوماتك الشخصية'
                                            : 'Correct your personal information'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'حذف معلوماتك الشخصية'
                                            : 'Delete your personal information'}
                                    </li>
                                    <li>
                                        {language === 'ar'
                                            ? 'معارضة معالجة معلوماتك الشخصية'
                                            : 'Object to processing of your personal information'}
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '7. الاتصال بنا' : '7. Contact Us'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا.'
                                        : 'If you have any questions about this Privacy Policy, please contact us.'}
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

