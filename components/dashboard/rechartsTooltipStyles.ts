import type { CSSProperties } from 'react';

export type RechartsTooltipStyleBundle = {
  contentStyle: CSSProperties;
  labelStyle: CSSProperties;
  itemStyle: CSSProperties;
};

/**
 * Accessible Recharts tooltip styling: in dark mode avoids default white panel + low-contrast label.
 */
export function getRechartsTooltipStyles(isDark: boolean): RechartsTooltipStyleBundle {
  if (isDark) {
    return {
      contentStyle: {
        backgroundColor: 'rgb(17 24 39)',
        border: '1px solid rgb(55 65 81)',
        borderRadius: '12px',
        padding: '12px 14px',
        color: '#f9fafb',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
      },
      labelStyle: {
        color: '#f9fafb',
        fontWeight: 600,
        marginBottom: '6px',
        fontSize: '13px',
      },
      itemStyle: {
        color: '#e5e7eb',
        fontSize: '13px',
      },
    };
  }

  return {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '12px 14px',
      color: '#111827',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    labelStyle: {
      color: '#111827',
      fontWeight: 600,
      marginBottom: '6px',
      fontSize: '13px',
    },
    itemStyle: {
      color: '#374151',
      fontSize: '13px',
    },
  };
}
