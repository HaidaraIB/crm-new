/**
 * Settings > Phone System > Greetings: the company's own recorded IVR greetings.
 * Any audio the browser can decode is converted here to phone quality (WAV,
 * 16-bit, mono, 8 kHz; utils/phoneAudio.ts) before upload, so the server never
 * transcodes. A greeting reaches the PBX once an IVR menu plays it.
 */
import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { TableHorizontalScroll } from '../../../components/TableHorizontalScroll';
import { EditIcon, PlayIcon, PlusIcon, TrashIcon } from '../../../components/icons';
import { getPbxSoundAudioAPI, uploadPbxSoundAPI, type PbxSoundRow } from '../../../services/api';
import { PhoneAudioError, toPhoneWav } from '../../../utils/phoneAudio';
import {
  EmptyRow,
  FieldError,
  FieldLabel,
  SectionHeader,
  TD,
  TH,
  useCatalogForm,
  useConfirmDelete,
  usePbxMutations,
  usePbxRows,
  useTr,
} from './shared';

export const formatSeconds = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Plays a blob URL that is revoked when the component goes away. */
const useObjectUrl = (blob: Blob | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
};

const UploadModal = ({ onClose }: { onClose: () => void }) => {
  const tr = useTr();
  const { invalidate } = usePbxMutations<PbxSoundRow>('sounds');
  const form = useCatalogForm('pbx_sound.upload');
  const [name, setName] = useState('');
  const [converted, setConverted] = useState<{ wav: File; seconds: number } | null>(null);
  const [converting, setConverting] = useState(false);
  const previewUrl = useObjectUrl(converted?.wav ?? null);
  const upload = useMutation({
    mutationFn: () => uploadPbxSoundAPI(name.trim(), converted!.wav),
    onSuccess: invalidate,
  });
  const payload = () => ({ name: name.trim(), file: converted?.wav ?? null });

  const pick = async (file: File | undefined) => {
    setConverted(null);
    form.clear('file');
    if (!file) return;
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, '').slice(0, 80));
    setConverting(true);
    try {
      const { wav, seconds } = await toPhoneWav(file);
      setConverted({ wav: new File([wav], 'greeting.wav', { type: 'audio/wav' }), seconds });
    } catch (error) {
      const code = error instanceof PhoneAudioError ? error.code : 'decode_failed';
      form.setErrors((prev) => ({
        ...prev,
        file: tr(code === 'too_long' ? 'pbxSoundTooLong' : code === 'too_short' ? 'pbxSoundTooShort' : 'pbxSoundDecodeFailed'),
      }));
    } finally {
      setConverting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validate(payload())) return;
    try {
      await upload.mutateAsync();
      onClose();
    } catch (error) {
      form.fromServer(error, tr('pbxSaveFailed'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={tr('pbxAddGreeting')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <div>
          <FieldLabel htmlFor="pbx-sound-file" required>{tr('pbxSoundFile')}</FieldLabel>
          <input
            id="pbx-sound-file"
            type="file"
            accept="audio/*"
            onChange={(e) => void pick(e.target.files?.[0])}
            className="block w-full text-sm text-gray-700 file:me-3 file:h-10 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:text-sm file:font-medium hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-200"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tr('pbxSoundFileHint')}</p>
          <FieldError message={form.errors.file} />
          {converting ? <p className="mt-2 text-sm text-gray-500">{tr('pbxSoundConverting')}</p> : null}
          {converted && previewUrl ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <audio controls src={previewUrl} className="h-10 max-w-full" aria-label={tr('pbxSoundPlay')} />
              <span dir="ltr" className="text-sm text-gray-600 dark:text-gray-300">{formatSeconds(converted.seconds * 1000)}</span>
            </div>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor="pbx-sound-name" required>{tr('pbxSoundName')}</FieldLabel>
          <Input id="pbx-sound-name" value={name} invalid={Boolean(form.errors.name)}
            onChange={(e) => { setName(e.target.value); form.clear('name'); }}
            onBlur={() => form.blur('name', payload())} />
          <FieldError message={form.errors.name} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={upload.isPending}>{tr('cancel')}</Button>
          <Button type="submit" loading={upload.isPending} loadingText={tr('saving')} disabled={converting}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

const RenameModal = ({ row, onClose }: { row: PbxSoundRow; onClose: () => void }) => {
  const tr = useTr();
  const { update } = usePbxMutations<PbxSoundRow>('sounds');
  const form = useCatalogForm('pbx_sound.update');
  const [name, setName] = useState(row.name);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: name.trim() };
    if (!form.validate(data)) return;
    try {
      await update.mutateAsync({ id: row.id, data });
      onClose();
    } catch (error) {
      form.fromServer(error, tr('pbxSaveFailed'));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={tr('pbxEditGreeting')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <Alert variant="error">{form.errors._general}</Alert> : null}
        <div>
          <FieldLabel htmlFor="pbx-sound-rename" required>{tr('pbxSoundName')}</FieldLabel>
          <Input id="pbx-sound-rename" value={name} invalid={Boolean(form.errors.name)}
            onChange={(e) => { setName(e.target.value); form.clear('name'); }}
            onBlur={() => form.blur('name', { name: name.trim() })} />
          <FieldError message={form.errors.name} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={update.isPending}>{tr('cancel')}</Button>
          <Button type="submit" loading={update.isPending} loadingText={tr('saving')}>{tr('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

/** Fetches the stored greeting only when asked to play it. */
const GreetingPlayer = ({ row }: { row: PbxSoundRow }) => {
  const tr = useTr();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);
  const url = useObjectUrl(blob);
  const load = useMutation({
    mutationFn: () => getPbxSoundAudioAPI(row.id),
    onSuccess: setBlob,
    onError: () => setFailed(true),
  });
  if (url) return <audio controls autoPlay src={url} className="h-9 max-w-[16rem]" aria-label={`${tr('pbxSoundPlay')} ${row.name}`} />;
  return (
    <div className="flex items-center gap-2">
      <IconButton icon={<PlayIcon className="h-4 w-4" />} label={`${tr('pbxSoundPlay')} ${row.name}`}
        onClick={() => { setFailed(false); load.mutate(); }} disabled={load.isPending} />
      {failed ? <span className="text-xs text-red-600 dark:text-red-400">{tr('pbxSoundLoadFailed')}</span> : null}
    </div>
  );
};

export const GreetingsSection = () => {
  const tr = useTr();
  const { data: rows = [], isLoading } = usePbxRows<PbxSoundRow>('sounds');
  const { remove } = usePbxMutations<PbxSoundRow>('sounds');
  const confirmDelete = useConfirmDelete();
  const [editing, setEditing] = useState<PbxSoundRow | 'new' | null>(null);

  return (
    <div>
      <SectionHeader
        title={tr('pbxGreetings')}
        hint={tr('pbxGreetingsHint')}
        action={<Button onClick={() => setEditing('new')}><PlusIcon className="h-4 w-4" />{tr('pbxAddGreeting')}</Button>}
      />
      <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <tr>
              <TH>{tr('pbxSoundName')}</TH>
              <TH>{tr('pbxSoundDuration')}</TH>
              <TH>{tr('pbxSoundPlay')}</TH>
              <TH className="w-24">{tr('actions')}</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {rows.length === 0 ? (
              <EmptyRow colSpan={4} text={isLoading ? tr('loading') : tr('pbxNoGreetings')} />
            ) : rows.map((row) => (
              <tr key={row.id}>
                <TD className="font-medium">{row.name}</TD>
                <TD><span dir="ltr">{formatSeconds(row.duration_ms)}</span></TD>
                <TD><GreetingPlayer row={row} /></TD>
                <TD>
                  <div className="flex items-center gap-1">
                    <IconButton icon={<EditIcon className="h-4 w-4" />} label={tr('edit')} onClick={() => setEditing(row)} />
                    <IconButton icon={<TrashIcon className="h-4 w-4" />} label={tr('delete')} tone="danger"
                      onClick={() => confirmDelete(row.name, () => remove.mutateAsync(row.id))} />
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </TableHorizontalScroll>
      {editing === 'new' ? <UploadModal onClose={() => setEditing(null)} /> : null}
      {editing && editing !== 'new' ? <RenameModal row={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
};
