import type {
  Deal,
  DealEvent,
  DealLineItem,
  DealLostReason,
  DealPipeline,
  DealPipelineStage,
  DealSummary,
} from '../../types';

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const str = (value: unknown): string => (value == null ? '' : String(value));

export function mapApiLineItem(raw: Record<string, unknown>): DealLineItem {
  return {
    id: raw.id != null ? num(raw.id) : undefined,
    itemType: (raw.item_type || raw.itemType || 'custom') as DealLineItem['itemType'],
    product: (raw.product as number | null) ?? null,
    service: (raw.service as number | null) ?? null,
    servicePackage: (raw.service_package as number | null) ?? (raw.servicePackage as number | null) ?? null,
    unit: (raw.unit as number | null) ?? null,
    name: str(raw.name),
    unitPrice: num(raw.unit_price ?? raw.unitPrice),
    quantity: num(raw.quantity, 1),
    discountPercentage: num(raw.discount_percentage ?? raw.discountPercentage),
    lineTotal: num(raw.line_total ?? raw.lineTotal),
    position: raw.position != null ? num(raw.position) : undefined,
  };
}

export function mapApiDeal(raw: Record<string, unknown>): Deal {
  const clientName =
    str(raw.client_name || raw.clientName || raw.deal_client_name) ||
    (typeof raw.client === 'object' && raw.client ? str((raw.client as { name?: string }).name) : '');
  const clientId =
    typeof raw.client === 'number'
      ? raw.client
      : typeof raw.client === 'object' && raw.client
        ? num((raw.client as { id?: number }).id)
        : undefined;
  const items = Array.isArray(raw.line_items) ? raw.line_items.map((row) => mapApiLineItem(row as Record<string, unknown>)) : undefined;
  return {
    id: num(raw.id),
    title: str(raw.title) || clientName,
    clientName,
    paymentMethod: str(raw.payment_method || raw.paymentMethod || 'cash'),
    status: str(raw.status || 'reservation'),
    stage: str(raw.stage || 'in_progress'),
    value: num(raw.value),
    reminderDate: (raw.reminder_date || raw.reminderDate || null) as string | null,
    leadId: raw.lead_id != null ? num(raw.lead_id) : clientId,
    client: clientId,
    employee: raw.employee != null ? num(raw.employee) : undefined,
    employeeUsername: str(raw.employee_username || raw.employeeUsername) || undefined,
    startedBy: raw.started_by != null ? num(raw.started_by) : raw.startedBy != null ? num(raw.startedBy) : undefined,
    closedBy: raw.closed_by != null ? num(raw.closed_by) : raw.closedBy != null ? num(raw.closedBy) : undefined,
    startDate: str(raw.start_date || raw.startDate) || undefined,
    closedDate: str(raw.closed_date || raw.closedDate) || undefined,
    discountPercentage: num(raw.discount_percentage ?? raw.discountPercentage),
    discountAmount: num(raw.discount_amount ?? raw.discountAmount),
    salesCommissionPercentage: num(raw.sales_commission_percentage ?? raw.salesCommissionPercentage),
    salesCommissionAmount: num(raw.sales_commission_amount ?? raw.salesCommissionAmount),
    description: str(raw.description),
    unit: raw.unit != null && typeof raw.unit !== 'object' ? num(raw.unit) : null,
    project: raw.project != null && typeof raw.project !== 'object' ? num(raw.project) : null,
    unitCode: str(raw.unit_code || raw.unitCode) || undefined,
    projectName: str(raw.project_name || raw.projectName) || undefined,
    pipeline: raw.pipeline != null ? num(raw.pipeline) : null,
    pipelineName: str(raw.pipeline_name) || undefined,
    pipelineStage: raw.pipeline_stage != null ? num(raw.pipeline_stage) : null,
    pipelineStageName: str(raw.pipeline_stage_name) || undefined,
    pipelineStageColor: str(raw.pipeline_stage_color) || undefined,
    stageType: (raw.stage_type || null) as Deal['stageType'],
    probability: raw.probability != null ? num(raw.probability) : null,
    stageProbability: raw.stage_probability != null ? num(raw.stage_probability) : null,
    weightedValue: raw.weighted_value != null ? num(raw.weighted_value) : undefined,
    expectedCloseDate: (raw.expected_close_date || raw.expectedCloseDate || null) as string | null,
    currency: str(raw.currency),
    lostReason: raw.lost_reason != null ? num(raw.lost_reason) : null,
    lostReasonName: str(raw.lost_reason_name) || undefined,
    lostNote: str(raw.lost_note),
    lineItemsCount: raw.line_items_count != null ? num(raw.line_items_count) : items?.length,
    lineItems: items,
    createdAt: str(raw.created_at || raw.createdAt) || undefined,
    updatedAt: str(raw.updated_at || raw.updatedAt) || undefined,
  };
}

