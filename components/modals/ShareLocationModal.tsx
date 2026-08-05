import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { LeadLocationMapPicker } from '../LeadLocationMapPicker';
import { translations } from '../../constants';

type LocationPayload = {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSend: (payload: LocationPayload) => void | Promise<void>;
  sending?: boolean;
  t: (key: keyof typeof translations.en) => string;
};

export const ShareLocationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSend,
  sending = false,
  t,
}) => {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLat(null);
      setLng(null);
      setName('');
      setAddress('');
      setError(null);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (lat == null || lng == null) {
      setError(t('whatsappLocationPickRequired'));
      return;
    }
    setError(null);
    await onSend({
      latitude: lat,
      longitude: lng,
      name: name.trim() || undefined,
      address: address.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('whatsappShareLocation')}
      maxWidth="lg"
      overlayClassName="z-[80]"
    >
      <div className="flex flex-col gap-3">
        <LeadLocationMapPicker
          latitude={lat}
          longitude={lng}
          onChange={(la, lo) => {
            setLat(la);
            setLng(lo);
            if (la != null && lo != null) setError(null);
          }}
          className="min-h-[16rem]"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
            <span>{t('whatsappLocationNameOptional')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={sending}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              maxLength={255}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
            <span>{t('whatsappLocationAddressOptional')}</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={sending}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              maxLength={512}
            />
          </label>
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => void handleSend()}
            disabled={sending || lat == null || lng == null}
          >
            {sending ? t('sending') || 'Sending…' : t('whatsappSendLocation')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
