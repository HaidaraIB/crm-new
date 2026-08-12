/**
 * Shared message placeholders for WhatsApp / SMS compose, preview, and template chips.
 * Supports [alias] and { alias } (not Meta {{1}} positional tokens).
 */

export type PlaceholderChip = {
  key: string;
  insertEn: string;
  insertAr: string;
};

/** Chips shown in template editors (user-facing Arabic curly form). */
export const MESSAGE_PLACEHOLDER_CHIPS: PlaceholderChip[] = [
  { key: 'templatePlaceholderCustomerName', insertEn: '{ Customer Name }', insertAr: '{ اسم العميل }' },
  { key: 'templatePlaceholderPhone', insertEn: '{ Phone }', insertAr: '{ رقم الهاتف }' },
  { key: 'templatePlaceholderEmployeeName', insertEn: '{ Employee Name }', insertAr: '{ اسم الموظف }' },
  { key: 'templatePlaceholderCompany', insertEn: '{ Company }', insertAr: '{ اسم الشركة }' },
  { key: 'templatePlaceholderCurrentDate', insertEn: '{ Current Date }', insertAr: '{ التاريخ الحالي }' },
  { key: 'templatePlaceholderCurrentTime', insertEn: '{ Current Time }', insertAr: '{ الوقت الحالي }' },
  { key: 'templatePlaceholderStatus', insertEn: '{ Status }', insertAr: '{ الحالة }' },
  { key: 'templatePlaceholderStage', insertEn: '{ Stage }', insertAr: '{ المرحلة }' },
  { key: 'templatePlaceholderChannel', insertEn: '{ Channel }', insertAr: '{ قناة التواصل }' },
  { key: 'templatePlaceholderVisitType', insertEn: '{ Visit Type }', insertAr: '{ نوع الزيارة }' },
  { key: 'templatePlaceholderProfession', insertEn: '{ Profession }', insertAr: '{ المهنة }' },
];

/** Legacy amount/invoice chips kept for WhatsApp Meta templates. */
export const LEGACY_TEMPLATE_PLACEHOLDER_CHIPS: PlaceholderChip[] = [
  { key: 'templatePlaceholderAmount', insertEn: '[Amount]', insertAr: '[المبلغ]' },
  { key: 'templatePlaceholderInvoiceNumber', insertEn: '[Invoice Number]', insertAr: '[رقم_الفاتورة]' },
];

const ALIAS_TO_CANONICAL: Record<string, string> = (() => {
  const groups: Record<string, string[]> = {
    customer_name: [
      'اسم العميل',
      'اسم_العميل',
      'customer name',
      'customer_name',
      'name',
      'client_name',
    ],
    first_name: ['first_name', 'الاسم الاول', 'الاسم الأول'],
    phone: ['رقم الهاتف', 'رقم_الهاتف', 'الهاتف', 'phone', 'phone_number'],
    employee_name: [
      'اسم الموظف',
      'اسم_الموظف',
      'employee name',
      'employee_name',
      'assigned_to',
      'staff_name',
    ],
    company_name: [
      'اسم الشركة',
      'اسم_الشركة',
      'الشركة',
      'شركة',
      'company',
      'company_name',
    ],
    current_date: ['التاريخ الحالي', 'التاريخ_الحالي', 'current date', 'current_date', 'date'],
    current_time: ['الوقت الحالي', 'الوقت_الحالي', 'current time', 'current_time', 'time'],
    status: ['الحالة', 'status'],
    stage: ['المرحلة', 'stage', 'last_stage'],
    channel: ['قناة التواصل', 'قناة_التواصل', 'channel', 'communication_way', 'source'],
    visit_type: ['نوع الزيارة', 'نوع_الزيارة', 'visit type', 'visit_type'],
    profession: ['المهنة', 'profession'],
    lead_company_name: ['lead_company_name', 'شركة العميل', 'lead company'],
    amount: ['المبلغ', 'amount', 'budget'],
    invoice_number: ['رقم الفاتورة', 'رقم_الفاتورة', 'invoice number', 'invoice_number'],
    priority: ['priority', 'الأولوية'],
    type: ['type', 'النوع'],
  };
  const map: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(groups)) {
    for (const alias of aliases) {
      map[alias.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')] = canonical;
    }
  }
  return map;
})();

