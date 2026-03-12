import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal, Button } from '../index';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useStatuses, useChannels } from '../../hooks/useQueries';
import { createLeadAPI } from '../../services/api';
import ExcelJS from 'exceljs';

type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

export interface PreviewRow {
  name: string;
  phone: string;
  budget: number | null;
  type: 'fresh' | 'cold';
  priority: 'low' | 'medium' | 'high';
  assigned_to: number | null;
  status_id: number | null;
  channel_id: number | null;
}

const normalizeHeader = (val: unknown): string =>
  String(val ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Map common column names (EN/AR) to our field keys
const NAME_KEYS = ['name', 'اسم', 'client name', 'اسم العميل', 'الاسم', 'full name', 'الاسم الكامل'];
const PHONE_KEYS = ['phone', 'هاتف', 'phone number', 'رقم الهاتف', 'tel', 'mobile', 'جوال', 'telephone'];
const BUDGET_KEYS = ['budget', 'ميزانية', 'الميزانية'];
const TYPE_KEYS = ['type', 'نوع', 'lead type', 'نوع العميل'];
const PRIORITY_KEYS = ['priority', 'أولوية', 'الأولوية'];

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

function buildPreviewRows(
  rawRows: Record<string, unknown>[],
  headers: string[],
  defaultStatusId: number | undefined,
  defaultChannelId: number | undefined,
  defaultAssignedTo: number | null,
): PreviewRow[] {
  const nameIdx = findColumnIndex(headers, NAME_KEYS);
  const phoneIdx = findColumnIndex(headers, PHONE_KEYS);
  const budgetIdx = findColumnIndex(headers, BUDGET_KEYS);
  const typeIdx = findColumnIndex(headers, TYPE_KEYS);
  const priorityIdx = findColumnIndex(headers, PRIORITY_KEYS);
  return rawRows.map((row) => {
    const name = getRowValue(row, nameIdx, headers).trim();
    const phone = getRowValue(row, phoneIdx, headers).trim();
    const budgetVal = getRowValue(row, budgetIdx, headers);
    const budget = budgetVal ? Number(budgetVal) || null : null;
    let typeVal = getRowValue(row, typeIdx, headers).toLowerCase();
    if (typeVal && typeVal !== 'fresh' && typeVal !== 'cold') typeVal = 'fresh';
    if (!typeVal) typeVal = 'fresh';
    let priorityVal = getRowValue(row, priorityIdx, headers).toLowerCase();
    if (priorityVal && !['low', 'medium', 'high'].includes(priorityVal)) priorityVal = 'medium';
    if (!priorityVal) priorityVal = 'medium';
    return {
      name,
      phone,
      budget,
      type: typeVal as 'fresh' | 'cold',
      priority: priorityVal as 'low' | 'medium' | 'high',
      assigned_to: defaultAssignedTo,
      status_id: defaultStatusId ?? null,
      channel_id: defaultChannelId ?? null,
    };
  });
}

// Empty Excel template with accepted CRM columns (first row = headers)
async function downloadLeadsTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads', { headerRow: true });
  const headers = ['Name', 'Phone', 'Budget', 'Type', 'Priority'];
  const headerRow = sheet.getRow(1);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };
  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = 14;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: usersResponse } = useUsers();
  const users = usersResponse?.results || [];
  const { data: statusesData } = useStatuses();
  const statuses = Array.isArray(statusesData) ? statusesData : (statusesData?.results || []);
  const { data: channelsData } = useChannels();
  const channels = Array.isArray(channelsData) ? channelsData : (channelsData?.results || []);

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
      setHeaders(headerKeys);

      const nameIdx = findColumnIndex(headerKeys, NAME_KEYS);
      const phoneIdx = findColumnIndex(headerKeys, PHONE_KEYS);
      if (nameIdx < 0 || phoneIdx < 0) {
        setParseError(t('importLeadsMissingColumns') || 'Required columns not found. The Excel file must have columns for Name and Phone (e.g. "Name", "Phone").');
        return;
      }

      const initialPreview = buildPreviewRows(
        rawRows,
        headerKeys,
        defaultStatusId,
        defaultChannelId,
        defaultAssignedTo,
      );
      setRows(rawRows);
      setPreviewRows(initialPreview);
      setFile(selectedFile);
      setStep('preview');
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
      const { name, phone, budget, type, priority, assigned_to, status_id, channel_id } = row;
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

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setHeaders([]);
    setPreviewRows([]);
    setParseError(null);
    setImportedCount(0);
    setFailedCount(0);
    setImportErrors([]);
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
                        {users.map((u: { id: number; email?: string; first_name?: string }) => (
                          <option key={u.id} value={u.id}>{u.email || (u as any).first_name || `#${u.id}`}</option>
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
                        {statuses.map((s: { id: number; name: string }) => (
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
                          {users.map((u: { id: number; email?: string; first_name?: string }) => (
                            <option key={u.id} value={u.id}>{u.email || (u as any).first_name || `#${u.id}`}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          value={row.status_id ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPreviewRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], status_id: v === '' ? null : Number(v) };
                              return next;
                            });
                          }}
                        >
                          <option value="">-</option>
                          {statuses.map((s: { id: number; name: string }) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
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
              <Button variant="secondary" onClick={() => { setStep('upload'); setFile(null); setRows([]); setHeaders([]); setPreviewRows([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
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
