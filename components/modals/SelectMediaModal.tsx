import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';

type TabId = 'upload' | 'url';

type SelectMediaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (url: string, file?: File) => void;
  t: (key: string) => string;
  accept?: 'image' | 'video' | 'document' | 'all';
};

export const SelectMediaModal = ({ isOpen, onClose, onSelect, t, accept = 'all' }: SelectMediaModalProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [urlInput, setUrlInput] = useState('');

  const tabs = [
    { id: 'upload' as TabId, label: t('selectMediaUpload') || 'Upload Your File' },
    { id: 'url' as TabId, label: t('selectMediaFromUrl') || 'From URL' },
  ];

  const handleSelectFromUrl = () => {
    if (urlInput.trim() && onSelect) {
      onSelect(urlInput.trim());
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSelect) {
      onSelect(URL.createObjectURL(file), file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('selectMedia') || 'Select Media'}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'upload' && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
            <input
              type="file"
              accept={accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : accept === 'document' ? '.pdf,.doc,.docx' : '*'}
              onChange={handleFileChange}
              className="hidden"
              id="media-upload"
            />
            <label htmlFor="media-upload" className="cursor-pointer flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <span>{t('selectMediaUpload') || 'Upload Your File'}</span>
            </label>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="space-y-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
            <Button onClick={handleSelectFromUrl} disabled={!urlInput.trim()}>{t('select') || 'Select'}</Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
