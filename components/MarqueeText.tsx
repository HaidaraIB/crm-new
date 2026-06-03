import React, { useEffect, useRef, useState } from 'react';

type MarqueeTextProps = {
    text: string;
    className?: string;
    contentClassName?: string;
};

/**
 * Shows long single-line text in a continuous horizontal loop when it overflows
 * its container; otherwise shows a single truncated line.
 */
export const MarqueeText: React.FC<MarqueeTextProps> = ({
    text,
    className = '',
    contentClassName = '',
}) => {
    const outerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [overflow, setOverflow] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onMq = () => setReduceMotion(mq.matches);
        onMq();
        mq.addEventListener('change', onMq);
        return () => mq.removeEventListener('change', onMq);
    }, []);

    useEffect(() => {
        const outer = outerRef.current;
        const m = measureRef.current;
        if (!outer || !m) return;

        const check = () => {
            setOverflow(m.scrollWidth > outer.clientWidth + 1);
        };

        check();
        const ro = new ResizeObserver(check);
        ro.observe(outer);
        ro.observe(m);
        window.addEventListener('resize', check);
        const raf = requestAnimationFrame(check);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener('resize', check);
        };
    }, [text, contentClassName]);

    const useMarquee = overflow && !reduceMotion;

    if (!text || text === '-') {
        return (
            <div className={`min-w-0 max-w-full ${className}`}>
                <span className={contentClassName}>{text}</span>
            </div>
        );
    }

    const durationSec = Math.min(Math.max(text.length * 0.1, 10), 45);

    return (
        <div ref={outerRef} className={`relative min-w-0 max-w-full overflow-hidden ${className}`}>
            <span
                ref={measureRef}
                className={`pointer-events-none fixed top-0 max-w-none whitespace-nowrap opacity-0 ${contentClassName}`}
                style={{ left: '-10000px' }}
                aria-hidden
            >
                {text}
            </span>
            {useMarquee ? (
                <div className="deal-marquee-track overflow-hidden" dir="ltr">
                    <div
                        className="deal-marquee-inner inline-flex w-max"
                        style={{ ['--deal-marquee-duration' as string]: `${durationSec}s` }}
                    >
                        <span dir="auto" className={`inline-block shrink-0 whitespace-nowrap px-6 ${contentClassName}`}>
                            {text}
                        </span>
                        <span dir="auto" className={`inline-block shrink-0 whitespace-nowrap px-6 ${contentClassName}`}>
                            {text}
                        </span>
                    </div>
                </div>
            ) : (
                <span className={`block truncate ${contentClassName}`}>{text}</span>
            )}
        </div>
    );
};
