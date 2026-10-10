import React from 'react';

type FieldActionRowProps = {
  children: React.ReactNode;
  action: React.ReactNode;
};

/** A single field with its action on the same row, button centered against the field. */
export const FieldActionRow = ({ children, action }: FieldActionRowProps) => (
  <div className="flex items-center gap-2">
    <div className="min-w-0 flex-1">{children}</div>
    <div className="shrink-0">{action}</div>
  </div>
);
