import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PageWrapper,
  Card,
  Button,
  TrashIcon,
  FileTextIcon,
  TableHorizontalScroll,
  MicrophoneIcon,
} from '../components/index';
import { ChatMediaThumb } from '../components/chat/ChatMediaThumb';
import { ChatMediaViewer } from '../components/chat/ChatMediaViewer';
import type { ChatMediaAlbumItem } from '../components/chat/chatMediaAlbum';
import { useAppContext } from '../context/AppContext';
import {
  CompanyLibraryFile,
  CompanyLibraryQuota,
  deleteCompanyLibraryFileAPI,
  getCompanyLibraryDownloadUrl,
  listCompanyLibraryAPI,
  uploadCompanyLibraryFileAPI,
} from '../services/api';
import { normalizeRole } from '../utils/roles';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

export const LibraryPage = () => {
  const {
    t,
    currentUser,
    setIsSuccessModalOpen,
    setSuccessMessage,
    setConfirmDeleteConfig,
    setIsConfirmDeleteModalOpen,
  } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<CompanyLibraryFile[]>([]);
  const [quota, setQuota] = useState<CompanyLibraryQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{ items: ChatMediaAlbumItem[]; index: number } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCompanyLibraryAPI();
      setFiles(data.results || []);
      setQuota(data.quota || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('libraryLoadError');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const mediaAlbum = useMemo((): ChatMediaAlbumItem[] => {
    return files
      .filter((f) => f.kind === 'image' || f.kind === 'video')
      .map((f) => ({
        id: String(f.id),
        kind: f.kind as 'image' | 'video',
        url: getCompanyLibraryDownloadUrl(f.id),
        filename: f.original_filename,
      }));
  }, [files]);

  if (normalizeRole(currentUser?.role) !== 'Owner') {
    return (
      <PageWrapper title={t('library') || 'Library'}>
        <Card>
          <p className="text-gray-500 dark:text-gray-400">
            {t('ownerOnlySettings') || 'Only the company owner can change these settings.'}
          </p>
        </Card>
      </PageWrapper>
    );
  }

  const used = quota?.used_bytes ?? 0;
  const maxStorage = quota?.max_storage_bytes;
  const pct =
    maxStorage && maxStorage > 0 ? Math.min(100, Math.round((used / maxStorage) * 100)) : null;

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadCompanyLibraryFileAPI(file);
      setQuota(result.quota);
      setFiles((prev) => [result.file, ...prev.filter((f) => f.id !== result.file.id)]);
      setSuccessMessage(t('libraryUploadSuccess') || 'File uploaded to library.');
      setIsSuccessModalOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('libraryUploadError');
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (file: CompanyLibraryFile) => {
    setConfirmDeleteConfig({
      title: t('libraryDeleteTitle') || 'Delete library file',
      message: t('libraryDeleteConfirm') || 'Are you sure you want to delete this file from the library?',
      itemName: file.original_filename,
      onConfirm: async () => {
        const result = await deleteCompanyLibraryFileAPI(file.id);
        setQuota(result.quota);
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };

  const openPreview = (file: CompanyLibraryFile) => {
    if (file.kind !== 'image' && file.kind !== 'video') return;
    const index = mediaAlbum.findIndex((it) => it.id === String(file.id));
    if (index < 0) return;
    setMediaViewer({ items: mediaAlbum, index });
  };

  const renderPreviewCell = (file: CompanyLibraryFile) => {
    const url = getCompanyLibraryDownloadUrl(file.id);
    if (file.kind === 'image' || file.kind === 'video') {
      return (
        <button
          type="button"
          className="mx-auto block size-14 overflow-hidden rounded-md border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={() => openPreview(file)}
          title={t('preview') || 'Preview'}
          aria-label={t('preview') || 'Preview'}
        >
          <ChatMediaThumb
            url={url}
            kind={file.kind}
            className="size-14"
            mediaClassName="h-full w-full object-cover"
          />
        </button>
      );
    }
    if (file.kind === 'audio') {
      return (
        <div
          className="mx-auto flex size-14 items-center justify-center rounded-md border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
          title={file.original_filename}
        >
          <MicrophoneIcon className="size-6 text-gray-500 dark:text-gray-400" />
        </div>
      );
    }
    return (
      <div
        className="mx-auto flex size-14 items-center justify-center rounded-md border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
        title={file.original_filename}
      >
        <FileTextIcon className="size-6 text-gray-500 dark:text-gray-400" />
      </div>
    );
  };

  return (
    <PageWrapper title={t('library') || 'Library'}>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {t('librarySettingsDesc') ||
          'Upload shared files your team can send in WhatsApp and Team Chat.'}
      </p>

      <Card>
        <div className="mb-4 flex flex-col gap-4 border-b pb-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">{t('library') || 'Library'}</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => void handleUpload(e.target.files)}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              loading={uploading}
              disabled={uploading || quota?.remaining_bytes === 0}
            >
              {t('libraryUpload') || 'Upload file'}
            </Button>
          </div>
        </div>

        {quota && (
          <div className="mb-6">
            <div className="mb-1 flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>
                {t('libraryStorageUsed') || 'Storage used'}: {formatBytes(used)}
                {maxStorage != null ? ` / ${formatBytes(maxStorage)}` : ''}
              </span>
              <span>
                {t('libraryMaxFileSize') || 'Max file size'}:{' '}
                {formatBytes(quota.max_file_size_bytes)}
              </span>
            </div>
            {pct != null && (
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full bg-blue-600 transition-all dark:bg-blue-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">{t('loading') || 'Loading…'}</p>
        ) : files.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            {t('libraryEmpty') || 'No files in the library yet.'}
          </p>
        ) : (
          <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <tr>
                  <th className="min-w-[100px] px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {t('preview') || 'Preview'}
                  </th>
                  <th className="min-w-[180px] px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {t('libraryFileName') || 'Name'}
                  </th>
                  <th className="min-w-[120px] px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {t('libraryFileType') || 'Type'}
                  </th>
                  <th className="min-w-[100px] px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {t('libraryFileSize') || 'Size'}
                  </th>
                  <th className="min-w-[140px] px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {t('libraryUploadedBy') || 'Uploaded by'}
                  </th>
                  <th className="w-[100px] px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {t('actions') || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {renderPreviewCell(file)}
                    </td>
                    <td className="max-w-[240px] px-6 py-4 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                      <span className="block truncate" title={file.original_filename}>
                        {file.original_filename}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300">
                      {kindLabel(file.kind, t)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300">
                      {formatBytes(file.size_bytes)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300">
                      {file.uploaded_by_name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <button
                        type="button"
                        className="mx-auto inline-flex rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={() => handleDelete(file)}
                        title={t('delete') || 'Delete'}
                        aria-label={t('delete') || 'Delete'}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableHorizontalScroll>
        )}
      </Card>

      {mediaViewer && mediaViewer.items.length > 0 ? (
        <ChatMediaViewer
          items={mediaViewer.items}
          initialIndex={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
          t={t}
        />
      ) : null}
    </PageWrapper>
  );
};
