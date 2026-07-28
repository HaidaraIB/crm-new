import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useProducts } from '../../hooks/useQueries';
import { NumberInput } from '../NumberInput';
import type { ProductFilters } from '../../types';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from '../filters';

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  category: 'All',
  supplier: 'All',
  isActive: 'All',
  stockMin: '',
  stockMax: '',
  priceMin: '',
  priceMax: '',
  search: '',
};

export const ProductsFilterDrawer = () => {
  const {
    isProductFilterDrawerOpen,
    setIsProductFilterDrawerOpen,
    t,
    productFilters,
    setProductFilters,
  } = useAppContext();
  const [localFilters, setLocalFilters] = useState(productFilters);

  const { data } = useProducts();
  const products = Array.isArray(data) ? data : data?.results || [];

  const syncDraft = useCallback(() => {
    setLocalFilters(productFilters);
  }, [productFilters]);

  const handleClose = () => {
    setLocalFilters(productFilters);
    setIsProductFilterDrawerOpen(false);
  };

  const handleFilterChange = (key: keyof ProductFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_PRODUCT_FILTERS);
    setProductFilters(DEFAULT_PRODUCT_FILTERS);
  };

  const handleApply = () => {
    setProductFilters(localFilters);
    setIsProductFilterDrawerOpen(false);
  };

  const uniqueCategories = useMemo(
    () =>
      Array.from(new Set<string>(
          products
            .map((p: any) => p.category as string | undefined)
            .filter((c): c is string => Boolean(c)),
        ),
      ),
    [products],
  );
  const uniqueSuppliers = useMemo(
    () =>
      Array.from(new Set<string>(
          products
            .map((p: any) => p.supplier as string | undefined)
            .filter((s): s is string => Boolean(s)),
        ),
      ),
    [products],
  );

  return (
    <FilterDrawerShell
      isOpen={isProductFilterDrawerOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      title={t('filterProducts')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('productInfo')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="products-filter-category">{t('category')}</FilterLabel>
            <FilterSelect
              id="products-filter-category"
              value={localFilters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="products-filter-supplier">{t('supplier')}</FilterLabel>
            <FilterSelect
              id="products-filter-supplier"
              value={localFilters.supplier}
              onChange={(e) => handleFilterChange('supplier', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              {uniqueSuppliers.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div>
            <FilterLabel htmlFor="products-filter-status">{t('status')}</FilterLabel>
            <FilterSelect
              id="products-filter-status"
              value={localFilters.isActive}
              onChange={(e) => handleFilterChange('isActive', e.target.value)}
            >
              <option value="All">{t('all')}</option>
              <option value="true">{t('active')}</option>
              <option value="false">{t('inactive')}</option>
            </FilterSelect>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FilterLabel htmlFor="products-filter-stock-min">{t('stockRangeStart')}</FilterLabel>
              <NumberInput
                id="products-filter-stock-min"
                name="products-filter-stock-min"
                value={localFilters.stockMin}
                onChange={(e) => handleFilterChange('stockMin', e.target.value)}
                placeholder="0"
                min={0}
                step={1}
              />
            </div>
            <div>
              <FilterLabel htmlFor="products-filter-stock-max">{t('stockRangeEnd')}</FilterLabel>
              <NumberInput
                id="products-filter-stock-max"
                name="products-filter-stock-max"
                value={localFilters.stockMax}
                onChange={(e) => handleFilterChange('stockMax', e.target.value)}
                placeholder="100"
                min={0}
                step={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FilterLabel htmlFor="products-filter-price-min">{t('priceRangeStart')}</FilterLabel>
              <NumberInput
                id="products-filter-price-min"
                name="products-filter-price-min"
                value={localFilters.priceMin}
                onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                placeholder={t('eg500000')}
                min={0}
                step={1}
              />
            </div>
            <div>
              <FilterLabel htmlFor="products-filter-price-max">{t('priceRangeEnd')}</FilterLabel>
              <NumberInput
                id="products-filter-price-max"
                name="products-filter-price-max"
                value={localFilters.priceMax}
                onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                placeholder={t('eg1000000')}
                min={0}
                step={1}
              />
            </div>
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('search')}>
        <div className="pt-2">
          <FilterLabel htmlFor="products-filter-search">{t('searchByNameOrCode')}</FilterLabel>
          <FilterInput
            id="products-filter-search"
            placeholder={t('search')}
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};
