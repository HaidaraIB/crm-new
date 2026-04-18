import { useAppContext } from '../context/AppContext';

/**
 * Auth hero: extracted PNGs over `login_hero_bg.jpg`.
 * Two columns — visual left (≈56%) · marketing right (≈44%). Same for EN and AR (only asset paths change).
 * Root `dir="ltr"` isolates layout from `document.documentElement.dir` (RTL for Arabic would mirror the grid).
 */
export function AuthHero() {
    const { language } = useAppContext();
    const isAr = language === 'ar';
    const headlineSrc = isAr ? '/login_hero_headline_ar.png' : '/login_hero_headline_en.png';
    const sublineSrc = isAr ? '/login_hero_subline_ar.png' : '/login_hero_subline_en.png';
    const storesSrc = isAr ? '/login_hero_stores_ar.png' : '/login_hero_stores_en.png';

    return (
        <div
            className="hidden lg:block w-1/2 h-screen sticky top-0 overflow-hidden relative self-start bg-[#0c002b]"
            dir="ltr"
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/login_hero_bg.jpg')" }}
            />

            <div className="relative z-10 h-full min-h-0 w-full">
                <img
                    src="/login_hero_corner.png"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-0 z-30 m-0 block h-auto w-[min(42%,9.5rem)] max-w-[9.5rem] object-contain p-0"
                />

                <div className="grid h-full min-h-0 grid-cols-[minmax(0,56%)_minmax(0,44%)] items-stretch pt-11 pb-7 md:pt-14 md:pb-9">
                {/* Column 1: model — center-left (toward gutter) */}
                <div
                    className="auth-hero-person-slot pointer-events-none relative z-10 flex min-h-0 min-w-0 items-center justify-end ps-4 pe-2 md:ps-8 md:pe-4"
                    aria-hidden="true"
                >
                    <img
                        src="/login_hero_model.png"
                        alt=""
                        className="h-auto w-full max-w-[min(100%,48rem)] max-h-[min(72vh,40rem)] object-contain object-center"
                    />
                </div>

                {/* Column 2: headline top-right, subline center-right, stores bottom-right */}
                <section
                    className="relative z-20 flex h-full min-h-0 min-w-0 flex-col justify-between ps-4 pe-7 md:ps-6 md:pe-10"
                    dir="ltr"
                >
                    <div className="flex w-full shrink-0 justify-end pt-0.5">
                        <img
                            src={headlineSrc}
                            alt={isAr ? 'نظام إدارة علاقات العملاء' : 'Customer relationship management system'}
                            className="relative z-10 h-auto w-auto max-w-[min(100%,21rem)] object-contain"
                        />
                    </div>
                    <div className="flex min-h-0 w-full flex-1 items-center justify-end py-2">
                        <img
                            src={sublineSrc}
                            alt={isAr ? 'حوّل بياناتك إلى نمو حقيقي مع LOOP CRM' : 'Turn your data into real growth with LOOP'}
                            className="relative z-10 h-auto w-auto max-w-[min(100%,21rem)] object-contain"
                        />
                    </div>
                    <div className="flex w-full shrink-0 justify-end pb-0.5">
                        <img
                            src={storesSrc}
                            alt={isAr ? 'حمّل التطبيق الآن من App Store و Google Play' : 'Download the app from App Store and Google Play'}
                            className="relative z-10 h-auto w-auto max-w-[min(100%,17.5rem)] object-contain"
                        />
                    </div>
                </section>
                </div>
            </div>
        </div>
    );
}
