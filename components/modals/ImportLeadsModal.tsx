import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../../context/AppContext';
import { Modal, Button } from '../index';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useStatuses, useChannels, useCampaigns, useDevelopers, useProjects, useUnits } from '../../hooks/useQueries';
import { createLeadAPI } from '../../services/api';
import { getUserDisplayName } from '../../types';
import { buildLeadAssigneePickerOptions } from '../../utils/roles';
import { formatLeadBudget } from '../../utils/budgetRange';
import { ChevronDownIcon } from '../icons';
import ExcelJS from 'exceljs';

type ImportStep = 'upload' | 'match' | 'preview' | 'importing' | 'done';

export type LeadImportFieldKey =
  | 'name'
  | 'phone'
  | 'budget'
  | 'type'
  | 'priority'
  | 'status'
  | 'communicationWay'
  | 'assignedTo'
  | 'source'
  | 'campaign'
  | 'createdAt'
  | 'leadCompanyName'
  | 'profession'
  | 'interestedDeveloper'
  | 'interestedProject'
  | 'interestedUnit'
  | '';

const SYSTEM_FIELDS: { value: LeadImportFieldKey; labelKey: string }[] = [
  { value: '', labelKey: 'importLeadsChooseField' },
  { value: 'name', labelKey: 'name' },
  { value: 'phone', labelKey: 'phone' },
  { value: 'budget', labelKey: 'budget' },
  { value: 'type', labelKey: 'type' },
  { value: 'priority', labelKey: 'priority' },
  { value: 'status', labelKey: 'status' },
  { value: 'communicationWay', labelKey: 'communicationWay' },
  { value: 'assignedTo', labelKey: 'assignedTo' },
  { value: 'source', labelKey: 'source' },
  { value: 'campaign', labelKey: 'campaign' },
  { value: 'createdAt', labelKey: 'createdAt' },
  { value: 'leadCompanyName', labelKey: 'leadCompanyName' },
  { value: 'profession', labelKey: 'profession' },
  { value: 'interestedDeveloper', labelKey: 'interestedDeveloper' },
  { value: 'interestedProject', labelKey: 'interestedProject' },
  { value: 'interestedUnit', labelKey: 'interestedUnit' },
];

const REAL_ESTATE_IMPORT_FIELD_KEYS: LeadImportFieldKey[] = [
  'interestedDeveloper',
  'interestedProject',
  'interestedUnit',
];

export interface PreviewRow {
  name: string;
  phone: string;
  budget: number | null;
  budget_max: number | null;
  type: 'fresh' | 'cold';
  priority: 'low' | 'medium' | 'high';
  assigned_to: number | null;
  status_id: number | null;
  channel_id: number | null;
  source: string | null;
  campaign_id: number | null;
  created_at: string | null;
  lead_company_name: string | null;
  profession: string | null;
  interested_developer: number | null;
  interested_project: number | null;
  interested_unit: number | null;
  interested_dev_input?: string;
  interested_proj_input?: string;
  interested_unit_input?: string;
}

