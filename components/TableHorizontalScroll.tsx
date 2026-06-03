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
        const spacer = spacerRef.current;
        if (!content || !spacer) return;
        const table = content.querySelector('table');
        const width = table?.scrollWidth ?? content.scrollWidth;
        spacer.style.width = `${width}px`;
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

    const mainScrollCn = ['table-horizontal-scroll-main', 'overflow-x-auto', scrollClassName]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={['table-horizontal-scroll', 'relative min-w-0 w-full', className].filter(Boolean).join(' ')}>
            <div
                ref={topScrollRef}
                className="table-horizontal-scroll-top overflow-x-auto"
                onScroll={() => syncScroll('top')}
                aria-hidden
            >
                <div ref={spacerRef} className="h-px" />
            </div>
            <div ref={mainScrollRef} className={mainScrollCn} onScroll={() => syncScroll('main')}>
                <div ref={contentRef}>{children}</div>
            </div>
        </div>
    );
};
