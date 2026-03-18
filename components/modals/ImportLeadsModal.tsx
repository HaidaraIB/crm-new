import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../../context/AppContext';
import { Modal, Button } from '../index';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useStatuses, useChannels, useCampaigns } from '../../hooks/useQueries';
import { createLeadAPI } from '../../services/api';
import { getUserDisplayName } from '../../types';
import { ChevronDownIcon } from '../icons';
import ExcelJS from 'exceljs';

type ImportStep = 'upload' | 'match' | 'preview' | 'importing' | 'done';

export type LeadImportFieldKey = 'name' | 'phone' | 'budget' | 'type' | 'priority' | 'status' | 'communicationWay' | 'assignedTo' | 'source' | 'campaign' | 'createdAt' | 'leadCompanyName' | '';

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
];

export interface PreviewRow {
  name: string;
  phone: string;
  budget: number | null;
  type: 'fresh' | 'cold';
  priority: 'low' | 'medium' | 'high';
  assigned_to: number | null;
  status_id: number | null;
  channel_id: number | null;
  source: string | null;
  campaign_id: number | null;
  created_at: string | null;
  lead_company_name: string | null;
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

function findColumnIndex(headers: string[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (keys.some(k => h === k || h.includes(k) || k.includes(h))) return i;
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

function getHeaderToFieldMapping(headers: string[]): Record<string, LeadImportFieldKey> {
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
  return mapping;
}

function getValueByHeader(row: Record<string, unknown>, header: string): string {
  const val = row[header];
  if (val == null) return '';
  return String(val).trim();
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
    const budget = budgetVal ? Number(budgetVal) || null : null;
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

    const status_id = statusVal ? resolveStatusId(statusVal, opts.statuses) : (opts.defaultStatusId ?? null);
    const channel_id = channelVal ? resolveChannelId(channelVal, opts.channels) : (opts.defaultChannelId ?? null);
    const assigned_to = assignedVal ? resolveUserId(assignedVal, opts.users, opts.getDisplayName) : opts.defaultAssignedTo;
    const campaign_id = campaignVal ? resolveCampaignId(campaignVal, opts.campaigns) : null;

    return {
      name,
      phone,
      budget,
      type: typeVal as 'fresh' | 'cold',
      priority: priorityVal as 'low' | 'medium' | 'high',
      assigned_to,
      status_id,
      channel_id,
      source: sourceVal || null,
      campaign_id,
      created_at: createdAtVal || null,
      lead_company_name: leadCompanyNameVal ? leadCompanyNameVal : null,
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
];

async function downloadLeadsTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads', { headerRow: true });
  const headerRow = sheet.getRow(1);
  TEMPLATE_HEADERS.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };
  TEMPLATE_HEADERS.forEach((_, i) => {
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
  const { data: statusesData } = useStatuses();
  const statuses = Array.isArray(statusesData) ? statusesData : (statusesData?.results || []);
  const { data: channelsData } = useChannels();
  const channels = Array.isArray(channelsData) ? channelsData : (channelsData?.results || []);
  const { data: campaignsData } = useCampaigns();
  const campaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData?.results || []);

  const defaultStatusId = statuses.find((s: { isDefault?: boolean; is_default?: boolean; isHidden?: boolean }) => (s.isDefault ?? s.is_default) && !s.isHidden)?.id
    || statuses.find((s: { isHidden?: boolean }) => !s.isHidden)?.id
    || statuses[0]?.id;
  const defaultChannelId = (channels.find((c: { isDefault?: boolean; is_default?: boolean }) => c.isDefault ?? c.is_default) ?? channels[0])?.id;
  const defaultAssignedTo = currentUser?.id ?? users[0]?.id ?? null;
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
      setColumnMapping(getHeaderToFieldMapping(headerKeys));
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
      const { name, phone, budget, type, priority, assigned_to, status_id, channel_id, source, campaign_id, lead_company_name: rowLeadCompanyName } = row;
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
        assigned_to: assigned_to ?? undefined,
        type,
        communication_way: channel_id ?? undefined,
        priority,
        status: status_id ?? undefined,
        company: companyId,
        ...(source != null && source.trim() !== '' ? { source: source.trim() } : {}),
        ...(campaign_id != null ? { campaign: campaign_id } : {}),
        ...(rowLeadCompanyName != null && String(rowLeadCompanyName).trim() !== '' ? { lead_company_name: String(rowLeadCompanyName).trim() } : {}),
      };

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
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={downloadLeadsTemplate} type="button">
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
                          {SYSTEM_FIELDS.map((opt) => {
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
                        {users.map((u: { id: number; email?: string; first_name?: string; last_name?: string; name?: string; username?: string }) => (
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
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-2 py-1.5 text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-1.5">{row.name}</td>
                      <td className="px-2 py-1.5">{row.phone}</td>
                      <td className="px-2 py-1.5">{row.budget != null ? String(row.budget) : '-'}</td>
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
                          {users.map((u: { id: number; email?: string; first_name?: string; last_name?: string; name?: string; username?: string }) => (
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