const normalizeHeader = (val: unknown): string =>
  String(val ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Helpers for status pill colors: dark background + lighter border (like the design)
function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace(/^#/, '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function darkenHex(hex: string, factor: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#2C3660';
  const [r, g, b] = rgb.map((c) => Math.max(0, Math.round(c * factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function lightenHex(hex: string, factor: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#7989F2';
  const [r, g, b] = rgb.map((c) => Math.min(255, Math.round(c + (255 - c) * factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Map common column names (EN/AR) to our field keys
const NAME_KEYS = ['name', 'اسم', 'client name', 'اسم العميل', 'الاسم', 'full name', 'الاسم الكامل'];
const PHONE_KEYS = ['phone', 'هاتف', 'phone number', 'رقم الهاتف', 'tel', 'mobile', 'جوال', 'telephone'];
const BUDGET_KEYS = ['budget', 'ميزانية', 'الميزانية'];
const TYPE_KEYS = ['type', 'نوع', 'lead type', 'نوع العميل'];
const PRIORITY_KEYS = ['priority', 'أولوية', 'الأولوية'];
const STATUS_KEYS = ['status', 'حالة', 'الحالة', 'state'];
const CHANNEL_KEYS = ['channel', 'قناة', 'communication way', 'طريقة التواصل', 'contact method', 'مصدر التواصل'];
const ASSIGNED_KEYS = ['assigned to', 'مسند إلى', 'assigned_to', 'assignee', 'موظف'];
const SOURCE_KEYS = ['source', 'مصدر', 'المصدر', 'origin'];
const CAMPAIGN_KEYS = ['campaign', 'حملة', 'الحملة'];
const CREATED_AT_KEYS = ['created at', 'تاريخ الإنشاء', 'creation date', 'date', 'تاريخ', 'created_at'];
const LEAD_COMPANY_NAME_KEYS = ['company name', 'company', 'اسم الشركة', 'شركة', 'lead company', 'company name (lead)'];
const PROFESSION_KEYS = ['profession', 'job', 'occupation', 'career', 'المهنة', 'مهنة', 'وظيفة'];
const DEVELOPER_KEYS = [
  'developer',
  'مطور',
  'المطور',
  'real estate developer',
  'property developer',
  'dev id',
  'developer id',
];
const PROJECT_KEYS = [
  'project',
  'مشروع',
  'المشروع',
  'project name',
  'اسم المشروع',
  'development name',
  'project id',
];
const UNIT_KEYS = [
  'unit',
  'وحدة',
  'unit code',
  'كود الوحدة',
  'apartment',
  'شقة',
  'flat',
  'unit id',
];

function findColumnIndex(headers: string[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (keys.some(k => h === k || h.includes(k) || k.includes(h))) return i;
  }
  return -1;
}

/** Stricter matching for inventory columns (avoids e.g. "project manager" matching "project"). */
function findColumnIndexInventory(headers: string[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (
      keys.some((k) => {
        const kn = k.toLowerCase();
        if (h === kn) return true;
        return h.startsWith(`${kn} `) || h.endsWith(` ${kn}`) || h.includes(` ${kn} `);
      })
    ) {
      return i;
    }
  }
  return -1;
}

async function parseSheetToRows(file: File): Promise<Record<string, unknown>[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('No sheet in workbook');
  }
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  const maxCols = Math.min(sheet.columnCount || 100, 100);
  for (let col = 1; col <= maxCols; col++) {
    const cell = headerRow.getCell(col);
    const v = cell.value;
    const str = v != null ? String(v).trim() : '';
    if (col === 1 && !str) break;
    headers.push(str || `column_${col}`);
  }
  if (headers.length === 0 || headers.every(h => h.startsWith('column_'))) {
    throw new Error('No headers found');
  }
  const rows: Record<string, unknown>[] = [];
  const maxRows = 5000;
  for (let r = 2; r <= maxRows; r++) {
    const row = sheet.getRow(r);
    const obj: Record<string, unknown> = {};
    let hasAny = false;
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      const val = cell.value;
      const s = val != null ? String(val).trim() : '';
      if (s) hasAny = true;
      obj[h] = s;
    });
    if (!hasAny) break;
    rows.push(obj);
  }
  return rows;
}

function getRowValue(row: Record<string, unknown>, colIndex: number, headers: string[]): string {
  if (colIndex < 0 || colIndex >= headers.length) return '';
  const key = headers[colIndex];
  const val = row[key];
  if (val == null) return '';
  const s = String(val).trim();
  return s;
}

function getHeaderToFieldMapping(
  headers: string[],
  options?: { autoMapInventory?: boolean },
): Record<string, LeadImportFieldKey> {
  const mapping: Record<string, LeadImportFieldKey> = {};
  headers.forEach((h) => { mapping[h] = ''; });
  const nameIdx = findColumnIndex(headers, NAME_KEYS);
  const phoneIdx = findColumnIndex(headers, PHONE_KEYS);
  const budgetIdx = findColumnIndex(headers, BUDGET_KEYS);
  const typeIdx = findColumnIndex(headers, TYPE_KEYS);
  const priorityIdx = findColumnIndex(headers, PRIORITY_KEYS);
  const statusIdx = findColumnIndex(headers, STATUS_KEYS);
  const channelIdx = findColumnIndex(headers, CHANNEL_KEYS);
  const assignedIdx = findColumnIndex(headers, ASSIGNED_KEYS);
  const sourceIdx = findColumnIndex(headers, SOURCE_KEYS);
  const campaignIdx = findColumnIndex(headers, CAMPAIGN_KEYS);
  const createdAtIdx = findColumnIndex(headers, CREATED_AT_KEYS);
  const leadCompanyNameIdx = findColumnIndex(headers, LEAD_COMPANY_NAME_KEYS);
  const professionIdx = findColumnIndex(headers, PROFESSION_KEYS);
  if (nameIdx >= 0) mapping[headers[nameIdx]] = 'name';
  if (phoneIdx >= 0) mapping[headers[phoneIdx]] = 'phone';
  if (budgetIdx >= 0) mapping[headers[budgetIdx]] = 'budget';
  if (typeIdx >= 0) mapping[headers[typeIdx]] = 'type';
  if (priorityIdx >= 0) mapping[headers[priorityIdx]] = 'priority';
  if (statusIdx >= 0) mapping[headers[statusIdx]] = 'status';
  if (channelIdx >= 0) mapping[headers[channelIdx]] = 'communicationWay';
  if (assignedIdx >= 0) mapping[headers[assignedIdx]] = 'assignedTo';
  if (sourceIdx >= 0) mapping[headers[sourceIdx]] = 'source';
  if (campaignIdx >= 0) mapping[headers[campaignIdx]] = 'campaign';
  if (createdAtIdx >= 0) mapping[headers[createdAtIdx]] = 'createdAt';
  if (leadCompanyNameIdx >= 0) mapping[headers[leadCompanyNameIdx]] = 'leadCompanyName';
  if (professionIdx >= 0) mapping[headers[professionIdx]] = 'profession';
  if (options?.autoMapInventory) {
    const developerIdx = findColumnIndexInventory(headers, DEVELOPER_KEYS);
    const projectIdx = findColumnIndexInventory(headers, PROJECT_KEYS);
    const unitIdx = findColumnIndexInventory(headers, UNIT_KEYS);
    if (developerIdx >= 0) mapping[headers[developerIdx]] = 'interestedDeveloper';
    if (projectIdx >= 0) mapping[headers[projectIdx]] = 'interestedProject';
    if (unitIdx >= 0) mapping[headers[unitIdx]] = 'interestedUnit';
  }
  return mapping;
}

function getValueByHeader(row: Record<string, unknown>, header: string): string {
  const val = row[header];
  if (val == null) return '';
  return String(val).trim();
}

/** Parses "1000", "1000-5000", "1,000 – 5,000" into budget (min) and optional budget_max. */
function parseBudgetCell(raw: string): { budget: number | null; budget_max: number | null } {
  const s = raw.trim();
  if (!s) return { budget: null, budget_max: null };
  const parts = s
    .split(/\s*[-–—]\s*/)
    .map((p) => p.replace(/,/g, '').trim())
    .filter(Boolean);
  if (parts.length === 0) return { budget: null, budget_max: null };
  if (parts.length === 1) {
    const n = Number(parts[0]);
    return { budget: Number.isFinite(n) ? n : null, budget_max: null };
  }
  const a = Number(parts[0]);
  const b = Number(parts[parts.length - 1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { budget: null, budget_max: null };
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return { budget: lo, budget_max: lo === hi ? null : hi };
}

function resolveStatusId(val: string, statuses: { id: number; name: string }[]): number | null {
  if (!val.trim()) return null;
  const v = val.trim().toLowerCase();
  const found = statuses.find((s) => s.name.toLowerCase() === v || s.name.toLowerCase().includes(v) || v.includes(s.name.toLowerCase()));
  return found?.id ?? null;
}
function resolveChannelId(val: string, channels: { id: number; name: string }[]): number | null {
  if (!val.trim()) return null;
  const v = val.trim().toLowerCase();
  const found = channels.find((c) => c.name.toLowerCase() === v || c.name.toLowerCase().includes(v) || v.includes(c.name.toLowerCase()));
  return found?.id ?? null;
}
function resolveUserId(val: string, users: { id: number; email?: string; first_name?: string; last_name?: string; name?: string; username?: string }[], getDisplayName: (u: any) => string): number | null {
  if (!val.trim()) return null;
  const v = val.trim().toLowerCase();
  const found = users.find((u) => getDisplayName(u).toLowerCase() === v || getDisplayName(u).toLowerCase().includes(v) || v.includes(getDisplayName(u).toLowerCase()) || (u.email && u.email.toLowerCase() === v));
  return found?.id ?? null;
}
function resolveCampaignId(val: string, campaigns: { id: number; name?: string }[]): number | null {
  if (!val.trim()) return null;
  const v = val.trim().toLowerCase();
  const found = campaigns.find((c) => (c.name || '').toLowerCase() === v || (c.name || '').toLowerCase().includes(v) || v.includes((c.name || '').toLowerCase()));
  return found?.id ?? null;
}

function getDeveloperIdFromProject(p: { developer?: number | { id?: number } | null }): number | null {
  const d = p?.developer;
  if (d == null) return null;
  if (typeof d === 'object') return d.id ?? null;
  return typeof d === 'number' ? d : null;
}

function getProjectIdFromUnit(u: { project?: number | { id?: number } | null }): number | null {
  const p = u?.project;
  if (p == null) return null;
  if (typeof p === 'object') return p.id ?? null;
  return typeof p === 'number' ? p : null;
}

function resolveDeveloperId(val: string, developers: { id: number; name: string }[]): number | null {
  const s = val.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const id = Number(s);
    return developers.some((d) => d.id === id) ? id : null;
  }
  const v = s.toLowerCase();
  const exact = developers.find((d) => d.name.toLowerCase() === v);
  if (exact) return exact.id;
  const fuzzy = developers.find(
    (d) =>
      d.name.toLowerCase().includes(v) ||
      v.includes(d.name.toLowerCase()),
  );
  return fuzzy?.id ?? null;
}

function resolveProjectId(
  val: string,
  projects: { id: number; name?: string; developer?: number | { id?: number } | null }[],
  developerId: number | null,
): number | null {
  const s = val.trim();
  if (!s) return null;
  const pool =
    developerId != null
      ? projects.filter((p) => getDeveloperIdFromProject(p) === developerId)
      : projects;
  if (/^\d+$/.test(s)) {
    const id = Number(s);
    return pool.some((p) => p.id === id) ? id : null;
  }
  const v = s.toLowerCase();
  const exact = pool.find((p) => (p.name || '').toLowerCase() === v);
  if (exact) return exact.id;
  const fuzzy = pool.find((p) => {
    const n = (p.name || '').toLowerCase();
    return n.includes(v) || v.includes(n);
  });
  return fuzzy?.id ?? null;
}

function resolveUnitId(
  val: string,
  units: { id: number; name?: string; code?: string; project?: number | { id?: number } | null }[],
  projectId: number | null,
): number | null {
  const s = val.trim();
  if (!s) return null;
  const pool =
    projectId != null ? units.filter((u) => getProjectIdFromUnit(u) === projectId) : units;
  if (/^\d+$/.test(s)) {
    const id = Number(s);
    return pool.some((u) => u.id === id) ? id : null;
  }
  const v = s.toLowerCase();
  const byCode = pool.find((u) => (u.code || '').toLowerCase() === v);
  if (byCode) return byCode.id;
  const exactName = pool.find((u) => (u.name || '').toLowerCase() === v);
  if (exactName) return exactName.id;
  const fuzzy = pool.find((u) => {
    const n = (u.name || '').toLowerCase();
    const c = (u.code || '').toLowerCase();
    return (n && (n.includes(v) || v.includes(n))) || (c && (c.includes(v) || v.includes(c)));
  });
  return fuzzy?.id ?? null;
}

function resolveLeadInventoryFields(
  devVal: string,
  projVal: string,
  unitVal: string,
  developers: { id: number; name: string }[],
  projects: { id: number; name?: string; developer?: number | { id?: number } | null }[],
  units: { id: number; name?: string; code?: string; project?: number | { id?: number } | null }[],
): { interested_developer: number | null; interested_project: number | null; interested_unit: number | null } {
  let devId = resolveDeveloperId(devVal, developers);
  let projId = resolveProjectId(projVal, projects, devId);
  let unitId = resolveUnitId(unitVal, units, projId);

  if (unitId != null) {
    const u = units.find((x) => x.id === unitId);
    const pid = u ? getProjectIdFromUnit(u) : null;
    if (pid != null) projId = pid;
  }
  if (projId != null) {
    const p = projects.find((x) => x.id === projId);
    const did = p ? getDeveloperIdFromProject(p) : null;
    if (did != null) devId = did;
  }

  return {
    interested_developer: devId,
    interested_project: projId,
    interested_unit: unitId,
  };
}

function buildPreviewRowsFromMapping(
  rawRows: Record<string, unknown>[],
  columnMapping: Record<string, LeadImportFieldKey>,
  opts: {
    defaultStatusId: number | undefined;
    defaultChannelId: number | undefined;
    defaultAssignedTo: number | null;
    statuses: { id: number; name: string }[];
    channels: { id: number; name: string }[];
    users: { id: number; email?: string; first_name?: string; last_name?: string; name?: string; username?: string }[];
    campaigns: { id: number; name?: string }[];
    getDisplayName: (u: any) => string;
    isRealEstate: boolean;
    developers: { id: number; name: string }[];
    projects: { id: number; name?: string; developer?: number | { id?: number } | null }[];
    units: { id: number; name?: string; code?: string; project?: number | { id?: number } | null }[];
  },
): PreviewRow[] {
  const headerByField: Record<string, string> = {};
  Object.entries(columnMapping).forEach(([header, field]) => {
    if (field) headerByField[field] = header;
  });
  return rawRows.map((row) => {
    const name = getValueByHeader(row, headerByField.name || '').trim();
    const phone = getValueByHeader(row, headerByField.phone || '').trim();
    const budgetVal = getValueByHeader(row, headerByField.budget || '');
    const { budget, budget_max } = parseBudgetCell(budgetVal);
    let typeVal = getValueByHeader(row, headerByField.type || '').toLowerCase();
    if (typeVal && typeVal !== 'fresh' && typeVal !== 'cold') typeVal = 'fresh';
    if (!typeVal) typeVal = 'fresh';
    let priorityVal = getValueByHeader(row, headerByField.priority || '').toLowerCase();
    if (priorityVal && !['low', 'medium', 'high'].includes(priorityVal)) priorityVal = 'medium';
    if (!priorityVal) priorityVal = 'medium';

    const statusVal = getValueByHeader(row, headerByField.status || '');
    const channelVal = getValueByHeader(row, headerByField.communicationWay || '');
    const assignedVal = getValueByHeader(row, headerByField.assignedTo || '');
    const sourceVal = getValueByHeader(row, headerByField.source || '');
    const campaignVal = getValueByHeader(row, headerByField.campaign || '');
    const createdAtVal = getValueByHeader(row, headerByField.createdAt || '');
    const leadCompanyNameVal = getValueByHeader(row, headerByField.leadCompanyName || '');
    const professionVal = getValueByHeader(row, headerByField.profession || '');
    const devInvVal = getValueByHeader(row, headerByField.interestedDeveloper || '');
    const projInvVal = getValueByHeader(row, headerByField.interestedProject || '');
    const unitInvVal = getValueByHeader(row, headerByField.interestedUnit || '');

    const status_id = statusVal ? resolveStatusId(statusVal, opts.statuses) : (opts.defaultStatusId ?? null);
    const channel_id = channelVal ? resolveChannelId(channelVal, opts.channels) : (opts.defaultChannelId ?? null);
    const assigned_to = assignedVal ? resolveUserId(assignedVal, opts.users, opts.getDisplayName) : opts.defaultAssignedTo;
    const campaign_id = campaignVal ? resolveCampaignId(campaignVal, opts.campaigns) : null;

    const inv = opts.isRealEstate
      ? resolveLeadInventoryFields(devInvVal, projInvVal, unitInvVal, opts.developers, opts.projects, opts.units)
      : { interested_developer: null, interested_project: null, interested_unit: null };

    return {
      name,
      phone,
      budget,
      budget_max,
      type: typeVal as 'fresh' | 'cold',
      priority: priorityVal as 'low' | 'medium' | 'high',
      assigned_to,
      status_id,
      channel_id,
      source: sourceVal || null,
      campaign_id,
      created_at: createdAtVal || null,
      lead_company_name: leadCompanyNameVal ? leadCompanyNameVal : null,
      profession: professionVal ? professionVal : null,
      interested_developer: inv.interested_developer,
      interested_project: inv.interested_project,
      interested_unit: inv.interested_unit,
      interested_dev_input: opts.isRealEstate ? devInvVal : undefined,
      interested_proj_input: opts.isRealEstate ? projInvVal : undefined,
      interested_unit_input: opts.isRealEstate ? unitInvVal : undefined,
    };
  });
}

// Empty Excel template with all lead fields (first row = headers)
const TEMPLATE_HEADERS = [
  'Name',
  'Phone',
  'Budget',
  'Type',
  'Priority',
  'Status',
  'Channel',
  'Assigned To',
  'Source',
  'Campaign',
  'Created At',
  'Company name',
  'Profession',
];

const TEMPLATE_HEADERS_REAL_ESTATE = ['Developer', 'Project', 'Unit'];

async function downloadLeadsTemplate(includeRealEstateInventory: boolean): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads');
  const headerRow = sheet.getRow(1);
  const allHeaders = includeRealEstateInventory
    ? [...TEMPLATE_HEADERS, ...TEMPLATE_HEADERS_REAL_ESTATE]
    : [...TEMPLATE_HEADERS];
  allHeaders.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };
  allHeaders.forEach((_, i) => {
    sheet.getColumn(i + 1).width = i === 1 ? 16 : i >= 7 ? 18 : 14;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads-import-template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (imported: number, failed: number) => void;
}

export const ImportLeadsModal = ({ isOpen, onClose, onSuccess }: ImportLeadsModalProps) => {
  const { t, currentUser } = useAppContext();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [openStatusDropdownRow, setOpenStatusDropdownRow] = useState<number | null>(null);
  const [dropdownTriggerRect, setDropdownTriggerRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, LeadImportFieldKey>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openStatusDropdownRow === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.status-dropdown-trigger') && !target.closest('.status-dropdown-panel')) {
        setOpenStatusDropdownRow(null);
        setDropdownTriggerRect(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openStatusDropdownRow]);

  const { data: usersResponse } = useUsers();
  const users = usersResponse?.results || [];
  const assigneePickerUsers = React.useMemo(
    () => buildLeadAssigneePickerOptions(users, currentUser),
    [users, currentUser]
  );
  const { data: statusesData } = useStatuses();
  const statuses = Array.isArray(statusesData) ? statusesData : (statusesData?.results || []);
  const { data: channelsData } = useChannels();
  const channels = Array.isArray(channelsData) ? channelsData : (channelsData?.results || []);
  const { data: campaignsData } = useCampaigns();
  const campaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData?.results || []);

  const isRealEstateCompany = currentUser?.company?.specialization === 'real_estate';
  const { data: developersResponse } = useDevelopers();
  const developersList = (developersResponse?.results || []) as { id: number; name: string }[];
  const { data: projectsResponse } = useProjects();
  const projectsList = (projectsResponse?.results || []) as {
    id: number;
    name?: string;
    developer?: number | { id?: number } | null;
  }[];
  const { data: unitsResponse } = useUnits({});
  const unitsList = (unitsResponse?.results || []) as {
    id: number;
    name?: string;
    code?: string;
    project?: number | { id?: number } | null;
  }[];

  const defaultStatusId = statuses.find((s: { isDefault?: boolean; is_default?: boolean; isHidden?: boolean }) => (s.isDefault ?? s.is_default) && !s.isHidden)?.id
    || statuses.find((s: { isHidden?: boolean }) => !s.isHidden)?.id
    || statuses[0]?.id;
  const defaultChannelId = (channels.find((c: { isDefault?: boolean; is_default?: boolean }) => c.isDefault ?? c.is_default) ?? channels[0])?.id;
  const defaultAssignedTo =
    assigneePickerUsers.find((u) => u.id === currentUser?.id)?.id ??
    assigneePickerUsers[0]?.id ??
    null;
  const companyId = currentUser?.company?.id ?? null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setParseError(null);
    setFile(null);
    setRows([]);
    setHeaders([]);

    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setParseError(t('importLeadsInvalidFile') || 'Please upload an Excel file (.xlsx or .xls).');
      return;
    }

    try {
      const rawRows = await parseSheetToRows(selectedFile);
      if (rawRows.length === 0) {
        setParseError(t('importLeadsEmptyFile') || 'The file has no data rows.');
        return;
      }

      const firstRow = rawRows[0];
      const headerKeys = Object.keys(firstRow);
      if (headerKeys.length === 0 || headerKeys.every((h) => !h || h.startsWith('column_'))) {
        setParseError(t('importLeadsMissingColumns') || 'No headers found. The first row should contain column names.');
        return;
      }

      setHeaders(headerKeys);
      setColumnMapping(
        getHeaderToFieldMapping(headerKeys, {
          autoMapInventory: currentUser?.company?.specialization === 'real_estate',
        }),
      );
      setRows(rawRows);
      setPreviewRows([]);
      setFile(selectedFile);
      setStep('match');
    } catch (err: unknown) {
      setParseError((err as Error)?.message || (t('importLeadsParseError') || 'Failed to read the Excel file.'));
    }
  };

  const handleImport = async () => {
    if (previewRows.length === 0) return;

    setStep('importing');
    let ok = 0;
    let fail = 0;
    const errors: string[] = [];

    for (let i = 0; i < previewRows.length; i++) {
      const row = previewRows[i];
      const {
        name,
        phone,
        budget,
        budget_max,
        type,
        priority,
        assigned_to,
        status_id,
        channel_id,
        source,
        campaign_id,
        lead_company_name: rowLeadCompanyName,
        profession: rowProfession,
        interested_developer,
        interested_project,
        interested_unit,
      } = row;
      if (!name.trim() || !phone.trim()) {
        fail++;
        errors.push(`Row ${i + 1}: ${t('importLeadsNamePhoneRequired') || 'Name and phone are required.'}`);
        continue;
      }

      const phoneNumbers = [{
        phone_number: phone.trim(),
        phone_type: 'mobile' as const,
        is_primary: true,
        notes: '',
      }];

      const leadData: Record<string, unknown> = {
        name: name.trim(),
        phone_numbers: phoneNumbers,
        phone_number: phone.trim(),
        budget,
        ...(budget_max != null ? { budget_max } : {}),
        assigned_to: assigned_to ?? undefined,
        type,
        communication_way: channel_id ?? undefined,
        priority,
        status: status_id ?? undefined,
        company: companyId,
        ...(source != null && source.trim() !== '' ? { source: source.trim() } : {}),
        ...(campaign_id != null ? { campaign: campaign_id } : {}),
        ...(rowLeadCompanyName != null && String(rowLeadCompanyName).trim() !== '' ? { lead_company_name: String(rowLeadCompanyName).trim() } : {}),
        ...(rowProfession != null && String(rowProfession).trim() !== '' ? { profession: String(rowProfession).trim() } : {}),
      };

      if (isRealEstateCompany) {
        leadData.interested_developer = interested_developer ?? null;
        leadData.interested_project = interested_project ?? null;
        leadData.interested_unit = interested_unit ?? null;
      }

      try {
        await createLeadAPI(leadData as any);
        ok++;
      } catch (err: unknown) {
        fail++;
        const msg = (err as { message?: string })?.message || String(err);
        errors.push(`Row ${i + 1} (${name}): ${msg}`);
      }
    }

    setImportedCount(ok);
    setFailedCount(fail);
    setImportErrors(errors.slice(0, 20));
    setStep('done');
    if (ok > 0) {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
    onSuccess?.(ok, fail);
  };

  const applyToAll = (field: 'assigned_to' | 'status_id' | 'channel_id', value: number | null) => {
    setPreviewRows((prev) => prev.map((r) => ({ ...r, [field]: value })));
  };

  const applyInventoryToAll = (
    field: 'interested_developer' | 'interested_project' | 'interested_unit',
    value: number | null,
  ) => {
    setPreviewRows((prev) =>
      prev.map((r) => {
        if (field === 'interested_developer') {
          return {
            ...r,
            interested_developer: value,
            interested_project: null,
            interested_unit: null,
            interested_dev_input: undefined,
            interested_proj_input: undefined,
            interested_unit_input: undefined,
          };
        }
        if (field === 'interested_project') {
          if (value == null) {
            return {
              ...r,
              interested_project: null,
              interested_unit: null,
              interested_proj_input: undefined,
              interested_unit_input: undefined,
            };
          }
          const p = projectsList.find((x) => x.id === value);
          const did = p ? getDeveloperIdFromProject(p) : null;
          return {
            ...r,
            interested_developer: did ?? r.interested_developer,
            interested_project: value,
            interested_unit: null,
            interested_proj_input: undefined,
            interested_unit_input: undefined,
          };
        }
        if (value == null) {
          return { ...r, interested_unit: null, interested_unit_input: undefined };
        }
        const u = unitsList.find((x) => x.id === value);
        const pid = u ? getProjectIdFromUnit(u) : null;
        const p = pid != null ? projectsList.find((x) => x.id === pid) : null;
        const did = p ? getDeveloperIdFromProject(p) : null;
        return {
          ...r,
          interested_developer: did ?? r.interested_developer,
          interested_project: pid ?? r.interested_project,
          interested_unit: value,
          interested_unit_input: undefined,
        };
      }),
    );
  };

  const updatePreviewRowInventory = React.useCallback(
    (idx: number, which: 'interested_developer' | 'interested_project' | 'interested_unit', rawValue: string) => {
      const v = rawValue === '' ? null : Number(rawValue);
      setPreviewRows((prev) => {
        const next = [...prev];
        const cur = { ...next[idx] };
        if (which === 'interested_developer') {
          cur.interested_developer = v;
          cur.interested_project = null;
          cur.interested_unit = null;
          cur.interested_dev_input = undefined;
          cur.interested_proj_input = undefined;
          cur.interested_unit_input = undefined;
        } else if (which === 'interested_project') {
          cur.interested_project = v;
          cur.interested_unit = null;
          cur.interested_proj_input = undefined;
          cur.interested_unit_input = undefined;
          if (v != null) {
            const p = projectsList.find((x) => x.id === v);
            const did = p ? getDeveloperIdFromProject(p) : null;
            if (did != null) cur.interested_developer = did;
          }
        } else {
          cur.interested_unit = v;
          cur.interested_unit_input = undefined;
          if (v != null) {
            const u = unitsList.find((x) => x.id === v);
            const pid = u ? getProjectIdFromUnit(u) : null;
            if (pid != null) {
              cur.interested_project = pid;
              const p = projectsList.find((x) => x.id === pid);
              const did = p ? getDeveloperIdFromProject(p) : null;
              if (did != null) cur.interested_developer = did;
            }
          }
        }
        next[idx] = cur;
        return next;
      });
    },
    [projectsList, unitsList],
  );

  const handleMatchContinue = () => {
    const mappedName = headers.some((h) => columnMapping[h] === 'name');
    const mappedPhone = headers.some((h) => columnMapping[h] === 'phone');
    if (!mappedName || !mappedPhone) {
      setParseError(t('importLeadsMatchRequired') || 'Please map at least one column to Name and one to Phone.');
      return;
    }
    setParseError(null);
    const preview = buildPreviewRowsFromMapping(rows, columnMapping, {
      defaultStatusId,
      defaultChannelId,
      defaultAssignedTo,
      statuses,
      channels,
      users,
      campaigns,
      getDisplayName: getUserDisplayName,
      isRealEstate: isRealEstateCompany,
      developers: developersList,
      projects: projectsList,
      units: unitsList,
    });
    setPreviewRows(preview);
    setStep('preview');
  };

  const handleReupload = () => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setHeaders([]);
    setColumnMapping({});
    setPreviewRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setHeaders([]);
    setPreviewRows([]);
    setColumnMapping({});
    setParseError(null);
    setImportedCount(0);
    setFailedCount(0);
    setImportErrors([]);
    setOpenStatusDropdownRow(null);
    setDropdownTriggerRect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('importLeads') || 'Import Leads from Excel'}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {step === 'upload' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('importLeadsDescription') || 'Upload an Excel file (.xlsx) with columns: Name and Phone. Optional: Budget, Type (fresh/cold), Priority (low/medium/high). The first row should be headers.'}
            </p>
            {isRealEstateCompany && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('importLeadsReOptionalInventory') ||
                  'Optional for real estate: columns Developer, Project, and Unit (names or numeric IDs; unit code supported).'}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => downloadLeadsTemplate(isRealEstateCompany)} type="button">
                {t('importLeadsDownloadTemplate') || 'Download template'}
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('importLeadsDownloadTemplateHint') || 'Empty template to fill and upload'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                id="import-leads-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="sr-only"
                tabIndex={-1}
                aria-label={t('chooseFiles') || 'Choose File'}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {!file ? (t('noFileChosen') || 'No file chosen') : file.name}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity"
              >
                {t('chooseFiles') || 'Choose File'}
              </button>
            </div>
            {parseError && (
              <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            )}
          </>
        )}

        {step === 'match' && file && headers.length > 0 && rows.length > 0 && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('importLeadsStep2Match') || 'Step 2: Match columns'}. {t('importLeadsMatchDescription') || 'Match CSV/Excel columns to system fields. If headers were mistyped, choose the correct field for each column.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('importLeadsDataExample') || 'Data example'}
                </h4>
                <div className="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50 text-xs space-y-1 max-h-24 overflow-y-auto">
                  {rows.slice(0, 2).map((row, ri) => (
                    <div key={ri} className="flex flex-wrap gap-1">
                      {headers.map((h) => (
                        <span key={h} className="text-gray-600 dark:text-gray-400">
                          {String(row[h] ?? '').slice(0, 20)}
                          {headers.length > 1 && h !== headers[headers.length - 1] ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 space-y-3">
                <div className="grid grid-cols-[1fr,1fr] gap-x-4 gap-y-2 items-center text-sm">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 col-span-2">
                    {t('importLeadsColumnNames') || 'Column names'} → {t('importLeadsCustomFields') || 'System field'}
                  </h4>
                  {headers.map((header) => {
                    const currentValue = columnMapping[header] ?? '';
                    const usedByOtherColumn = (fieldValue: LeadImportFieldKey) =>
                      fieldValue !== '' && headers.some((h) => h !== header && (columnMapping[h] ?? '') === fieldValue);
                    return (
                      <React.Fragment key={header}>
                        <div className="text-gray-700 dark:text-gray-300 truncate" title={header}>
                          {header || '\u00A0'}
                        </div>
                        <select
                          className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm py-1.5"
                          value={currentValue}
                          onChange={(e) => {
                            const v = e.target.value as LeadImportFieldKey;
                            setColumnMapping((prev) => ({ ...prev, [header]: v }));
                          }}
                        >
                          {SYSTEM_FIELDS.filter(
                            (opt) =>
                              opt.value === '' ||
                              !REAL_ESTATE_IMPORT_FIELD_KEYS.includes(opt.value as LeadImportFieldKey) ||
                              isRealEstateCompany,
                          ).map((opt) => {
                            const alreadySelected = opt.value !== '' && usedByOtherColumn(opt.value);
                            return (
                              <option
                                key={opt.value}
                                value={opt.value}
                                disabled={alreadySelected}
                              >
                                {opt.value === '' ? (t('importLeadsChooseField') || 'Choose field') : (t(opt.labelKey) || opt.labelKey)}
                                {alreadySelected ? ` (${t('importLeadsAlreadyMapped') || 'already mapped'})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
            {parseError && (
              <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" onClick={handleReupload}>
                {t('importLeadsReupload') || 'Reupload'}
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                {t('cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleMatchContinue}>
                {t('save') || 'Save'}
              </Button>
            </div>
          </>
        )}

        {step === 'preview' && file && previewRows.length > 0 && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('importLeadsPreview') || 'Found'} <strong>{previewRows.length}</strong> {t('importLeadsRows') || 'row(s)'}. {t('importLeadsPreviewConfirm') || 'Review and assign below, then click Import.'}
            </p>
            <div className="overflow-x-auto max-h-[60vh] rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 w-8">#</th>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[100px]">{t('name') || 'Name'}</th>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[100px]">{t('phone') || 'Phone'}</th>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[70px]">{t('budget') || 'Budget'}</th>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[60px]">{t('type') || 'Type'}</th>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[70px]">{t('priority') || 'Priority'}</th>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[140px]">
                      {t('assignedTo') || 'Assigned to'}
                      <select
                        className="ml-1 mt-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value=""
                        onChange={(e) => {
                          const v = e.target.value;
                          applyToAll('assigned_to', v === '' ? null : Number(v));
                        }}
                        title={t('applyToAll') || 'Apply to all'}
                      >
                        <option value="">{t('applyToAll') || 'Apply to all'}</option>
                        {assigneePickerUsers.map((u: { id: number; email?: string; first_name?: string; last_name?: string; name?: string; username?: string }) => (
                          <option key={u.id} value={u.id}>{getUserDisplayName(u as any)}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]">
                      {t('status') || 'Status'}
                      <select
                        className="ml-1 mt-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value=""
                        onChange={(e) => {
                          const v = e.target.value;
                          applyToAll('status_id', v === '' ? null : Number(v));
                        }}
                        title={t('applyToAll') || 'Apply to all'}
                      >
                        <option value="">{t('applyToAll') || 'Apply to all'}</option>
                        {statuses.map((s: { id: number; name: string; color?: string }) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]">
                      {t('channel') || 'Channel'}
                      <select
                        className="ml-1 mt-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value=""
                        onChange={(e) => {
                          const v = e.target.value;
                          applyToAll('channel_id', v === '' ? null : Number(v));
                        }}
                        title={t('applyToAll') || 'Apply to all'}
                      >
                        <option value="">{t('applyToAll') || 'Apply to all'}</option>
                        {channels.map((c: { id: number; name: string }) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </th>
                    {isRealEstateCompany && (
                      <>
                        <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[130px]">
                          {t('interestedDeveloper') || 'Developer'}
                          <select
                            className="ml-1 mt-1 block w-full max-w-[11rem] text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              applyInventoryToAll('interested_developer', v === '' ? null : Number(v));
                            }}
                            title={t('applyToAll') || 'Apply to all'}
                          >
                            <option value="">{t('applyToAll') || 'Apply to all'}</option>
                            {developersList.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </th>
                        <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[130px]">
                          {t('interestedProject') || 'Project'}
                          <select
                            className="ml-1 mt-1 block w-full max-w-[11rem] text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              applyInventoryToAll('interested_project', v === '' ? null : Number(v));
                            }}
                            title={t('applyToAll') || 'Apply to all'}
                          >
                            <option value="">{t('applyToAll') || 'Apply to all'}</option>
                            {projectsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name || `#${p.id}`}
                              </option>
                            ))}
                          </select>
                        </th>
                        <th className="px-2 py-2 text-left rtl:text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[140px]">
                          {t('interestedUnit') || 'Unit'}
                          <select
                            className="ml-1 mt-1 block w-full max-w-[12rem] text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              applyInventoryToAll('interested_unit', v === '' ? null : Number(v));
                            }}
                            title={t('applyToAll') || 'Apply to all'}
                          >
                            <option value="">{t('applyToAll') || 'Apply to all'}</option>
                            {unitsList.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.code ? `${u.name || ''} (${u.code})`.trim() : (u.name || `#${u.id}`)}
                              </option>
                            ))}
                          </select>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-2 py-1.5 text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-1.5">{row.name}</td>
                      <td className="px-2 py-1.5">{row.phone}</td>
                      <td className="px-2 py-1.5">{formatLeadBudget(row as any) || '-'}</td>
                      <td className="px-2 py-1.5">{row.type}</td>
                      <td className="px-2 py-1.5">{row.priority}</td>
                      <td className="px-2 py-1.5">
                        <select
                          className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          value={row.assigned_to ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPreviewRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], assigned_to: v === '' ? null : Number(v) };
                              return next;
                            });
                          }}
                        >
                          <option value="">-</option>
                          {assigneePickerUsers.map((u: { id: number; email?: string; first_name?: string; last_name?: string; name?: string; username?: string }) => (
                            <option key={u.id} value={u.id}>{getUserDisplayName(u as any)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        {(() => {
                          const st = statuses.find((s: { id: number; name: string; color?: string }) => s.id === row.status_id) as { id: number; name: string; color?: string } | undefined;
                          const hex = st?.color && /^#[0-9a-fA-F]{6}$/.test(st.color) ? st.color : '#808080';
                          const bg = darkenHex(hex, 0.45);
                          const border = lightenHex(hex, 0.35);
                          const isOpen = openStatusDropdownRow === idx;
                          return (
                            <div className="relative min-w-[100px]">
                              <button
                                type="button"
                                className="status-dropdown-trigger w-full rounded-full border text-left rtl:text-right py-1 pl-2.5 pr-6 text-xs font-medium text-white cursor-pointer flex items-center justify-between gap-1 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white/30"
                                onClick={(e) => {
                                  if (isOpen) {
                                    setOpenStatusDropdownRow(null);
                                    setDropdownTriggerRect(null);
                                  } else {
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setDropdownTriggerRect({ top: rect.bottom, left: rect.left, width: rect.width });
                                    setOpenStatusDropdownRow(idx);
                                  }
                                }}
                                style={{
                                  backgroundColor: bg,
                                  borderColor: border,
                                }}
                              >
                                <span className="truncate">{st?.name || '-'}</span>
                                <ChevronDownIcon className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ marginLeft: 'auto' }} />
                              </button>
                              {isOpen && dropdownTriggerRect && createPortal(
                                <div
                                  className="status-dropdown-panel fixed z-[9999] rounded shadow-lg border border-gray-600 overflow-hidden"
                                  style={{
                                    backgroundColor: '#1e293b',
                                    top: dropdownTriggerRect.top + 2,
                                    left: dropdownTriggerRect.left,
                                    minWidth: Math.max(dropdownTriggerRect.width, 100),
                                    maxHeight: 'min(12rem, 50vh)',
                                    overflowY: 'auto',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewRows((prev) => {
                                        const next = [...prev];
                                        next[idx] = { ...next[idx], status_id: null };
                                        return next;
                                      });
                                      setOpenStatusDropdownRow(null);
                                      setDropdownTriggerRect(null);
                                    }}
                                    className={`w-full px-2 py-1 text-left rtl:text-right text-xs text-white hover:bg-slate-600/80 block ${row.status_id == null ? 'bg-blue-600' : ''}`}
                                  >
                                    -
                                  </button>
                                  {statuses.map((s: { id: number; name: string; color?: string }) => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        setPreviewRows((prev) => {
                                          const next = [...prev];
                                          next[idx] = { ...next[idx], status_id: s.id };
                                          return next;
                                        });
                                        setOpenStatusDropdownRow(null);
                                        setDropdownTriggerRect(null);
                                      }}
                                      className={`w-full px-2 py-1 text-left rtl:text-right text-xs text-white hover:bg-slate-600/80 block ${row.status_id === s.id ? 'bg-blue-600' : ''}`}
                                    >
                                      {s.name}
                                    </button>
                                  ))}
                                </div>,
                                document.body
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          value={row.channel_id ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPreviewRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], channel_id: v === '' ? null : Number(v) };
                              return next;
                            });
                          }}
                        >
                          <option value="">-</option>
                          {channels.map((c: { id: number; name: string }) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      {isRealEstateCompany && (
                        <>
                          <td className="px-2 py-1.5 min-w-[120px]" title={row.interested_dev_input || ''}>
                            <select
                              className="w-full max-w-[11rem] text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              value={row.interested_developer ?? ''}
                              onChange={(e) => updatePreviewRowInventory(idx, 'interested_developer', e.target.value)}
                            >
                              <option value="">—</option>
                              {developersList.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                            {row.interested_dev_input?.trim() && row.interested_developer == null && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title={row.interested_dev_input}>
                                ?
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 min-w-[120px]" title={row.interested_proj_input || ''}>
                            <select
                              className="w-full max-w-[11rem] text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              value={row.interested_project ?? ''}
                              onChange={(e) => updatePreviewRowInventory(idx, 'interested_project', e.target.value)}
                            >
                              <option value="">—</option>
                              {(() => {
                                const base =
                                  row.interested_developer != null
                                    ? projectsList.filter(
                                        (p) => getDeveloperIdFromProject(p) === row.interested_developer,
                                      )
                                    : projectsList;
                                const orphan =
                                  row.interested_project != null &&
                                  !base.some((p) => p.id === row.interested_project)
                                    ? projectsList.find((p) => p.id === row.interested_project)
                                    : null;
                                const opts = orphan ? [orphan, ...base] : base;
                                return opts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name || `#${p.id}`}
                                  </option>
                                ));
                              })()}
                            </select>
                            {row.interested_proj_input?.trim() && row.interested_project == null && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title={row.interested_proj_input}>
                                ?
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 min-w-[130px]" title={row.interested_unit_input || ''}>
                            <select
                              className="w-full max-w-[12rem] text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                              value={row.interested_unit ?? ''}
                              disabled={row.interested_project == null}
                              onChange={(e) => updatePreviewRowInventory(idx, 'interested_unit', e.target.value)}
                            >
                              <option value="">—</option>
                              {row.interested_project != null &&
                                (() => {
                                  const base = unitsList.filter(
                                    (u) => getProjectIdFromUnit(u) === row.interested_project,
                                  );
                                  const orphan =
                                    row.interested_unit != null && !base.some((u) => u.id === row.interested_unit)
                                      ? unitsList.find((u) => u.id === row.interested_unit)
                                      : null;
                                  const opts = orphan ? [orphan, ...base] : base;
                                  return opts.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.code ? `${u.name || ''} (${u.code})`.trim() : (u.name || `#${u.id}`)}
                                    </option>
                                  ));
                                })()}
                            </select>
                            {row.interested_unit_input?.trim() && row.interested_unit == null && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title={row.interested_unit_input}>
                                ?
                              </span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStep('match')}>
                {t('back') || 'Back'}
              </Button>
              <Button onClick={handleImport}>
                {t('import') || 'Import'}
              </Button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('importing') || 'Importing...'}</p>
          </div>
        )}

        {step === 'done' && (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('importLeadsComplete') || 'Import complete.'} <strong>{importedCount}</strong> {t('importLeadsImported') || 'imported'}, {failedCount} {t('importLeadsFailed') || 'failed'}.
            </p>
            {importErrors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded bg-gray-100 dark:bg-gray-700 p-2 text-xs text-red-600 dark:text-red-400">
                {importErrors.map((msg, i) => <div key={i}>{msg}</div>)}
                {failedCount > importErrors.length && (
                  <div>... +{failedCount - importErrors.length} more</div>
                )}
              </div>
            )}
            <Button onClick={handleClose}>{t('close') || 'Close'}</Button>
          </>
        )}
      </div>
    </Modal>
  );
};
