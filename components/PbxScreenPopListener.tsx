import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { getNotificationsAPI, getPbxSettingsAPI, markNotificationReadAPI, type AppNotification } from '../services/api';
import { Button, Modal } from './index';

/** Polls for PBX incoming-call notifications and shows a screen-pop modal on web. */
export const PbxScreenPopListener = () => {
  const { setCurrentPage, setSelectedLead, t } = useAppContext();
  const [active, setActive] = useState<AppNotification | null>(null);
  const shownRef = useRef<Set<number>>(new Set());

  const { data: pbxSettings } = useQuery({
    queryKey: ['pbxSettings', 'screen-pop'],
    queryFn: getPbxSettingsAPI,
    staleTime: 60_000,
    retry: false,
  });
  const screenPopActive =
    !!pbxSettings?.is_enabled && pbxSettings.screen_pop_enabled !== false;

  const { data } = useQuery({
    queryKey: ['notifications', 'pbx-screen-pop'],
    queryFn: () => getNotificationsAPI({ page: 1, page_size: 20 }),
    refetchInterval: screenPopActive ? 8000 : false,
    enabled: screenPopActive,
  });

  useEffect(() => {
    const items = data?.results ?? [];
    const incoming = items.find(
      (n) =>
        !n.read &&
        (n.type === 'pbx_incoming_call' || n.type === 'pbx_call_missed') &&
        !shownRef.current.has(n.id)
    );
    if (incoming) {
      shownRef.current.add(incoming.id);
      setActive(incoming);
    }
  }, [data]);

  if (!active) return null;

  const leadId = active.data?.lead_id ?? active.data?.client_id;
  const phone = active.data?.phone ?? '';
  const isMissed = active.type === 'pbx_call_missed';
  const modalTitle =
    active.title ||
    (isMissed ? t('pbxMissedCall') : t('incomingCall'));

  const openLead = () => {
    if (leadId) {
      setSelectedLead({ id: Number(leadId) } as any);
      setCurrentPage('ViewLead');
    }
    if (!active.read) markNotificationReadAPI(active.id).catch(() => {});
    setActive(null);
  };

  const dismiss = () => {
    if (!active.read) markNotificationReadAPI(active.id).catch(() => {});
    setActive(null);
  };

  return (
    <Modal isOpen onClose={dismiss} title={modalTitle}>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{active.body}</p>
      {phone ? <p className="text-lg font-mono mb-4" dir="ltr">{phone}</p> : null}
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={dismiss}>{t('dismiss')}</Button>
        {leadId ? (
          <Button onClick={openLead}>{t('openLead')}</Button>
        ) : null}
      </div>
    </Modal>
  );
};
