import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, RefreshButton, ArrowLeftIcon, YouTubeEmbed } from '../components/index';
import { getPublicNewsPostsAPI, getPublicNewsPostAPI } from '../services/api';
import { useMarkNewsRead } from '../hooks/useQueries';
import { withLatinDigits } from '../utils/dateUtils';

type NewsListItem = {
  id: number;
  title_en: string;
  title_ar: string;
  summary_en?: string;
  summary_ar?: string;
  published_at?: string | null;
  cover_image_url?: string | null;
};

type NewsDetail = NewsListItem & {
  body_en: string;
  body_ar: string;
  youtube_url?: string;
  youtube_embed_url?: string | null;
};

export const NewsPage = () => {
  const { t, language } = useAppContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const markNewsRead = useMarkNewsRead();

  const listQuery = useQuery({
    queryKey: ['public-news-posts'],
    queryFn: () => getPublicNewsPostsAPI(),
  });

  const detailQuery = useQuery({
    queryKey: ['public-news-post', selectedId],
    queryFn: () => getPublicNewsPostAPI(selectedId!),
    enabled: selectedId != null,
  });

  // Clear sidebar unread badge when the user opens News & Updates.
  useEffect(() => {
    markNewsRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const pickTitle = (item: { title_en: string; title_ar: string }) =>
    language === 'ar' ? item.title_ar || item.title_en : item.title_en || item.title_ar;

  const pickSummary = (item: { summary_en?: string; summary_ar?: string }) =>
    language === 'ar' ? item.summary_ar || item.summary_en || '' : item.summary_en || item.summary_ar || '';

  const pickBody = (item: { body_en: string; body_ar: string }) =>
    language === 'ar' ? item.body_ar || item.body_en : item.body_en || item.body_ar;

  const formatDate = (value?: string | null) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString(
        language === 'ar' ? 'ar-EG' : 'en-GB',
        withLatinDigits({
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      );
    } catch {
      return value;
    }
  };

  const posts = (listQuery.data?.results || []) as NewsListItem[];
  const detail = detailQuery.data as NewsDetail | undefined;

  return (
    <PageWrapper
      title={t('news') || 'News & Updates'}
      actions={
        <RefreshButton
          onClick={() => {
            void listQuery.refetch();
            if (selectedId != null) void detailQuery.refetch();
          }}
          loading={listQuery.isFetching || detailQuery.isFetching}
        />
      }
    >
      {selectedId != null ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            <ArrowLeftIcon className="h-4 w-4 shrink-0" />
            {t('newsBack') || 'Back to news'}
          </button>
          {detailQuery.isLoading ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">{t('loading') || 'Loading...'}</div>
          ) : detailQuery.isError || !detail ? (
            <div className="py-12 text-center text-red-600 dark:text-red-400">
              {t('somethingWentWrong') || 'Failed to load.'}
            </div>
          ) : (
            <article className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              {detail.cover_image_url && (
                <img
                  src={detail.cover_image_url}
                  alt=""
                  className="w-full max-h-64 object-cover rounded-md"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {pickTitle(detail)}
                </h2>
                {detail.published_at && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(detail.published_at)}
                  </p>
                )}
              </div>
              <YouTubeEmbed
                embedUrl={detail.youtube_embed_url}
                url={detail.youtube_url}
                title={pickTitle(detail)}
              />
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {pickBody(detail)}
              </div>
            </article>
          )}
        </div>
      ) : listQuery.isLoading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">{t('loading') || 'Loading...'}</div>
      ) : listQuery.isError ? (
        <div className="py-12 text-center text-red-600 dark:text-red-400">
          {t('somethingWentWrong') || 'Failed to load.'}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          {t('newsEmpty') || 'No news or updates yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((item) => {
            const summary = pickSummary(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="w-full text-start bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-400 dark:hover:border-primary-500 transition-colors flex gap-4"
              >
                {item.cover_image_url && (
                  <img
                    src={item.cover_image_url}
                    alt=""
                    className="w-24 h-24 object-cover rounded-md flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {pickTitle(item)}
                  </h3>
                  {item.published_at && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(item.published_at)}
                    </p>
                  )}
                  {summary && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {summary}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
};
