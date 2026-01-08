import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, MoonIcon, SunIcon } from '../components/index';

export const TermsOfServicePage = () => {
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
                            {language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
                        </h1>
                        
                        <div className="text-gray-700 dark:text-gray-300 space-y-6">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '1. قبول الشروط' : '1. Acceptance of Terms'}
                                </h2>
                                <p>
                                    {language === 'ar' 
                                        ? 'باستخدامك لهذه الخدمة، فإنك تقبل وتوافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، فيجب عليك عدم استخدام الخدمة.'
                                        : 'By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '2. استخدام الخدمة' : '2. Use License'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'يُمنح لك إذن مؤقت لاستخدام الخدمة لأغراض شخصية أو تجارية. يحظر عليك: تعديل أو نسخ المواد، استخدام المواد لأغراض تجارية أو للعرض العام، محاولة عكس هندسة أي برنامج، إزالة أي حقوق طبع ونشر أو إشعارات ملكية.'
                                        : 'Permission is granted to temporarily use the service for personal or commercial purposes. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials, use the materials for any commercial purpose or for any public display, attempt to reverse engineer any software, remove any copyright or other proprietary notations.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '3. القيود' : '3. Limitations'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'في أي حال من الأحوال لن تكون الشركة أو مورديها مسؤولين عن أي أضرار (بما في ذلك، على سبيل المثال لا الحصر، الأضرار الناتجة عن فقدان البيانات أو الربح، أو بسبب انقطاع الأعمال) الناشئة عن استخدام أو عدم القدرة على استخدام المواد على الخدمة.'
                                        : 'In no event shall the company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the service.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '4. دقة المواد' : '4. Accuracy of Materials'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'المواد التي تظهر على الخدمة قد تشمل أخطاء تقنية أو مطبعية أو تصويرية. لا تضمن الشركة أن أي مادة على الخدمة دقيقة أو كاملة أو حديثة.'
                                        : 'The materials appearing on the service could include technical, typographical, or photographic errors. The company does not warrant that any material on the service is accurate, complete, or current.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '5. التعديلات' : '5. Modifications'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'قد تقوم الشركة بمراجعة هذه الشروط في أي وقت دون إشعار. باستخدامك للخدمة، فإنك توافق على الالتزام بالإصدار الحالي من هذه الشروط.'
                                        : 'The company may revise these terms of service at any time without notice. By using this service you are agreeing to be bound by the then current version of these terms of service.'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    {language === 'ar' ? '6. الاتصال' : '6. Contact Information'}
                                </h2>
                                <p>
                                    {language === 'ar'
                                        ? 'إذا كان لديك أي أسئلة حول شروط الخدمة هذه، يرجى الاتصال بنا.'
                                        : 'If you have any questions about these Terms of Service, please contact us.'}
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

