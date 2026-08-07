import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, RefreshButton, ArrowLeftIcon } from '../components/index';
import { getPublicGuideArticlesAPI, getPublicGuideArticleAPI } from '../services/api';

type GuideListItem = {
  id: number;
  title_en: string;
  title_ar: string;
  cover_image_url?: string | null;
  sort_order: number;
};

type GuideDetail = GuideListItem & {
  body_en: string;
  body_ar: string;
};

export const UserGuidePage = () => {
  const { t, language } = useAppContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ['public-guide-articles'],
    queryFn: () => getPublicGuideArticlesAPI(),
  });

  const detailQuery = useQuery({
    queryKey: ['public-guide-article', selectedId],
    queryFn: () => getPublicGuideArticleAPI(selectedId!),
    enabled: selectedId != null,
  });

  const pickTitle = (item: { title_en: string; title_ar: string }) =>
    language === 'ar' ? item.title_ar || item.title_en : item.title_en || item.title_ar;

  const pickBody = (item: { body_en: string; body_ar: string }) =>
    language === 'ar' ? item.body_ar || item.body_en : item.body_en || item.body_ar;

  const articles = (listQuery.data?.results || []) as GuideListItem[];
  const detail = detailQuery.data as GuideDetail | undefined;

  return (
    <PageWrapper
      title={t('userGuide') || 'User Guide'}
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
            {t('userGuideBack') || 'Back to articles'}
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {pickTitle(detail)}
              </h2>
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
      ) : articles.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          {t('userGuideEmpty') || 'No guide articles are available yet.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className="text-start bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
            >
              {item.cover_image_url ? (
                <img
                  src={item.cover_image_url}
                  alt=""
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div className="w-full h-24 bg-gray-100 dark:bg-gray-700/60" />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {pickTitle(item)}
                </h3>
              </div>
            </button>
          ))}
        </div>
      )}
    </PageWrapper>
  );
};
