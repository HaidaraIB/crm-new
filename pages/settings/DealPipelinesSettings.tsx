import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { Button, Card, ChevronDownIcon, FieldActionRow, IconButton, Select, TrashIcon } from '../../components';
import { Input } from '../../components/Input';
import { NumberInput } from '../../components/NumberInput';
import { useDealLostReasons, useDealPipelines } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';
import {
  createDealLostReasonAPI,
  createDealPipelineAPI,
  createDealStageAPI,
  deleteDealLostReasonAPI,
  deleteDealPipelineAPI,
  deleteDealStageAPI,
  reorderDealStagesAPI,
  updateDealPipelineAPI,
  updateDealStageAPI,
} from '../../services/api';
import type { DealPipeline, DealPipelineStage, DealStageType } from '../../types';

export const DealPipelinesSettings = () => {
  const { t, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();
  const queryClient = useQueryClient();
  const { data: pipelines = [] } = useDealPipelines();
  const { data: reasons = [] } = useDealLostReasons();
  const [pipelineId, setPipelineId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [reasonName, setReasonName] = useState('');
  const [moveTo, setMoveTo] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [pipelineErrors, setPipelineErrors] = useState<Record<string, string>>({});
  const [reasonErrors, setReasonErrors] = useState<Record<string, string>>({});
  const [stageErrors, setStageErrors] = useState<Record<number, Record<string, string>>>({});
  const pipeline: DealPipeline | undefined = pipelines.find((item) => item.id === (pipelineId || pipelines[0]?.id)) || pipelines[0];

  const translate = (key: string) => {
    const value = t(key as never);
    return value && value !== key ? value : undefined;
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['dealPipelines'] });
    await queryClient.invalidateQueries({ queryKey: ['dealLostReasons'] });
  };

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  };

  const addPipeline = async () => {
    const errors = catalogFieldErrors('deal_pipeline.upsert', { name }, translate);
    setPipelineErrors(errors);
    if (Object.keys(errors).length) return;
    setError('');
    try {
      await createDealPipelineAPI({ name });
      setName('');
      await refresh();
    } catch (err) {
      const serverErrors = serverFieldErrors(err, 'deal_pipeline.upsert', translate);
      if (Object.keys(serverErrors).length) setPipelineErrors(serverErrors);
      else setError(err instanceof Error ? err.message : t('error'));
    }
  };

  const addLostReason = async () => {
    const errors = catalogFieldErrors('deal_lost_reason.upsert', { name: reasonName }, translate);
    setReasonErrors(errors);
    if (Object.keys(errors).length) return;
    setError('');
    try {
      await createDealLostReasonAPI({ name: reasonName });
      setReasonName('');
      await refresh();
    } catch (err) {
      const serverErrors = serverFieldErrors(err, 'deal_lost_reason.upsert', translate);
      if (Object.keys(serverErrors).length) setReasonErrors(serverErrors);
      else setError(err instanceof Error ? err.message : t('error'));
    }
  };

  const updateStageField = async (stage: DealPipelineStage, patch: Record<string, unknown>) => {
    const values = {
      name: stage.name,
      color: stage.color,
      stage_type: stage.stageType,
      probability: stage.probability,
      ...patch,
    };
    const errors = catalogFieldErrors('deal_stage.upsert', values, translate);
    setStageErrors((prev) => ({ ...prev, [stage.id]: errors }));
    if (Object.keys(errors).length) return;
    setError('');
    try {
      await updateDealStageAPI(stage.id, patch);
      await refresh();
    } catch (err) {
      const serverErrors = serverFieldErrors(err, 'deal_stage.upsert', translate);
      if (Object.keys(serverErrors).length) setStageErrors((prev) => ({ ...prev, [stage.id]: serverErrors }));
      else setError(err instanceof Error ? err.message : t('error'));
    }
  };

  const confirmDelete = (title: string, message: string, itemName: string, action: () => Promise<unknown>) => {
    setConfirmDeleteConfig({
      title,
      message,
      itemName,
      onConfirm: async () => {
        await action();
        await refresh();
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };

  const reorder = async (stage: DealPipelineStage, direction: -1 | 1) => {
    if (!pipeline) return;
    const order = pipeline.stages.map((item) => item.id);
    const index = order.indexOf(stage.id);
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    await run(() => reorderDealStagesAPI(pipeline.id, order));
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-start gap-2">
            <Select className="sm:w-56" aria-label={t('dealSelectPipeline')} value={pipeline?.id || ''} onChange={(e) => setPipelineId(Number(e.target.value))}>
              {pipelines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); if (pipelineErrors.name) setPipelineErrors({}); }}
                placeholder={t('dealAddPipeline')}
                invalid={!!pipelineErrors.name}
              />
              {pipelineErrors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{pipelineErrors.name}</p>}
            </div>
            <Button type="button" onClick={addPipeline} disabled={!name.trim()}>{t('dealAddPipeline')}</Button>
            {pipeline && pipelines.length > 1 && (
              <Button
                type="button"
                variant="danger"
                onClick={() => confirmDelete(t('dealDeletePipeline'), t('dealConfirmDeletePipeline'), pipeline.name, () => deleteDealPipelineAPI(pipeline.id))}
              >
                <TrashIcon className="h-4 w-4" />
                {t('dealDeletePipeline')}
              </Button>
            )}
            {pipeline && !pipeline.isDefault && (
              <Button type="button" variant="secondary" onClick={() => run(() => updateDealPipelineAPI(pipeline.id, { is_default: true }))}>{t('dealSetDefaultPipeline')}</Button>
            )}
            {pipeline?.isDefault && pipelines.length > 1 && (
              <span className="inline-flex h-10 items-center rounded-md bg-primary-100 px-3 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{t('dealDefaultPipeline')}</span>
            )}
          </div>
          {pipelines.length <= 1 && <p className="text-sm text-gray-600 dark:text-gray-300">{t('dealOnlyPipeline')}</p>}
          <div className="space-y-3">
            {(pipeline?.stages || []).map((stage, index, list) => (
              <div key={stage.id} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 lg:grid-cols-[minmax(0,1.4fr)_140px_168px_72px_auto_minmax(0,1fr)_auto]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{t('dealTitle')}</label>
                  <Input
                    defaultValue={stage.name}
                    invalid={!!stageErrors[stage.id]?.name}
                    onBlur={(e) => e.target.value !== stage.name && updateStageField(stage, { name: e.target.value })}
                  />
                  {stageErrors[stage.id]?.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{stageErrors[stage.id].name}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{t('dealItemType')}</label>
                  <Select value={stage.stageType} onChange={(e) => updateStageField(stage, { stage_type: e.target.value as DealStageType })}>
                    <option value="open">{t('dealOpenStage')}</option>
                    <option value="won">{t('dealWonStage')}</option>
                    <option value="lost">{t('dealLostStage')}</option>
                  </Select>
                  {stageErrors[stage.id]?.stageType && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{stageErrors[stage.id].stageType}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{t('dealProbability')}</label>
                  <NumberInput
                    value={stage.probability}
                    min={0}
                    max={100}
                    invalid={!!stageErrors[stage.id]?.probability}
                    onChange={(e) => updateStageField(stage, { probability: Number(e.target.value) })}
                  />
                  {stageErrors[stage.id]?.probability && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{stageErrors[stage.id].probability}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{t('dealStageColor')}</label>
                  <input type="color" aria-label={t('dealStageColor')} value={stage.color} onChange={(e) => updateStageField(stage, { color: e.target.value })} className="h-10 w-full cursor-pointer rounded-md border border-gray-300 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800" />
                  {stageErrors[stage.id]?.color && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{stageErrors[stage.id].color}</p>}
                </div>
                <div className="flex gap-1">
                  <IconButton size="md" icon={<ChevronDownIcon className="h-4 w-4 rotate-180" />} label={t('dealMoveUp')} disabled={index === 0} onClick={() => reorder(stage, -1)} />
                  <IconButton size="md" icon={<ChevronDownIcon className="h-4 w-4" />} label={t('dealMoveDown')} disabled={index === list.length - 1} onClick={() => reorder(stage, 1)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{t('dealMoveDealsTo')}</label>
                  <Select value={moveTo[stage.id] || ''} onChange={(e) => setMoveTo((prev) => ({ ...prev, [stage.id]: e.target.value }))}>
                    <option value="">{t('dealMoveDealsTo')}</option>
                    {(pipeline?.stages || []).filter((item) => item.id !== stage.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </Select>
                </div>
                <IconButton
                  size="md"
                  tone="danger"
                  icon={<TrashIcon className="h-4 w-4" />}
                  label={t('dealDeleteStage')}
                  onClick={() => confirmDelete(t('dealDeleteStage'), t('dealConfirmDeleteStage'), stage.name, () => deleteDealStageAPI(stage.id, moveTo[stage.id] ? Number(moveTo[stage.id]) : undefined))}
                />
              </div>
            ))}
          </div>
          {pipeline && (
            <Button type="button" onClick={() => run(() => createDealStageAPI({ pipeline: pipeline.id, name: t('dealAddStage'), stage_type: 'open', probability: 10, color: '#3B82F6' }))}>{t('dealAddStage')}</Button>
          )}
        </div>
      </Card>
      <Card>
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('dealLostReasons')}</h3>
          <FieldActionRow action={<Button type="button" disabled={!reasonName.trim()} onClick={addLostReason}>{t('dealAddLostReason')}</Button>}>
            <Input
              value={reasonName}
              onChange={(e) => { setReasonName(e.target.value); if (reasonErrors.name) setReasonErrors({}); }}
              placeholder={t('dealAddLostReason')}
              invalid={!!reasonErrors.name}
            />
          </FieldActionRow>
          {reasonErrors.name && <p className="text-sm text-red-600 dark:text-red-400">{reasonErrors.name}</p>}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reasons.map((reason) => (
              <div key={reason.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{reason.name}</span>
                <IconButton
                  tone="danger"
                  icon={<TrashIcon className="h-4 w-4" />}
                  label={t('dealDeleteLostReason')}
                  onClick={() => confirmDelete(t('dealDeleteLostReason'), t('dealConfirmDeleteLostReason'), reason.name, () => deleteDealLostReasonAPI(reason.id))}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
