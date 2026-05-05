import React from 'react';
import { Dropdown, DropdownItem } from '../Dropdown';
import { MoreVerticalIcon } from '../icons';

export type DashboardMenuItem = {
  label: string;
  onClick: () => void;
};

type DashboardWidgetMenuProps = {
  items: DashboardMenuItem[];
  ariaLabel: string;
};

export const DashboardWidgetMenu = ({ items, ariaLabel }: DashboardWidgetMenuProps) => {
  if (!items.length) return null;

  return (
    <Dropdown
      usePortal
      trigger={
        <button
          type="button"
          className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0 transition-colors"
          aria-label={ariaLabel}
          aria-haspopup="menu"
        >
          <MoreVerticalIcon className="w-5 h-5" />
        </button>
      }
      panelClassName="w-52"
    >
      {items.map((item, index) => (
        <DropdownItem key={index} onClick={item.onClick}>
          {item.label}
        </DropdownItem>
      ))}
    </Dropdown>
  );
};