function normKey(raw: string): string {
  return (raw || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickStr(...vals: unknown[]): string {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

function firstNameFrom(name: string): string {
  const n = (name || '').trim();
  if (!n) return '';
  return n.split(/\s+/)[0] || n;
}

function formatNowParts(timeZone?: string): { date: string; time: string } {
  try {
    const dtfDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dtfTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || undefined,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return { date: dtfDate.format(new Date()), time: dtfTime.format(new Date()) };
  } catch {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }
}

export type PlaceholderLeadLike = {
  name?: string;
  contact_name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  phone?: string;
  phone_numbers?: Array<{ phone_number?: string; is_primary?: boolean }>;
  profession?: string;
  lead_company_name?: string;
  company_name?: string;
  company?: string | { name?: string };
  status?: string | { name?: string };
  status_name?: string;
  last_stage?: string;
  stage?: string | { name?: string };
  communication_way?: string | { name?: string };
  communication_way_name?: string;
  source?: string;
  visit_type?: string | { name?: string };
  visit_type_name?: string;
  assigned_to?: string | number | { first_name?: string; last_name?: string; username?: string; name?: string };
  assigned_to_username?: string;
  assigned_to_name?: string;
  amount?: string | number;
  budget?: string | number;
  last_invoice_amount?: string | number;
  invoice_number?: string;
  last_invoice_number?: string;
  priority?: string;
  type?: string;
};

export type PlaceholderContextOptions = {
  tenantCompanyName?: string;
  employeeName?: string;
  timeZone?: string;
  /**
   * `meta_variable_map.body` from the template row: which CRM variable each Meta
   * {{n}} stands for, in order. Meta freezes that numbering at approval, so this is
   * the only reliable source — the fallback below is a guess that silently swaps
   * fields whenever a template's order differs from it.
   */
  variableMap?: string[];
  /**
   * Whoever is sending. { اسم الموظف } signs the message with them in preference to
   * the lead's assignee, mirroring the API's send-time rule so the composer preview
   * matches the message that actually goes out.
   */
  senderName?: string;
};

function resolveCustomerName(lead: PlaceholderLeadLike): string {
  const raw = pickStr(
    lead.name,
    lead.contact_name,
    lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : '',
    lead.first_name
  );
  if (raw.toLowerCase().startsWith('whatsapp:')) {
    return raw.split(':').slice(1).join(':').trim() || pickStr(lead.phone_number, lead.phone);
  }
  return raw;
}

function resolvePhone(lead: PlaceholderLeadLike): string {
  const fromField = pickStr(lead.phone_number, lead.phone);
  if (fromField) return fromField;
  const numbers = lead.phone_numbers;
  if (Array.isArray(numbers) && numbers.length) {
    const sorted = [...numbers].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    for (const row of sorted) {
      const p = pickStr(row.phone_number);
      if (p) return p;
    }
  }
  return '';
}

function resolveEmployeeName(lead: PlaceholderLeadLike, override?: string): string {
  if (override && override.trim()) return override.trim();
  const named = pickStr(lead.assigned_to_name, lead.assigned_to_username);
  if (named) return named;
  const a = lead.assigned_to;
  if (a && typeof a === 'object') {
    return pickStr(
      a.name,
      a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : '',
      a.first_name,
      a.username
    );
  }
  return '';
}

export function buildMessagePlaceholderValues(
  lead: PlaceholderLeadLike | null | undefined,
  options: PlaceholderContextOptions = {}
): Record<string, string> {
  if (!lead) {
    const { date, time } = formatNowParts(options.timeZone);
    return {
      customer_name: '',
      first_name: '',
      phone: '',
      employee_name: pickStr(options.senderName, options.employeeName),
      company_name: pickStr(options.tenantCompanyName),
      current_date: date,
      current_time: time,
      status: '',
      stage: '',
      channel: '',
      visit_type: '',
      profession: '',
      lead_company_name: '',
      amount: '',
      invoice_number: '',
      name: '',
      company: pickStr(options.tenantCompanyName),
    };
  }

  const customerName = resolveCustomerName(lead);
  const leadCompany = pickStr(
    lead.lead_company_name,
    typeof lead.company_name === 'string' ? lead.company_name : '',
    typeof lead.company === 'string' ? lead.company : lead.company?.name
  );
  const company = pickStr(options.tenantCompanyName, leadCompany);
  const status =
    typeof lead.status === 'string' ? lead.status : pickStr(lead.status_name, lead.status?.name);
  const stage = pickStr(
    lead.last_stage,
    typeof lead.stage === 'string' ? lead.stage : lead.stage?.name
  );
  const channel = pickStr(
    lead.communication_way_name,
    typeof lead.communication_way === 'string' ? lead.communication_way : lead.communication_way?.name,
    lead.source
  );
  const visitType = pickStr(
    lead.visit_type_name,
    typeof lead.visit_type === 'string' ? lead.visit_type : lead.visit_type?.name
  );
  const amount = pickStr(lead.amount, lead.budget, lead.last_invoice_amount);
  const invoice = pickStr(lead.invoice_number, lead.last_invoice_number);
  const { date, time } = formatNowParts(options.timeZone);

  return {
    customer_name: customerName,
    first_name: firstNameFrom(customerName) || customerName,
    phone: resolvePhone(lead),
    employee_name:
      pickStr(options.senderName) || resolveEmployeeName(lead, options.employeeName),
    company_name: company,
    current_date: date,
    current_time: time,
    status,
    stage,
    channel,
    visit_type: visitType,
    profession: pickStr(lead.profession),
    lead_company_name: leadCompany,
    amount,
    invoice_number: invoice,
    priority: pickStr(lead.priority),
    type: pickStr(lead.type),
    name: customerName,
    company,
    source: channel,
    budget: amount,
  };
}

function lookupValue(values: Record<string, string>, rawKey: string): string | null {
  const key = normKey(rawKey);
  if (!key) return null;
  if (key in values && values[key] !== undefined) return values[key];
  const canonical = ALIAS_TO_CANONICAL[key];
  if (canonical && values[canonical] !== undefined) return values[canonical];
  return null;
}

/**
 * Replace [alias] and { alias }. Leaves Meta {{1}} tokens for separate positional fill.
 */
export function renderMessagePlaceholders(text: string, values: Record<string, string>): string {
  if (!text) return text;
  let out = text.replace(/\[([^\]]+)\]/g, (full, inner: string) => {
    const resolved = lookupValue(values, inner);
    return resolved ? resolved : full;
  });
  out = out.replace(/(?<!\{)\{([^{}]+)\}(?!\})/g, (full, inner: string) => {
    const resolved = lookupValue(values, inner);
    return resolved ? resolved : full;
  });
  return out;
}

export function replaceTemplatePlaceholders(
  text: string,
  lead: PlaceholderLeadLike | null | undefined,
  options: PlaceholderContextOptions | string = {}
): string {
  const opts: PlaceholderContextOptions =
    typeof options === 'string' ? { tenantCompanyName: options } : options || {};
  const values = buildMessagePlaceholderValues(lead, opts);
  let out = renderMessagePlaceholders(text || '', values);

  // Meta-style {{1}}, {{2}}, … — from the template's recorded variable order when we
  // have it, otherwise a best-effort guess by position.
  const positionalPool = (
    opts.variableMap?.length
      ? opts.variableMap.map((key) => values[key])
      : [
          values.customer_name,
          values.company_name,
          values.phone,
          values.employee_name,
          values.current_date,
          values.current_time,
          values.status,
          values.stage,
          values.channel,
          values.visit_type,
          values.profession,
          values.lead_company_name,
        ]
  ).map((v) => (v || '').trim());

  const hasVariableMap = Boolean(opts.variableMap?.length);
  out = out.replace(/\{\{\s*(\d+)\s*\}\}/g, (_match, numStr: string) => {
    const idx = Math.max(0, parseInt(numStr, 10) - 1);
    // With a known map an empty value stays a dash — borrowing a neighbouring
    // field here is what made {{1}} render the customer instead of the employee.
    const value = hasVariableMap
      ? positionalPool[idx]
      : positionalPool[idx] || positionalPool.find((v) => v) || '';
    return value || '-';
  });

  return out;
}

/** Human-readable list for settings hints. */
export const MESSAGE_PLACEHOLDERS_HINT_AR =
  'عناصر نائبة: { اسم العميل }, { رقم الهاتف }, { اسم الموظف }, { اسم الشركة }, { التاريخ الحالي }, { الوقت الحالي }, { الحالة }, { المرحلة }, { قناة التواصل }, { نوع الزيارة }, { المهنة } — وأيضاً [name], [first_name], [phone], …';

export const MESSAGE_PLACEHOLDERS_HINT_EN =
  'Placeholders: { Customer Name }, { Phone }, { Employee Name }, { Company }, { Current Date }, { Current Time }, { Status }, { Stage }, { Channel }, { Visit Type }, { Profession } — also [name], [first_name], [phone], …';
