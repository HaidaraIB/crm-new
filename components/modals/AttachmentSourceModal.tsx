import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { FileTextIcon, MicrophoneIcon } from '../icons';
import { ChatMediaThumb } from '../chat/ChatMediaThumb';
import { useAppContext } from '../../context/AppContext';
import {
  CompanyLibraryFile,
  downloadCompanyLibraryAsFileAPI,
  getCompanyLibraryDownloadUrl,
  listCompanyLibraryAPI,
} from '../../services/api';

type Step = 'source' | 'library';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onPickDevice: () => void;
  onPickLibraryFile: (file: File) => void;
  t: (key: string) => string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindLabel(kind: string, t: (key: string) => string): string {
  switch (kind) {
    case 'image':
      return t('libraryKindImage') || 'Image';
    case 'video':
      return t('libraryKindVideo') || 'Video';
    case 'audio':
      return t('libraryKindAudio') || 'Audio';
    case 'document':
      return t('libraryKindDocument') || 'Document';
    default:
      return kind;
  }
}

export const AttachmentSourceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onPickDevice,
  onPickLibraryFile,
  t,
}) => {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const [step, setStep] = useState<Step>('source');
  const [files, setFiles] = useState<CompanyLibraryFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('source');
      setError(null);
      setPickingId(null);
    }
  }, [isOpen]);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCompanyLibraryAPI();
      setFiles(data.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('libraryLoadError'));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen && step === 'library') {
      void loadLibrary();
    }
  }, [isOpen, step, loadLibrary]);

  const handleLibrarySelect = async (item: CompanyLibraryFile) => {
    setPickingId(item.id);
    setError(null);
    try {
      const file = await downloadCompanyLibraryAsFileAPI(item.id, item.original_filename);
      onPickLibraryFile(file);
      onClose();
    } catch {
      setError(t('libraryPickError') || 'Could not load this file.');
    } finally {
      setPickingId(null);
    }
  };

  const renderPreview = (item: CompanyLibraryFile) => {
    const url = getCompanyLibraryDownloadUrl(item.id);
    if (item.kind === 'image' || item.kind === 'video') {
      return (
        <ChatMediaThumb
          url={url}
          kind={item.kind}
          className="h-24 w-full"
          mediaClassName="h-full w-full object-cover"
        />
      );
    }
    if (item.kind === 'audio') {
      return (
        <div className="flex h-24 w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
          <MicrophoneIcon className="size-8 text-gray-500 dark:text-gray-400" />
        </div>
      );
    }
    return (
      <div className="flex h-24 w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
        <FileTextIcon className="size-8 text-gray-500 dark:text-gray-400" />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'library'
          ? t('libraryPickTitle') || 'Choose from library'
          : t('attachSourceTitle') || 'Send attachment'
      }
      maxWidth={step === 'library' ? '2xl' : 'md'}
      overlayClassName="z-[80]"
    >
      {step === 'source' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('attachSourceDesc') ||
              'Choose a shared library file or pick one from your device.'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              onClick={() => setStep('library')}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {t('attachFromLibrary') || 'From library'}
              </div>
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              onClick={() => {
                onClose();
                onPickDevice();
              }}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {t('attachFromDevice') || 'From this device'}
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" onClick={() => setStep('source')}>
            {isRtl ? (
              <>→ {t('back') || 'Back'}</>
            ) : (
              <>← {t('back') || 'Back'}</>
            )}
          </Button>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {loading ? (
            <p className="text-sm text-gray-500">{t('loading') || 'Loading…'}</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('libraryPickEmpty') || 'No files in the library.'}
            </p>
          ) : (
            <ul className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
              {files.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pickingId != null}
                    className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600 text-start hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 transition-colors"
                    onClick={() => void handleLibrarySelect(item)}
                    title={`${kindLabel(item.kind, t)} · ${formatBytes(item.size_bytes)}`}
                    aria-label={`${kindLabel(item.kind, t)} · ${formatBytes(item.size_bytes)}`}
                  >
                    <div className="relative">
                      {renderPreview(item)}
                      {pickingId === item.id ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                          {t('loading') || 'Loading…'}
                        </div>
                      ) : null}
                    </div>
                    <div className="px-2 py-1.5 text-center text-xs text-gray-500 dark:text-gray-400">
                      {kindLabel(item.kind, t)} · {formatBytes(item.size_bytes)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
};
