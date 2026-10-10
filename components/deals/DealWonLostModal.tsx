import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button, Modal } from '../index';
import { AutoDirTextarea } from '../Input';
import { useDealLostReasons } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';
import type { DealPipelineStage } from '../../types';

type DealWonLostModalProps = {
  stage: DealPipelineStage | null;
  onClose: () => void;
  onConfirm: (payload: { lostReason?: number; lostNote?: string }) => void | Promise<void>;
  submitting?: boolean;
};

export const DealWonLostModal = ({ stage, onClose, onConfirm, submitting }: DealWonLostModalProps) => {
  const { t } = useAppContext();
  const { data: reasons = [] } = useDealLostReasons();
  const [lostReason, setLostReason] = useState('');
  const [lostNote, setLostNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isLost = stage?.stageType === 'lost';

  const translate = (key: string) => {
    const value = t(key as never);
    return value && value !== key ? value : undefined;
  };

  const closeValues = (reason = lostReason, note = lostNote) => ({
    status: isLost ? 'lost' : 'won',
    lost_reason: reason ? Number(reason) : '',
    lostReason: reason ? Number(reason) : '',
    lost_note: note,
    lostNote: note,
  });

  const mirrorCloseErrors = (raw: Record<string, string>) => {
    const next = { ...raw };
    if (next.lost_reason && !next.lostReason) next.lostReason = next.lost_reason;
    if (next.lostReason && !next.lost_reason) next.lost_reason = next.lostReason;
    if (next.lost_note && !next.lostNote) next.lostNote = next.lost_note;
    if (next.lostNote && !next.lost_note) next.lost_note = next.lostNote;
    if (next._general && !next.general) next.general = next._general;
    return next;
  };

  const showCloseField = (field: 'lostReason' | 'lostNote', reason = lostReason, note = lostNote) => {
    const next = mirrorCloseErrors(catalogFieldErrors('deal.close', closeValues(reason, note), translate));
    const keys = field === 'lostReason' ? ['lostReason', 'lost_reason'] : ['lostNote', 'lost_note'];
    setErrors((prev) => {
      const updated = { ...prev };
      for (const key of keys) {
        if (next[key]) updated[key] = next[key];
        else delete updated[key];
      }
      return updated;
    });
  };

  const handleConfirm = async () => {
    const next = mirrorCloseErrors(catalogFieldErrors('deal.close', closeValues(), translate));
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      await onConfirm({ lostReason: lostReason ? Number(lostReason) : undefined, lostNote });
    } catch (error) {
      const server = mirrorCloseErrors(serverFieldErrors(error, 'deal.close', translate));
      if (Object.keys(server).length > 0) setErrors(server);
    }
  };

  return (
    <Modal isOpen={Boolean(stage)} onClose={onClose} title={isLost ? t('dealMarkLost') : t('dealMarkWon')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {isLost ? t('dealLostReasonRequired') : t('dealConfirmWon')}
        </p>
        {(errors.general || errors._general) && (
          <p className="text-sm text-red-600">{errors.general || errors._general}</p>
        )}
        {isLost && (
          <>
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              value={lostReason}
              onBlur={() => showCloseField('lostReason')}
              onChange={(e) => {
                const value = e.target.value;
                setLostReason(value);
                if (errors.lostReason || errors.lost_reason) showCloseField('lostReason', value, lostNote);
              }}
            >
              <option value="">{t('dealSelectLostReason')}</option>
              {reasons.map((reason) => (
                <option key={reason.id} value={reason.id}>{reason.name}</option>
              ))}
            </select>
            {(errors.lostReason || errors.lost_reason) && (
              <p className="text-sm text-red-600">{errors.lostReason || errors.lost_reason}</p>
            )}
            <AutoDirTextarea
              value={lostNote}
              onChange={(e) => {
                const value = e.target.value;
                setLostNote(value);
                if (errors.lostNote || errors.lost_note) showCloseField('lostNote', lostReason, value);
              }}
              onBlur={() => showCloseField('lostNote')}
              placeholder={t('dealNotePlaceholder')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              rows={3}
            />
            {(errors.lostNote || errors.lost_note) && (
              <p className="text-sm text-red-600">{errors.lostNote || errors.lost_note}</p>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
          >
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
