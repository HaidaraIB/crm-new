import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button, Card, IconButton, PlusIcon, Select, TrashIcon } from '../index';
import { Input, AutoDirTextarea } from '../Input';
import { NumberInput } from '../NumberInput';
import { LeadSearchSelect } from '../leads/LeadSearchSelect';
import { useDealPipelines, useProducts, useProjects, useServicePackages, useServices, useUnits, useUsers } from '../../hooks/useQueries';
import { formatDealMoney } from '../../utils/deals/dealFormatters';
import { toDealPayload, type DealWritePayload } from '../../utils/deals/dealMapper';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';
import type { Deal, DealLineItem } from '../../types';

type DealFormProps = {
  initial?: Deal | null;
  submitting?: boolean;
  onSubmit: (payload: DealWritePayload, items: DealLineItem[]) => Promise<void>;
  onCancel: () => void;
};

const emptyItem = (): DealLineItem => ({
  itemType: 'custom',
  name: '',
  unitPrice: 0,
  quantity: 1,
  discountPercentage: 0,
  lineTotal: 0,
});

const rowsOf = (data: any) => (Array.isArray(data) ? data : data?.results || []);

const FIELD_SCROLL: Array<[string, string]> = [
  ['client', 'deal-field-client'],
  ['title', 'deal-field-title'],
  ['expected_close_date', 'deal-field-expected-close'],
  ['expectedCloseDate', 'deal-field-expected-close'],
  ['currency', 'deal-field-currency'],
  ['value', 'deal-field-value'],
  ['discount_percentage', 'deal-field-discount'],
  ['discountPercentage', 'deal-field-discount'],
  ['description', 'deal-field-description'],
  ['service', 'deal-field-line-items'],
  ['product', 'deal-field-line-items'],
  ['service_package', 'deal-field-line-items'],
  ['unit', 'deal-field-line-items'],
  ['_general', 'deal-field-general'],
  ['general', 'deal-field-general'],
];

const VISIBLE_FIELDS = new Set(FIELD_SCROLL.map(([key]) => key));

function scrollToDealError(fieldErrors: Record<string, string>) {
  const match = FIELD_SCROLL.find(([key]) => fieldErrors[key]);
  const id = match?.[1] || 'deal-field-general';
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = el.querySelector('input, select, textarea, button');
    if (focusable instanceof HTMLElement) focusable.focus({ preventScroll: true });
  });
}

