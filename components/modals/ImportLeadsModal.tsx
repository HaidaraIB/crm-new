import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal, Button } from '../index';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useStatuses, useChannels } from '../../hooks/useQueries';
import { createLeadAPI } from '../../services/api';
import ExcelJS from 'exceljs';

type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

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

  const defaultStatusId = statuses.find((s: { isDefault?: boolean; isHidden?: boolean }) => s.isDefault && !s.isHidden)?.id
    || statuses.find((s: { isHidden?: boolean }) => !s.isHidden)?.id
    || statuses[0]?.id;
  const defaultChannelId = channels[0]?.id;
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

      setRows(rawRows);
      setFile(selectedFile);
      setStep('preview');
    } catch (err: unknown) {
      setParseError((err as Error)?.message || (t('importLeadsParseError') || 'Failed to read the Excel file.'));
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;

    const nameIdx = findColumnIndex(headers, NAME_KEYS);
    const phoneIdx = findColumnIndex(headers, PHONE_KEYS);
    const budgetIdx = findColumnIndex(headers, BUDGET_KEYS);
    const typeIdx = findColumnIndex(headers, TYPE_KEYS);
    const priorityIdx = findColumnIndex(headers, PRIORITY_KEYS);

    setStep('importing');
    let ok = 0;
    let fail = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = getRowValue(row as Record<string, unknown>, nameIdx, headers);
      const phone = getRowValue(row as Record<string, unknown>, phoneIdx, headers);
      if (!name.trim() || !phone.trim()) {
        fail++;
        errors.push(`Row ${i + 1}: ${t('importLeadsNamePhoneRequired') || 'Name and phone are required.'}`);
        continue;
      }

      const budgetVal = getRowValue(row as Record<string, unknown>, budgetIdx, headers);
      const budget = budgetVal ? Number(budgetVal) || null : null;
      let typeVal = getRowValue(row as Record<string, unknown>, typeIdx, headers).toLowerCase();
      if (typeVal && typeVal !== 'fresh' && typeVal !== 'cold') typeVal = 'fresh';
      if (!typeVal) typeVal = 'fresh';
      let priorityVal = getRowValue(row as Record<string, unknown>, priorityIdx, headers).toLowerCase();
      if (priorityVal && !['low', 'medium', 'high'].includes(priorityVal)) priorityVal = 'medium';
      if (!priorityVal) priorityVal = 'medium';

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
        assigned_to: defaultAssignedTo,
        type: typeVal,
        communication_way: defaultChannelId ?? undefined,
        priority: priorityVal,
        status: defaultStatusId ?? undefined,
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

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setHeaders([]);
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-white file:font-medium"
            />
            {parseError && (
              <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            )}
          </>
        )}

        {step === 'preview' && file && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('importLeadsPreview') || 'Found'} <strong>{rows.length}</strong> {t('importLeadsRows') || 'row(s)'}. {t('importLeadsPreviewConfirm') || 'Click Import to add them as leads.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => { setStep('upload'); setFile(null); setRows([]); setHeaders([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
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
