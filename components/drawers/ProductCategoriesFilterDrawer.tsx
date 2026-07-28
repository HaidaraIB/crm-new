import React, { useCallback, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { ProductCategoryFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterInput,
} from '../filters';

export const DEFAULT_PRODUCT_CATEGORY_FILTERS: ProductCategoryFilters = {
  search: '',
};

export const ProductCategoriesFilterDrawer = () => {
  const {
    isProductCategoryFilterDrawerOpen,
    setIsProductCategoryFilterDrawerOpen,
    t,
    productCategoryFilters,
    setProductCategoryFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(productCategoryFilters);

  const syncDraft = useCallback(() => {
    setLocalFilters(productCategoryFilters);
  }, [productCategoryFilters]);

  const handleClose = () => {
    setLocalFilters(productCategoryFilters);
    setIsProductCategoryFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof ProductCategoryFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_PRODUCT_CATEGORY_FILTERS);
    setProductCategoryFilters(DEFAULT_PRODUCT_CATEGORY_FILTERS);
  };

  const handleApply = () => {
    setProductCategoryFilters(localFilters);
    setIsProductCategoryFilterDrawerOpen(false);
  };

  return (
    <FilterDrawerShell
      isOpen={isProductCategoryFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterProductCategories')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('search')}>
        <div className="pt-2">
          <FilterLabel htmlFor="product-categories-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="product-categories-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