export const DealForm = ({ initial, submitting, onSubmit, onCancel }: DealFormProps) => {
  const { t, currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const { data: pipelines = [] } = useDealPipelines();
  const { data: usersResponse } = useUsers();
  const { data: productsResponse } = useProducts();
  const { data: servicesResponse } = useServices();
  const { data: packagesResponse } = useServicePackages();
  const { data: unitsResponse } = useUnits();
  const { data: projectsResponse } = useProjects();
  const users = rowsOf(usersResponse);
  const products = rowsOf(productsResponse);
  const services = rowsOf(servicesResponse);
  const packages = rowsOf(packagesResponse);
  const units = rowsOf(unitsResponse);
  const projects = rowsOf(projectsResponse);

  const defaultPipeline = pipelines.find((pipeline) => pipeline.isDefault) || pipelines[0];
  const [client, setClient] = useState(initial?.client || initial?.leadId || 0);
  const [title, setTitle] = useState(initial?.title || '');
  const [employee, setEmployee] = useState(initial?.employee ? String(initial.employee) : '');
  const [pipelineId, setPipelineId] = useState(initial?.pipeline ? String(initial.pipeline) : '');
  const [stageId, setStageId] = useState(initial?.pipelineStage ? String(initial.pipelineStage) : '');
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || 'cash');
  const [status, setStatus] = useState(initial?.status || 'reservation');
  const [value, setValue] = useState(initial ? String(initial.value ?? '') : '');
  const [currency, setCurrency] = useState(initial?.currency || '');
  const [expectedCloseDate, setExpectedCloseDate] = useState(initial?.expectedCloseDate?.slice(0, 10) || '');
  const [discountPercentage, setDiscountPercentage] = useState(String(initial?.discountPercentage ?? 0));
  const [discountAmount, setDiscountAmount] = useState(String(initial?.discountAmount ?? 0));
  const [commissionPct, setCommissionPct] = useState(String(initial?.salesCommissionPercentage ?? 0));
  const [commissionAmt, setCommissionAmt] = useState(String(initial?.salesCommissionAmount ?? 0));
  const [description, setDescription] = useState(initial?.description || '');
  const [project, setProject] = useState(initial?.project ? String(initial.project) : '');
  const [unit, setUnit] = useState(initial?.unit ? String(initial.unit) : '');
  const [items, setItems] = useState<DealLineItem[]>(initial?.lineItems?.length ? initial.lineItems : []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activePipeline = pipelines.find((pipeline) => String(pipeline.id) === (pipelineId || String(defaultPipeline?.id || ''))) || defaultPipeline;
  const stages = activePipeline?.stages || [];
  const itemTypes = specialization === 'real_estate'
    ? ['unit', 'custom']
    : specialization === 'products'
      ? ['product', 'custom']
      : specialization === 'services' || specialization === 'medical'
        ? ['service', 'service_package', 'custom']
        : ['custom'];

  const preview = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const gross = Number(item.unitPrice || 0) * Number(item.quantity || 0);
      return sum + gross * (1 - Number(item.discountPercentage || 0) / 100);
    }, 0);
    const pct = Number(discountPercentage) || 0;
    const amount = Number(discountAmount) || 0;
    const discount = pct > 0 ? subtotal * pct / 100 : amount;
    return Math.max(subtotal - discount, 0);
  }, [items, discountPercentage, discountAmount]);

  const updateItem = (index: number, patch: Partial<DealLineItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const translate = (key: string) => {
    const value = t(key as never);
    return value && value !== key ? value : undefined;
  };

  const dealValues = (patch: Record<string, unknown> = {}) => ({
    client: client || null,
    title,
    value: items.length ? preview : value,
    discount_percentage: discountPercentage,
    expected_close_date: expectedCloseDate,
    expectedCloseDate,
    description,
    currency,
    ...patch,
  });

  const mirrorDealErrors = (raw: Record<string, string>) => {
    const next = { ...raw };
    if (next.expectedCloseDate && !next.expected_close_date) next.expected_close_date = next.expectedCloseDate;
    if (next.expected_close_date && !next.expectedCloseDate) next.expectedCloseDate = next.expected_close_date;
    if (next.discount_percentage && !next.discountPercentage) next.discountPercentage = next.discount_percentage;
    const unseen = Object.entries(next).filter(([key]) => !VISIBLE_FIELDS.has(key));
    if (unseen.length) {
      next._general = [next._general, ...unseen.map(([, message]) => message)].filter(Boolean).join(' ');
    }
    return next;
  };

  const revealErrors = (next: Record<string, string>) => {
    setErrors(next);
    if (Object.keys(next).length > 0) scrollToDealError(next);
  };

  const showDealField = (field: string, patch: Record<string, unknown> = {}) => {
    const next = mirrorDealErrors(catalogFieldErrors('deal.upsert', dealValues(patch), translate));
    const keys = field === 'expectedCloseDate'
      ? ['expectedCloseDate', 'expected_close_date']
      : field === 'discountPercentage'
        ? ['discountPercentage', 'discount_percentage']
        : [field];
    setErrors((prev) => {
      const updated = { ...prev };
      for (const key of keys) {
        if (next[key]) updated[key] = next[key];
        else delete updated[key];
      }
      return updated;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = mirrorDealErrors(catalogFieldErrors('deal.upsert', dealValues(), translate));
    if (Object.keys(next).length > 0) {
      revealErrors(next);
      return;
    }
    const resolvedPipeline = pipelineId ? Number(pipelineId) : activePipeline?.id;
    const resolvedStage = stageId ? Number(stageId) : stages[0]?.id;
    try {
    await onSubmit(toDealPayload({
      client,
      employee: employee ? Number(employee) : null,
      title,
      pipeline: resolvedPipeline,
      pipelineStage: resolvedStage,
      paymentMethod,
      status,
      value: items.length ? null : Number(value || 0),
      currency,
      expectedCloseDate,
      discountPercentage: Number(discountPercentage || 0),
      discountAmount: Number(discountAmount || 0),
      salesCommissionPercentage: Number(commissionPct || 0),
      salesCommissionAmount: Number(commissionAmt || 0),
      description,
      unit: unit ? Number(unit) : null,
      project: project ? Number(project) : null,
    }), items);
    } catch (err) {
      const server = mirrorDealErrors(serverFieldErrors(err, 'deal.upsert', translate));
      if (Object.keys(server).length > 0) {
        revealErrors(server);
        return;
      }
      revealErrors({ _general: err instanceof Error ? err.message : t('errorUpdatingDeal') });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="deal-field-client" className="md:col-span-2">
            <label className="block text-sm mb-1">{t('clientName')}</label>
            <div onBlur={() => showDealField('client')}>
              <LeadSearchSelect
                value={client}
                hasError={Boolean(errors.client)}
                onChange={(id) => {
                setClient(id);
                if (errors.client) showDealField('client', { client: id || null });
              }} />
            </div>
            {errors.client && <p className="mt-1 text-sm text-red-600" role="alert">{errors.client}</p>}
          </div>
          <div id="deal-field-title">
            <label className="block text-sm mb-1">{t('dealTitle')}</label>
            <Input
              invalid={Boolean(errors.title)}
              value={title}
              onChange={(e) => {
                const value = e.target.value;
                setTitle(value);
                if (errors.title) showDealField('title', { title: value });
              }}
              onBlur={() => showDealField('title')}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600" role="alert">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">{t('dealOwner')}</label>
            <Select value={employee} onChange={(e) => setEmployee(e.target.value)}>
              <option value="">{t('all')}</option>
              {users.map((user: { id: number; username?: string; name?: string }) => (
                <option key={user.id} value={user.id}>{user.name || user.username}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">{t('dealSelectPipeline')}</label>
            <Select value={pipelineId || String(activePipeline?.id || '')} onChange={(e) => { setPipelineId(e.target.value); setStageId(''); }}>
              {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">{t('stage')}</label>
            <Select value={stageId || String(stages[0]?.id || '')} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">{t('status')}</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="reservation">{t('reservation')}</option>
              <option value="contracted">{t('contracted')}</option>
              <option value="closed">{t('closed')}</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">{t('paymentMethod')}</label>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">{t('cash')}</option>
              <option value="installment">{t('installment')}</option>
            </Select>
          </div>
          <div id="deal-field-expected-close">
            <label className="block text-sm mb-1">{t('dealExpectedClose')}</label>
            <Input
              invalid={Boolean(errors.expectedCloseDate || errors.expected_close_date)}
              type="date"
              value={expectedCloseDate}
              onChange={(e) => {
                const value = e.target.value;
                setExpectedCloseDate(value);
                if (errors.expectedCloseDate || errors.expected_close_date) {
                  showDealField('expectedCloseDate', { expected_close_date: value, expectedCloseDate: value });
                }
              }}
              onBlur={() => showDealField('expectedCloseDate')}
            />
            {(errors.expectedCloseDate || errors.expected_close_date) && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.expectedCloseDate || errors.expected_close_date}</p>
            )}
          </div>
          <div id="deal-field-currency">
            <label className="block text-sm mb-1">{t('dealCurrency')}</label>
            <Input
              invalid={Boolean(errors.currency)}
              value={currency}
              onChange={(e) => {
                const value = e.target.value;
                setCurrency(value);
                if (errors.currency) showDealField('currency', { currency: value });
              }}
              onBlur={() => showDealField('currency')}
            />
            {errors.currency && <p className="mt-1 text-sm text-red-600" role="alert">{errors.currency}</p>}
          </div>
          {specialization === 'real_estate' && (
            <>
              <div>
                <label className="block text-sm mb-1">{t('project')}</label>
                <Select value={project} onChange={(e) => setProject(e.target.value)}>
                  <option value="">{t('all')}</option>
                  {projects.map((row: { id: number; name?: string }) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">{t('unit')}</label>
                <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="">{t('all')}</option>
                  {units.map((row: { id: number; code?: string }) => <option key={row.id} value={row.id}>{row.code || row.id}</option>)}
                </Select>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div id="deal-field-line-items" className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('dealLineItems')}</h3>
            <Button type="button" variant="secondary" onClick={() => setItems((prev) => [...prev, { ...emptyItem(), itemType: itemTypes[0] as DealLineItem['itemType'] }])}><PlusIcon className="h-4 w-4" />{t('dealAddLineItem')}</Button>
          </div>
          {items.length === 0 && <p className="text-sm text-gray-500">{t('dealNoLineItems')}</p>}
          {items.map((item, index) => {
            const lineKey = item.itemType === 'service_package' ? 'service_package' : item.itemType;
            const lineError = errors[lineKey];
            return (
            <div key={index} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end">
              <Select value={item.itemType} onChange={(e) => updateItem(index, { itemType: e.target.value as DealLineItem['itemType'] })}>
                {itemTypes.map((type) => <option key={type} value={type}>{t(type === 'custom' ? 'dealCustomItem' : type === 'service_package' ? 'servicePackages' : type === 'product' ? 'products' : type === 'service' ? 'services' : 'unit')}</option>)}
              </Select>
              {item.itemType !== 'custom' ? (() => {
                const catalog = item.itemType === 'product' ? products : item.itemType === 'service' ? services : item.itemType === 'service_package' ? packages : units;
                return (
                <Select invalid={Boolean(lineError)} value={String(item.product || item.service || item.servicePackage || item.unit || '')} onChange={(e) => {
                  const id = Number(e.target.value);
                  const match = catalog.find((row: { id: number; name?: string; code?: string; price?: number }) => row.id === id);
                  updateItem(index, {
                    product: item.itemType === 'product' ? id : null,
                    service: item.itemType === 'service' ? id : null,
                    servicePackage: item.itemType === 'service_package' ? id : null,
                    unit: item.itemType === 'unit' ? id : null,
                    name: match?.name || match?.code || item.name,
                    unitPrice: Number(match?.price || 0),
                  });
                }}>
                  <option value="">{catalog.length ? t('dealSelectCatalogItem') : t('dealNoCatalogItems')}</option>
                  {catalog.map((row: { id: number; name?: string; code?: string }) => (
                    <option key={row.id} value={row.id}>{row.name || row.code}</option>
                  ))}
                </Select>
                );
              })() : (
                <Input value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} placeholder={t('dealTitle')} />
              )}
              <NumberInput value={item.quantity} min={0} step={1} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
              <NumberInput value={item.unitPrice} min={0} step={0.01} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} />
              <IconButton size="md" tone="danger" icon={<TrashIcon className="h-4 w-4" />} label={t('dealDeleteLineItem')} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} />
              {lineError && <p className="md:col-span-full text-sm text-red-600" role="alert">{lineError}</p>}
            </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="deal-field-value">
            <label className="block text-sm mb-1">{t('value')}</label>
            <div onBlur={() => showDealField('value')}>
              <NumberInput
                invalid={Boolean(errors.value)}
                value={items.length ? preview : value}
                disabled={items.length > 0}
                min={0}
                step={0.01}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setValue(nextValue);
                  if (errors.value) showDealField('value', { value: nextValue });
                }}
              />
            </div>
            {errors.value && <p className="mt-1 text-sm text-red-600" role="alert">{errors.value}</p>}
            {items.length > 0 && <p className="mt-1 text-xs text-gray-500">{formatDealMoney(preview, currency)}</p>}
          </div>
          <div id="deal-field-discount">
            <label className="block text-sm mb-1">{t('discountPercentage')}</label>
            <div onBlur={() => showDealField('discountPercentage')}>
              <NumberInput
                invalid={Boolean(errors.discountPercentage || errors.discount_percentage)}
                value={discountPercentage}
                min={0}
                max={100}
                step={0.01}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setDiscountPercentage(nextValue);
                  if (errors.discountPercentage || errors.discount_percentage) {
                    showDealField('discountPercentage', { discount_percentage: nextValue });
                  }
                }}
              />
            </div>
            {(errors.discountPercentage || errors.discount_percentage) && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.discountPercentage || errors.discount_percentage}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">{t('discountAmount')}</label>
            <NumberInput value={discountAmount} min={0} step={0.01} onChange={(e) => setDiscountAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('salesCommissionPercentage')}</label>
            <NumberInput value={commissionPct} min={0} step={0.01} onChange={(e) => setCommissionPct(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('salesCommissionAmount')}</label>
            <NumberInput value={commissionAmt} min={0} step={0.01} onChange={(e) => setCommissionAmt(e.target.value)} />
          </div>
          <div id="deal-field-description" className="md:col-span-2">
            <label className="block text-sm mb-1">{t('notes')}</label>
            <AutoDirTextarea
              aria-invalid={errors.description ? true : undefined}
              value={description}
              onChange={(e) => {
                const nextValue = e.target.value;
                setDescription(nextValue);
                if (errors.description) showDealField('description', { description: nextValue });
              }}
              onBlur={() => showDealField('description')}
              rows={3}
              className={`w-full rounded-md border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600" role="alert">{errors.description}</p>}
          </div>
        </div>
      </Card>
      <div id="deal-field-general" className="flex flex-col items-end gap-2">
        {(errors.general || errors._general) && (
          <p className="text-sm text-red-600" role="alert">{errors.general || errors._general}</p>
        )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
        <Button type="submit" disabled={submitting}>{t('save')}</Button>
      </div>
      </div>
    </form>
  );
};
