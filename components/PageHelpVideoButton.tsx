import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { Modal } from './Modal';
import { YouTubeEmbed } from './YouTubeEmbed';
import { getPublicPageHelpVideoAPI } from '../services/api';

type PageHelpVideoButtonProps = {
  /** Matches backend PageHelpVideo.page_key (e.g. whatsapp, meta). */
  pageKey: string;
  className?: string;
};

/** Play-in-circle icon for page tutorial help. */
const VideoHelpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Shows a video icon next to a page title when a tutorial is configured.
 * Opens an in-app YouTube embed modal (no redirect required).
 */
export const PageHelpVideoButton: React.FC<PageHelpVideoButtonProps> = ({
  pageKey,
  className = '',
}) => {
  const { t, language } = useAppContext();
  const [open, setOpen] = useState(false);

  const { data: video } = useQuery({
    queryKey: ['page-help-video', pageKey],
    queryFn: () => getPublicPageHelpVideoAPI(pageKey),
    enabled: Boolean(pageKey),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!video?.youtube_embed_url && !video?.youtube_url) {
    return null;
  }

  const title =
    language === 'ar'
      ? video.title_ar || video.title_en || t('watchTutorial') || 'Watch tutorial'
      : video.title_en || video.title_ar || t('watchTutorial') || 'Watch tutorial';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center rounded-full p-1.5 text-primary-600 hover:bg-primary-50 hover:text-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/40 dark:hover:text-primary-300 transition-colors ${className}`}
        title={t('watchTutorial') || 'Watch tutorial'}
        aria-label={t('watchTutorial') || 'Watch tutorial'}
      >
        <VideoHelpIcon className="h-6 w-6" />
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={title}
        maxWidth="2xl"
      >
        <YouTubeEmbed
          embedUrl={video.youtube_embed_url}
          url={video.youtube_url}
          title={title}
        />
      </Modal>
    </>
  );
};
