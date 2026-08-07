import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, RefreshButton, ArrowLeftIcon, YouTubeEmbed } from '../components/index';
import {
  getPublicGuideArticlesAPI,
  getPublicGuideArticleAPI,
  getPublicGuideCategoriesAPI,
} from '../services/api';

type GuideCategory = {
  id: number;
  name_en: string;
  name_ar: string;
  slug: string;
  sort_order: number;
};

type GuideListItem = {
  id: number;
  title_en: string;
  title_ar: string;
  cover_image_url?: string | null;
  sort_order: number;
  category?: GuideCategory | null;
};

type GuideDetail = GuideListItem & {
  body_en: string;
  body_ar: string;
  youtube_url?: string;
  youtube_embed_url?: string | null;
};

export const UserGuidePage = () => {
  const { t, language } = useAppContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all' | 'uncategorized'>('all');

  const categoriesQuery = useQuery({
    queryKey: ['public-guide-categories'],
    queryFn: () => getPublicGuideCategoriesAPI(),
  });

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

  const pickCategoryName = (cat: GuideCategory) =>
    language === 'ar' ? cat.name_ar || cat.name_en : cat.name_en || cat.name_ar;

  const pickBody = (item: { body_en: string; body_ar: string }) =>
    language === 'ar' ? item.body_ar || item.body_en : item.body_en || item.body_ar;

  const categories = (categoriesQuery.data?.results || []) as GuideCategory[];
  const articles = (listQuery.data?.results || []) as GuideListItem[];
  const detail = detailQuery.data as GuideDetail | undefined;

  const filteredArticles = useMemo(() => {
    if (categoryFilter === 'all') return articles;
    if (categoryFilter === 'uncategorized') {
      return articles.filter((a) => !a.category?.id);
    }
    return articles.filter((a) => a.category?.id === categoryFilter);
  }, [articles, categoryFilter]);

  const groupedSections = useMemo(() => {
    if (categoryFilter !== 'all') {
      return [
        {
          key: String(categoryFilter),
          title:
            categoryFilter === 'uncategorized'
              ? t('userGuideUncategorized') || 'Uncategorized'
              : pickCategoryName(
                  categories.find((c) => c.id === categoryFilter) || {
                    id: 0,
                    name_en: '',
                    name_ar: '',
                    slug: '',
                    sort_order: 0,
                  },
                ),
          items: filteredArticles,
        },
      ];
    }

    const byId = new Map<number, GuideListItem[]>();
    const uncategorized: GuideListItem[] = [];
    for (const article of articles) {
      const catId = article.category?.id;
      if (!catId) {
        uncategorized.push(article);
        continue;
      }
      const list = byId.get(catId) || [];
      list.push(article);
      byId.set(catId, list);
    }

    const sections = categories
      .filter((c) => byId.has(c.id))
      .map((c) => ({
        key: String(c.id),
        title: pickCategoryName(c),
        items: byId.get(c.id) || [],
      }));

    // Categories present on articles but missing from categories list
    for (const [catId, items] of byId.entries()) {
      if (sections.some((s) => s.key === String(catId))) continue;
      const sample = items[0]?.category;
      sections.push({
        key: String(catId),
        title: sample ? pickCategoryName(sample) : String(catId),
        items,
      });
    }

    if (uncategorized.length > 0) {
      sections.push({
        key: 'uncategorized',
        title: t('userGuideUncategorized') || 'Uncategorized',
        items: uncategorized,
      });
    }

    return sections;
  }, [articles, categories, categoryFilter, filteredArticles, language, t]);

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-full border transition-colors ${
      active
        ? 'bg-primary-600 text-white border-primary-600'
        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
    }`;

  const renderArticleCard = (item: GuideListItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => setSelectedId(item.id)}
      className="text-start bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
    >
      {item.cover_image_url ? (
        <img src={item.cover_image_url} alt="" className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-24 bg-gray-100 dark:bg-gray-700/60" />
      )}
      <div className="p-4 space-y-1">
        {item.category && categoryFilter === 'all' && (
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
            {pickCategoryName(item.category)}
          </p>
        )}
        <h3 className="font-semibold text-gray-900 dark:text-white">{pickTitle(item)}</h3>
      </div>
    </button>
  );

  return (
    <PageWrapper
      title={t('userGuide') || 'User Guide'}
      actions={
        <RefreshButton
          onClick={() => {
            void categoriesQuery.refetch();
            void listQuery.refetch();
            if (selectedId != null) void detailQuery.refetch();
          }}
          loading={
            listQuery.isFetching || detailQuery.isFetching || categoriesQuery.isFetching
          }
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
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              {t('loading') || 'Loading...'}
            </div>
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
              {detail.category && (
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {pickCategoryName(detail.category)}
                </p>
              )}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {pickTitle(detail)}
              </h2>
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
      ) : listQuery.isLoading || categoriesQuery.isLoading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          {t('loading') || 'Loading...'}
        </div>
      ) : listQuery.isError ? (
        <div className="py-12 text-center text-red-600 dark:text-red-400">
          {t('somethingWentWrong') || 'Failed to load.'}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          {t('userGuideEmpty') || 'No guide articles are available yet.'}
        </div>
      ) : (
        <div className="space-y-6">
          {(categories.length > 0 || articles.some((a) => !a.category)) && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={chipClass(categoryFilter === 'all')}
                onClick={() => setCategoryFilter('all')}
              >
                {t('userGuideAllCategories') || 'All'}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={chipClass(categoryFilter === cat.id)}
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  {pickCategoryName(cat)}
                </button>
              ))}
              {articles.some((a) => !a.category) && (
                <button
                  type="button"
                  className={chipClass(categoryFilter === 'uncategorized')}
                  onClick={() => setCategoryFilter('uncategorized')}
                >
                  {t('userGuideUncategorized') || 'Uncategorized'}
                </button>
              )}
            </div>
          )}

          {filteredArticles.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              {t('userGuideEmptyCategory') || 'No articles in this category.'}
            </div>
          ) : (
            <div className="space-y-8">
              {groupedSections.map((section) => (
                <section key={section.key} className="space-y-3">
                  {categoryFilter === 'all' && (
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </h2>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map(renderArticleCard)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
};
