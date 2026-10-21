/**
 * Plays one Loop Cloud PBX recording. The URL is requested only when the user
 * presses play (POST /telephony/recordings/<id>/access/: visibility re-checked,
 * audit-logged, valid 5 minutes) and loaded by a plain <audio> element: it is a
 * presigned object-storage URL, so it must not carry the CRM's Authorization header.
 */
import React, { useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import { getPbxRecordingAccessAPI } from '../../services/api';
import { Button } from '../Button';

export const PbxRecordingPlayer: React.FC<{ recordingId: string | (() => Promise<string>) }> = ({ recordingId }) => {
  const { t } = useAppContext();
  const tr = (key: string) => (t as (k: string) => string)(key);
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  if (url) {
    return (
      <div className="mt-2" dir="ltr">
        <audio controls autoPlay src={url} className="h-8 w-56 max-w-full" />
      </div>
    );
  }
  const play = async () => {
    setState('loading');
    try {
      const id = typeof recordingId === 'function' ? await recordingId() : recordingId;
      const access = await getPbxRecordingAccessAPI(id);
      setUrl(access.url);
      setState('idle');
    } catch {
      setState('error');
    }
  };
  return (
    <span className="mt-2 inline-flex items-center gap-2">
      <Button size="sm" variant="secondary" loading={state === 'loading'} onClick={() => void play()}>
        {tr('pbxPlayRecording')}
      </Button>
      {state === 'error' ? <span className="text-xs text-rose-600 dark:text-rose-400">{tr('pbxRecordingUnavailable')}</span> : null}
    </span>
  );
};
