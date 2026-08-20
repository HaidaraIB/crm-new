import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface WorkIdleModalProps {
  isOpen: boolean;
  idleTimeoutMinutes: number;
  onResume: () => void;
}

/**
 * Shown when measured working-hours tracking pauses for inactivity.
 *
 * Deliberately not the shared `AlertModal`: that one's state lives in AppContext and
 * any unrelated code can dismiss it, whereas this dialog owns a specific action.
 *
 * Resuming is an explicit click, not "any activity". Auto-resume would dismiss the
 * dialog the instant the user twitches the mouse toward it, so it would flash away
 * unread — and the acknowledgement is what makes the pause legible.
 */
export const WorkIdleModal = ({ isOpen, idleTimeoutMinutes, onResume }: WorkIdleModalProps) => {
  const { t } = useAppContext();

  const body = (t('workTrackingPausedBody') || '').replace(
    '{minutes}',
    String(idleTimeoutMinutes),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onResume}
      title={t('workTrackingPausedTitle') || 'Time tracking paused'}
      overlayClassName="z-[95]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 shrink-0 bg-amber-100 dark:bg-amber-900/20">
            <svg
              className="w-6 h-6 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-gray-700 dark:text-gray-300 text-base pt-0.5 flex-1">{body}</div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onResume}>{t('workTrackingResume') || 'Resume tracking'}</Button>
        </div>
      </div>
    </Modal>
  );
};
