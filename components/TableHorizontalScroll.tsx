import React, { useCallback, useEffect, useRef } from 'react';

type TableHorizontalScrollProps = {
    children: React.ReactNode;
    className?: string;
    /** Classes applied to both the top and main horizontal scroll containers */
    scrollClassName?: string;
};

/**
 * Wraps wide tables with a synced horizontal scrollbar at the top and bottom.
 */
export const TableHorizontalScroll: React.FC<TableHorizontalScrollProps> = ({
    children,
    className = '',
    scrollClassName = '',
}) => {
    const topScrollRef = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const spacerRef = useRef<HTMLDivElement>(null);
    const isSyncingRef = useRef(false);

    const updateSpacerWidth = useCallback(() => {
        if (contentRef.current && spacerRef.current) {
            spacerRef.current.style.width = `${contentRef.current.scrollWidth}px`;
        }
    }, []);

    useEffect(() => {
        updateSpacerWidth();
        const content = contentRef.current;
        if (!content) return undefined;
        const observer = new ResizeObserver(updateSpacerWidth);
        observer.observe(content);
        return () => observer.disconnect();
    }, [children, updateSpacerWidth]);

    const syncScroll = useCallback((source: 'top' | 'main') => {
        if (isSyncingRef.current) return;
        const top = topScrollRef.current;
        const main = mainScrollRef.current;
        if (!top || !main) return;
        isSyncingRef.current = true;
        if (source === 'top') {
            main.scrollLeft = top.scrollLeft;
        } else {
            top.scrollLeft = main.scrollLeft;
        }
        requestAnimationFrame(() => {
            isSyncingRef.current = false;
        });
    }, []);

    const scrollCn = ['overflow-x-auto', scrollClassName].filter(Boolean).join(' ');

    return (
        <div className={className}>
            <div
                ref={topScrollRef}
                className={`table-horizontal-scroll-top ${scrollCn}`}
                onScroll={() => syncScroll('top')}
                aria-hidden
            >
                <div ref={spacerRef} className="h-px" />
            </div>
            <div ref={mainScrollRef} className={scrollCn} onScroll={() => syncScroll('main')}>
                <div ref={contentRef}>{children}</div>
            </div>
        </div>
    );
};
