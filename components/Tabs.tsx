import React, { useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PAGE_TAB_ACTIVE, PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';

export type TabItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

/**
 * Underlined page tabs. Arrow keys move between enabled tabs; direction follows the UI language.
 */
export const Tabs: React.FC<{
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}> = ({ tabs, activeId, onChange, ariaLabel }) => {
  const { language } = useAppContext();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const rtl = language === 'ar';

  const focusAt = (index: number) => {
    const enabled = tabs
      .map((tab, i) => ({ tab, i }))
      .filter(({ tab }) => !tab.disabled);
    if (!enabled.length) return;
    const current = enabled.findIndex(({ tab }) => tab.id === tabs[index]?.id);
    const start = current === -1 ? 0 : current;
    const next = enabled[(start + enabled.length) % enabled.length];
    refs.current[next.i]?.focus();
    onChange(next.tab.id);
  };

  const move = (from: number, direction: 1 | -1) => {
    const step = rtl ? -direction : direction;
    const count = tabs.length;
    for (let n = 1; n <= count; n += 1) {
      const i = (from + step * n + count) % count;
      if (!tabs[i].disabled) {
        refs.current[i]?.focus();
        onChange(tabs[i].id);
        return;
      }
    }
  };

  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex gap-6 overflow-x-auto" role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  move(index, 1);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  move(index, -1);
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  const first = tabs.findIndex((item) => !item.disabled);
                  if (first >= 0) focusAt(first);
                } else if (e.key === 'End') {
                  e.preventDefault();
                  const last = [...tabs].reverse().findIndex((item) => !item.disabled);
                  if (last >= 0) focusAt(tabs.length - 1 - last);
                }
              }}
              className={`whitespace-nowrap py-3 px-1 text-sm transition-colors disabled:opacity-50 ${
                selected ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
