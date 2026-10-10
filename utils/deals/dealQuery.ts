import type { DealFilters } from '../../types';
import type { DealQueryParams } from '../../services/api';

export function dealFiltersToQuery(filters: DealFilters, pipelineId?: number | null): DealQueryParams {
  return {
    search: filters.search?.trim() || undefined,
    status: filters.status,
    paymentMethod: filters.paymentMethod,
    project: filters.project,
    unit: filters.unit,
    valueMin: filters.valueMin,
    valueMax: filters.valueMax,
    stageId: filters.stageId,
    outcome: filters.outcome,
    employee: filters.employee,
    pipeline: pipelineId || (filters.pipeline !== 'All' ? filters.pipeline : undefined),
    expectedCloseFrom: filters.expectedCloseFrom,
    expectedCloseTo: filters.expectedCloseTo,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
  };
}
