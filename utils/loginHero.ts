/** Public assets for auth split-panel hero (Vite `public/`). */
export function getLoginHeroUrl(language: 'ar' | 'en'): string {
  return language === 'ar' ? '/login_hero_ar.webp' : '/login_hero_en.webp';
}
