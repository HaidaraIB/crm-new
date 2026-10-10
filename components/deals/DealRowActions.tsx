import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { IconButton } from '../IconButton';
import { EditIcon, EyeIcon, TrashIcon } from '../icons';

type DealRowActionsProps = {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export const DealRowActions = ({ onView, onEdit, onDelete }: DealRowActionsProps) => {
  const { t } = useAppContext();
  return (
    <div className="flex items-center justify-center gap-1">
      <IconButton icon={<EyeIcon className="h-4 w-4" />} label={t('viewDeal')} onClick={onView} />
      <IconButton icon={<EditIcon className="h-4 w-4" />} label={t('editDeal')} onClick={onEdit} />
      <IconButton icon={<TrashIcon className="h-4 w-4" />} label={t('deleteDeal')} tone="danger" onClick={onDelete} />
    </div>
  );
};