export function mapApiDealEvent(raw: Record<string, unknown>): DealEvent {
  return {
    id: num(raw.id),
    eventType: str(raw.event_type || raw.eventType),
    oldValue: str(raw.old_value || raw.oldValue),
    newValue: str(raw.new_value || raw.newValue),
    reason: str(raw.reason),
    metadata: (raw.metadata as Record<string, unknown>) || {},
    createdBy: raw.created_by != null ? num(raw.created_by) : null,
    createdByName: str(raw.created_by_name || raw.created_by_username) || null,
    createdAt: str(raw.created_at || raw.createdAt),
  };
}

export function mapApiStage(raw: Record<string, unknown>): DealPipelineStage {
  return {
    id: num(raw.id),
    pipeline: num(raw.pipeline),
    name: str(raw.name),
    color: str(raw.color || '#3B82F6'),
    order: num(raw.order),
    stageType: (raw.stage_type || raw.stageType || 'open') as DealPipelineStage['stageType'],
    probability: num(raw.probability),
    systemKey: (raw.system_key || raw.systemKey || null) as string | null,
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
  };
}

export function mapApiPipeline(raw: Record<string, unknown>): DealPipeline {
  const stages = Array.isArray(raw.stages) ? raw.stages.map((row) => mapApiStage(row as Record<string, unknown>)) : [];
  return {
    id: num(raw.id),
    name: str(raw.name),
    order: num(raw.order),
    isDefault: Boolean(raw.is_default ?? raw.isDefault),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    stages: stages.sort((a, b) => a.order - b.order),
  };
}

export function mapApiLostReason(raw: Record<string, unknown>): DealLostReason {
  return {
    id: num(raw.id),
    name: str(raw.name),
    order: num(raw.order),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
  };
}

export function mapApiDealSummary(raw: Record<string, unknown>): DealSummary {
  const stages = Array.isArray(raw.stages) ? raw.stages : [];
  const period = (raw.won_this_period || {}) as Record<string, unknown>;
  const forecast = Array.isArray(raw.forecast_by_month) ? raw.forecast_by_month : [];
  return {
    pipelineId: raw.pipeline_id != null ? num(raw.pipeline_id) : null,
    pipelineName: str(raw.pipeline_name),
    stages: stages.map((row) => {
      const stage = row as Record<string, unknown>;
      return {
        id: num(stage.id),
        name: str(stage.name),
        color: str(stage.color),
        stageType: (stage.stage_type || 'open') as DealStageSummaryType,
        probability: num(stage.probability),
        order: num(stage.order),
        count: num(stage.count),
        value: str(stage.value),
        weightedValue: str(stage.weighted_value),
      };
    }),
    openCount: num(raw.open_count),
    openValue: str(raw.open_value),
    weightedForecast: str(raw.weighted_forecast),
    wonCount: num(raw.won_count),
    wonValue: str(raw.won_value),
    wonThisPeriod: { count: num(period.count), value: str(period.value) },
    winRate: num(raw.win_rate),
    forecastByMonth: forecast.map((row) => {
      const item = row as Record<string, unknown>;
      return { month: str(item.month), value: str(item.value), weighted: str(item.weighted) };
    }),
  };
}

type DealStageSummaryType = DealSummary['stages'][number]['stageType'];

export type DealWritePayload = Record<string, unknown>;

export function toDealPayload(input: {
  client: number;
  employee?: number | null;
  title?: string;
  pipeline?: number | null;
  pipelineStage?: number | null;
  paymentMethod?: string;
  status?: string;
  value?: number | null;
  currency?: string;
  expectedCloseDate?: string;
  reminderDate?: string;
  startDate?: string;
  closedDate?: string;
  discountPercentage?: number;
  discountAmount?: number;
  salesCommissionPercentage?: number;
  salesCommissionAmount?: number;
  description?: string;
  unit?: number | null;
  project?: number | null;
  probability?: number | null;
}): DealWritePayload {
  const payload: DealWritePayload = {
    client: input.client,
    employee: input.employee ?? null,
    title: input.title || '',
    pipeline: input.pipeline ?? null,
    pipeline_stage: input.pipelineStage ?? null,
    payment_method: (input.paymentMethod || 'cash').toLowerCase(),
    status: (input.status || 'reservation').toLowerCase(),
    value: input.value ?? null,
    currency: input.currency || '',
    expected_close_date: input.expectedCloseDate || null,
    reminder_date: input.reminderDate || null,
    start_date: input.startDate || null,
    closed_date: input.closedDate || null,
    discount_percentage: input.discountPercentage ?? 0,
    discount_amount: input.discountAmount ?? 0,
    sales_commission_percentage: input.salesCommissionPercentage ?? 0,
    sales_commission_amount: input.salesCommissionAmount ?? 0,
    description: input.description || '',
    unit: input.unit ?? null,
    project: input.project ?? null,
    probability: input.probability ?? null,
  };
  if (payload.value == null) delete payload.value;
  return payload;
}

export function toLineItemPayload(item: DealLineItem): Record<string, unknown> {
  return {
    item_type: item.itemType,
    name: item.name,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    discount_percentage: item.discountPercentage,
    product: item.itemType === 'product' ? item.product : null,
    service: item.itemType === 'service' ? item.service : null,
    service_package: item.itemType === 'service_package' ? item.servicePackage : null,
    unit: item.itemType === 'unit' ? item.unit : null,
  };
}
