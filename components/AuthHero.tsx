import { getLoginHeroUrl } from '../utils/loginHero';

type AuthHeroProps = {
    language: 'ar' | 'en';
};

export function AuthHero({ language }: AuthHeroProps) {
    const heroUrl = getLoginHeroUrl(language);

    return (
        <div
            className="hidden lg:flex w-1/2 h-screen sticky top-0 items-center justify-center overflow-hidden relative self-start"
            style={{
                backgroundColor: '#2a0b63',
                backgroundImage:
                    'linear-gradient(180deg, #180734 0%, #2a0b63 18%, #4215aa 48%, #2a0b63 82%, #180734 100%)',
            }}
        >
            <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                    backgroundImage: `url('${heroUrl}')`,
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    transform: 'scale(1.02)',
                    WebkitMaskImage:
                        'radial-gradient(ellipse 82% 78% at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0.92) 76%, rgba(0,0,0,0.45) 90%, rgba(0,0,0,0) 100%)',
                    maskImage:
                        'radial-gradient(ellipse 82% 78% at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0.92) 76%, rgba(0,0,0,0.45) 90%, rgba(0,0,0,0) 100%)',
                }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        'linear-gradient(180deg, rgba(24, 7, 52, 0.98) 0%, rgba(24, 7, 52, 0.22) 14%, rgba(42, 11, 99, 0) 34%, rgba(42, 11, 99, 0) 66%, rgba(24, 7, 52, 0.22) 86%, rgba(24, 7, 52, 0.98) 100%), linear-gradient(90deg, rgba(34, 8, 76, 0.9) 0%, rgba(34, 8, 76, 0.18) 12%, rgba(42, 11, 99, 0) 24%, rgba(42, 11, 99, 0) 76%, rgba(34, 8, 76, 0.18) 88%, rgba(34, 8, 76, 0.9) 100%)',
                    backgroundBlendMode: 'overlay',
                }}
            />
        </div>
    );
}
