import React, { useCallback, useEffect, useRef } from 'react';

type TableHorizontalScrollProps = {
    children: React.ReactNode;
    className?: string;
    /** Classes applied to the main (table body) scroll container only */
    scrollClassName?: string;
};

/**
 * Wraps wide tables with a synced horizontal scrollbar at the top.
 * The main container scrolls horizontally but hides its native scrollbar to avoid
 * a duplicate bar floating above pagination when the page is scrolled vertically.
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
        const content = contentRef.current;
        const main = mainScrollRef.current;
        const spacer = spacerRef.current;
        if (!content || !spacer) return;
        const table = content.querySelector('table');
        const contentWidth = table?.scrollWidth ?? content.scrollWidth;
        const mainWidth = main?.scrollWidth ?? contentWidth;
        spacer.style.width = `${Math.max(contentWidth, mainWidth)}px`;
    }, []);

    useEffect(() => {
        updateSpacerWidth();
        const content = contentRef.current;
        if (!content) return undefined;
        const observer = new ResizeObserver(updateSpacerWidth);
        observer.observe(content);
        const table = content.querySelector('table');
        if (table) observer.observe(table);
        return () => observer.disconnect();
    }, [children, updateSpacerWidth]);

    const syncScroll = useCallback((source: 'top' | 'main') => {
        if (isSyncingRef.current) return;
        const top = topScrollRef.current;
        const main = mainScrollRef.current;
        if (!top || !main) return;
        const scrollLeft = source === 'top' ? top.scrollLeft : main.scrollLeft;
        isSyncingRef.current = true;
        top.scrollLeft = scrollLeft;
        main.scrollLeft = scrollLeft;
        requestAnimationFrame(() => {
            isSyncingRef.current = false;
        });
    }, []);

    const mainScrollCn = ['table-horizontal-scroll-main', 'overflow-x-auto', scrollClassName]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={['table-horizontal-scroll', 'relative min-w-0 w-full', className].filter(Boolean).join(' ')}>
            <div
                ref={topScrollRef}
                dir="ltr"
                className="table-horizontal-scroll-top overflow-x-auto"
                onScroll={() => syncScroll('top')}
                aria-hidden
            >
                <div ref={spacerRef} className="h-px" />
            </div>
            <div ref={mainScrollRef} dir="ltr" className={mainScrollCn} onScroll={() => syncScroll('main')}>
                <div
                    ref={contentRef}
                    className="w-max min-w-full"
                    dir={typeof document !== 'undefined' ? document.documentElement.dir || 'ltr' : 'ltr'}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};
