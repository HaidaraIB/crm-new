

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterIcon, PlusIcon, EyeIcon, WhatsappIcon, ImportLeadsModal, PageLoadingState, AssigneeFilter, LeadStatusDropdown, LeadStatusBadge, TableHorizontalScroll, LeadContactPhoneList } from '../components/index';
import { TrashIcon, FacebookIcon, TikTokIcon, SearchIcon } from '../components/icons';
import SendSMSModal from '../components/modals/SendSMSModal';
import SendWhatsAppModal from '../components/modals/SendWhatsAppModal';
import { Lead, LeadApiFilters } from '../types';
import { useLeads, useLeadStatusCounts, useDeleteLead, useUpdateLead, useUsers, useStatuses, useAssignUnassignedClients } from '../hooks/useQueries';
import { pbxDialAPI, getPbxDialStatusAPI, getLeadsAPI } from '../services/api';
import { usePbxDialEnabled } from '../hooks/usePbxDialEnabled';
import { getLocalizedApiErrorMessage, localizePbxResultMessage } from '../utils/apiErrorMessage';
import { exportToExcel } from '../utils/exportToExcel';
import { normalizeLead } from '../utils/normalizeLead';
import { resolvePrimaryPhone } from '../utils/resolvePrimaryPhone';
import { getCompanyViewLeadRoute } from '../utils/routing';
import { normalizeRole } from '../utils/roles';
import { PAGE_TAB_ACTIVE, PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
import { formatLeadBudget } from '../utils/budgetRange';
import { ARABIC_DATE_LOCALE, formatTimelineDate, withLatinDigits } from '../utils/dateUtils';
import { MarqueeText } from '../components/MarqueeText';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

const getPageSizeFromResponse = (response: any): number => {
    const fromNext = response?.next ? Number(new URL(response.next).searchParams.get('page_size')) : NaN;
    const fromPrev = response?.previous ? Number(new URL(response.previous).searchParams.get('page_size')) : NaN;
    if (!Number.isNaN(fromNext) && fromNext > 0) return fromNext;
    if (!Number.isNaN(fromPrev) && fromPrev > 0) return fromPrev;
    return DEFAULT_PAGE_SIZE;
};

const getPaginationItems = (current: number, total: number): Array<number | 'ellipsis'> => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const items: Array<number | 'ellipsis'> = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) items.push('ellipsis');
    for (let page = start; page <= end; page += 1) items.push(page);
    if (end < total - 1) items.push('ellipsis');
    items.push(total);
    return items;
};

export const LeadsPage = () => {
    const { 
        t, 
        currentPage,
        setCurrentPage, 
        setSelectedLead, 
        setIsAddLeadModalOpen, 
        setIsAddActionModalOpen, 
        setIsAssignLeadModalOpen, 
        setIsFilterDrawerOpen,
        checkedLeadIds,
        setCheckedLeadIds,
        leadFilters,
        setLeadFilters,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        currentUser,
        hasSupervisorPermission,
        theme,
        language,
        setIsSuccessModalOpen,
        setSuccessMessage,
        setAlertMessage,
        setAlertVariant,
        setIsAlertModalOpen,
    } = useAppContext();
    const canPbxDial = usePbxDialEnabled();
    const isDataEntryUser = normalizeRole(currentUser?.role) === 'DataEntry';
    const isMedicalCompany = useMemo(
        () => String(currentUser?.company?.specialization || '').toLowerCase() === 'medical',
        [currentUser?.company?.specialization],
    );
    const [leadsPageNumber, setLeadsPageNumber] = useState(1);
    const [leadsPageSize, setLeadsPageSize] = useState(20);
    const [activeStatusFilter, setActiveStatusFilter] = useState<Lead['status']>('All');

    const apiFilters = useMemo((): LeadApiFilters => {
        const filters: LeadApiFilters = {};

        switch (currentPage) {
            case 'Fresh Leads': filters.type = 'fresh'; break;
            case 'Hot Leads': filters.type = 'hot'; break;
            case 'Cold Leads': filters.type = 'cold'; break;
            case 'My Leads': filters.assignedToMe = true; break;
            case 'Rotated Leads': filters.type = 'rotated'; break;
            default:
                if (leadFilters.type && leadFilters.type !== 'All') {
                    filters.type = leadFilters.type.toLowerCase();
                }
                break;
        }

        if (leadFilters.search) filters.search = leadFilters.search;
        if (leadFilters.priority && leadFilters.priority !== 'All') {
            filters.priority = leadFilters.priority.toLowerCase();
        }

        if (leadFilters.status && leadFilters.status !== 'All') {
            filters.status = leadFilters.status;
        } else if (activeStatusFilter !== 'All') {
            filters.status = activeStatusFilter;
        }

        if (currentPage !== 'My Leads' && leadFilters.assignedTo && leadFilters.assignedTo !== 'All') {
            filters.assignedTo = leadFilters.assignedTo === 'Unassigned' ? 'unassigned' : leadFilters.assignedTo;
        }

        if (leadFilters.communicationWay && leadFilters.communicationWay !== 'All') {
            filters.communicationWay = leadFilters.communicationWay;
        }
        if (leadFilters.budgetMin) filters.budgetMin = leadFilters.budgetMin;
        if (leadFilters.budgetMax) filters.budgetMax = leadFilters.budgetMax;
        if (leadFilters.createdAtFrom) filters.createdAtFrom = leadFilters.createdAtFrom;
        if (leadFilters.createdAtTo) filters.createdAtTo = leadFilters.createdAtTo;

        return filters;
    }, [currentPage, leadFilters, activeStatusFilter]);

    const statusCountsFilters = useMemo((): LeadApiFilters => {
        const { status: _status, ...rest } = apiFilters;
        return rest;
    }, [apiFilters]);

    const { data: leadsResponse, isLoading: leadsLoading, error: leadsError } = useLeads(apiFilters, leadsPageNumber, undefined, leadsPageSize);
    const { data: statusCounts } = useLeadStatusCounts(statusCountsFilters);
    const allLeads = leadsResponse?.results || [];
    const totalLeadsCount = leadsResponse?.count || 0;
    const hasNextPage = Boolean(leadsResponse?.next);
    const hasPreviousPage = Boolean(leadsResponse?.previous);
    const pageSize = getPageSizeFromResponse(leadsResponse);
    const totalPages = Math.max(1, Math.ceil(totalLeadsCount / pageSize));
    const paginationItems = getPaginationItems(leadsPageNumber, totalPages);

    useEffect(() => {
        setLeadsPageNumber(1);
    }, [currentPage, apiFilters, leadsPageSize]);
    // Normalize API fields to frontend naming for consistent rendering (phone_numbers -> phoneNumbers, etc.)
    const normalizedLeads = React.useMemo(() => {
        return (allLeads || []).map((l: any) => {
            const phoneNumbers = l.phone_numbers || l.phoneNumbers || [];
            return {
            ...l,
            phoneNumbers,
            phone: resolvePrimaryPhone({
                phone: l.phone_number || l.phone || '',
                phoneNumbers,
            }),
            communicationWay: l.communication_way_name || l.communication_way || l.communicationWay || '',
            status: l.status_name || l.status || '',
            priority: l.priority || '',
            type: l.type || '',
            budget: typeof l.budget === 'number' ? l.budget : Number(l.budget) || 0,
            assignedTo: l.assigned_to ?? l.assignedTo,
            createdAt: l.created_at || l.createdAt,
            source: l.source || 'manual',
            campaign: l.campaign || null,
            campaign_name: l.campaign_name || (l.campaign ? String(l.campaign) : null),
            integration_account: l.integration_account || null,
            // Store additional fields for display
            assigned_to: l.assigned_to,
            assigned_to_username: l.assigned_to_username,
            leadCompanyName: l.leadCompanyName ?? l.lead_company_name,
            profession: l.profession,
            budgetMax: l.budgetMax ?? l.budget_max,
            budget_max: l.budget_max,
        };
        });
    }, [allLeads]);

    // Fetch users and statuses
    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];
    
    const { data: statusesData } = useStatuses();
    // Handle both array response and object with results property
    const statuses = Array.isArray(statusesData) 
        ? statusesData 
        : (statusesData?.results || []);
    
    // Delete lead mutation
    const deleteLeadMutation = useDeleteLead();
    
    // Update lead mutation
    const updateLeadMutation = useUpdateLead();
    
    // Assign unassigned clients mutation
    const assignUnassignedMutation = useAssignUnassignedClients({
        onSuccess: (data) => {
            // Use translation instead of API message for proper language support
            const assignedCount = data?.assigned_count || 0;
            const assignedTo = data?.assigned_to || '';
            const message = assignedCount > 0 
                ? `${t('unassignedClientsAssigned')} (${assignedCount} ${t('clients') || 'clients'})`
                : t('unassignedClientsAssigned') || 'Unassigned clients assigned successfully!';
            setSuccessMessage(message);
            setIsSuccessModalOpen(true);
        },
    });
    
    // Track which lead is being updated
    const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);
    // Send SMS modal: { leadId, phone, lead? }
    const [sendSMSModal, setSendSMSModal] = useState<{ leadId: number; phone: string; lead?: any } | null>(null);
    // Send WhatsApp modal (opens from table like lead details page)
    const [sendWhatsAppModal, setSendWhatsAppModal] = useState<{ leadId: number; phone: string; lead?: any } | null>(null);

    const pollPbxDialStatus = async (commandId: number) => {
        for (let i = 0; i < 40; i += 1) {
            await new Promise((r) => setTimeout(r, 1500));
            try {
                const status = await getPbxDialStatusAPI(commandId);
                if (status.status === 'completed') {
                    setSuccessMessage(t('pbxDialCompleted'));
                    setIsSuccessModalOpen(true);
                    return;
                }
                if (status.status === 'failed') {
                    setAlertVariant('error');
                    setAlertMessage(
                        localizePbxResultMessage(status.result_message, t) || t('pbxDialFailed')
                    );
                    setIsAlertModalOpen(true);
                    return;
                }
            } catch {
                /* keep polling */
            }
        }
    };

    const handlePbxDial = async (leadId: number, phone: string) => {
        try {
            const result = await pbxDialAPI({ client: leadId, phone_number: phone });
            setSuccessMessage(t('pbxDialQueued'));
            setIsSuccessModalOpen(true);
            if (result?.id) {
                void pollPbxDialStatus(result.id);
            }
        } catch (e: any) {
            setAlertVariant('error');
            setAlertMessage(getLocalizedApiErrorMessage(e, t, 'pbxDialFailed'));
            setIsAlertModalOpen(true);
        }
    };

    const [leadSearchDraft, setLeadSearchDraft] = useState(leadFilters.search);

    useEffect(() => {
        setLeadSearchDraft(leadFilters.search);
    }, [leadFilters.search]);

    const handleLeadSearchInputChange = (value: string) => {
        setLeadSearchDraft(value);
    };

    const commitLeadSearchFromDraft = () => {
        const q = leadSearchDraft.trim();
        setLeadSearchDraft(q);
        setLeadFilters((prev) => ({ ...prev, search: q }));
    };

    const clearLeadSearch = () => {
        setLeadSearchDraft('');
        setLeadFilters((prev) => ({ ...prev, search: '' }));
    };

    const showLeadSearchClear = leadSearchDraft.length > 0 || Boolean(leadFilters.search);

    // Handle status change
    const handleStatusChange = async (leadId: number, newStatusId: number) => {
        setUpdatingLeadId(leadId);
        try {
            const status = statuses.find(s => s.id === newStatusId);
            if (!status) {
                throw new Error('Status not found');
            }
            
            // Get the lead to preserve other fields
            const lead = normalizedLeads.find(l => l.id === leadId);
            if (!lead) {
                throw new Error('Lead not found');
            }
            
            // Get the original lead data to access company field
            const originalLead = allLeads.find((l: any) => l.id === leadId);
            if (!originalLead) {
                throw new Error('Original lead data not found');
            }
            
            // Get company ID (handle both object and ID formats)
            const companyId = originalLead.company?.id || originalLead.company || originalLead.company_id;
            if (!companyId) {
                throw new Error('Company ID not found');
            }
            
            const assignedRaw = (originalLead as any).assigned_to ?? lead.assignedTo;
            const assignedToId =
                assignedRaw && typeof assignedRaw === 'object'
                    ? (assignedRaw as { id?: number }).id ?? null
                    : assignedRaw
                      ? Number(assignedRaw)
                      : null;
            const communicationRaw =
                (originalLead as any).communication_way ?? lead.communicationWay;
            const communicationWayId =
                communicationRaw && typeof communicationRaw === 'object'
                    ? (communicationRaw as { id?: number }).id ?? null
                    : communicationRaw
                      ? Number(communicationRaw)
                      : null;

            // Prepare update data (snake_case for Django serializer)
            const updateData: any = {
                name: lead.name,
                phone_number: lead.phone || (originalLead as any).phone_number || '',
                budget: lead.budget,
                budget_max: (originalLead as any).budget_max ?? (lead as any).budgetMax ?? null,
                assigned_to: assignedToId,
                type: lead.type,
                communication_way: communicationWayId,
                priority: lead.priority,
                status: status.id,
                company: companyId,
                lead_company_name:
                    (originalLead as any).lead_company_name ??
                    (lead as any).leadCompanyName ??
                    null,
                profession: (originalLead as any).profession ?? (lead as any).profession ?? null,
                notes: (originalLead as any).notes ?? (lead as any).notes ?? null,
            };
            
            const phoneNumbers =
                lead.phoneNumbers ||
                (originalLead as any).phone_numbers ||
                [];
            if (phoneNumbers.length > 0) {
                updateData.phone_numbers = phoneNumbers;
            }
            
            await updateLeadMutation.mutateAsync({
                id: leadId,
                data: updateData,
            });
        } catch (error) {
            console.error('Error updating lead status:', error);
            alert(t('errorUpdatingLeadStatus') || 'Failed to update lead status. Please try again.');
        } finally {
            setUpdatingLeadId(null);
        }
    };

    // Helper function to convert status to translation key
    const getStatusTranslationKey = (status: Lead['status']): string => {
        const statusMap: Record<string, string> = {
            'All': 'all',
            'Untouched': 'untouched',
            'Touched': 'touched',
            'Following': 'following',
            'Meeting': 'meeting',
            'No Answer': 'noAnswer',
            'Out Of Service': 'outOfService'
        };
        return statusMap[status] || status.toLowerCase();
    };

    // Get status filters from settings (non-hidden statuses)
    const leadStatusFilters: Lead['status'][] = React.useMemo(() => {
        if (statuses.length > 0) {
            const statusNames = statuses
                .filter(s => !s.isHidden)
                .map(s => s.name as Lead['status']);
            return ['All', ...statusNames];
        }
        return ['All'];
    }, [statuses]);
    const [isImportLeadsModalOpen, setIsImportLeadsModalOpen] = useState(false);
    const [isExportingLeads, setIsExportingLeads] = useState(false);

    const handleExportLeads = async () => {
        setIsExportingLeads(true);
        try {
            const data = await getLeadsAPI(apiFilters);
            const leadsToExport = (data?.results || []).map((l: any) => {
                const phoneNumbers = l.phone_numbers || l.phoneNumbers || [];
                return {
                ...normalizeLead(l),
                phoneNumbers,
                phone: resolvePrimaryPhone({
                    phone: l.phone_number || l.phone || '',
                    phoneNumbers,
                }),
                communicationWay: l.communication_way_name || l.communication_way || l.communicationWay || '',
                status: l.status_name || l.status || '',
                priority: l.priority || '',
                type: l.type || '',
                budget: typeof l.budget === 'number' ? l.budget : Number(l.budget) || 0,
                assignedTo: l.assigned_to ?? l.assignedTo,
                createdAt: l.created_at || l.createdAt,
                source: l.source || 'manual',
                campaign: l.campaign || null,
                campaign_name: l.campaign_name || (l.campaign ? String(l.campaign) : null),
                assigned_to: l.assigned_to,
                assigned_to_username: l.assigned_to_username,
            };
            });

            const rows = leadsToExport.map((l: Lead & { assigned_to_username?: string; campaign_name?: string }) => {
                const phone = resolvePrimaryPhone(l);
                return {
                    name: l.name,
                    phone,
                    budget: formatLeadBudget(l as any, language === 'ar' ? 'ar-IQ' : 'en-US') || (l.budget ?? ''),
                    type: l.type ?? '',
                    priority: l.priority ?? '',
                    status: ((l as any).status_name || l.status) ?? '',
                    communicationWay: ((l as any).communication_way_name || l.communicationWay) ?? '',
                    assignedToName: (l as any).assigned_to_username ?? '',
                    source: l.source ?? '',
                    campaign: (l as any).campaign_name ?? l.campaign_name ?? '',
                    createdByName:
                        (l as any).created_by_name ??
                        (l as { createdByName?: string | null }).createdByName ??
                        '',
                    createdAt: l.createdAt
                        ? new Date(l.createdAt).toLocaleString(
                              language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
                              withLatinDigits({ dateStyle: 'short', timeStyle: 'short' }),
                          )
                        : '',
                };
            });
            const columns = [
                { key: 'name', label: t('name') || 'Name' },
                { key: 'phone', label: t('phone') || 'Phone' },
                { key: 'budget', label: t('budget') || 'Budget' },
                { key: 'type', label: t('type') || 'Type' },
                { key: 'priority', label: t('priority') || 'Priority' },
                { key: 'status', label: t('status') || 'Status' },
                { key: 'communicationWay', label: t('communicationWay') || 'Communication Way' },
                { key: 'assignedToName', label: t('assignedTo') || 'Assigned To' },
                { key: 'source', label: t('source') || 'Source' },
                { key: 'createdByName', label: t('createdBy') || 'Created by' },
                { key: 'campaign', label: t('campaign') || 'Campaign' },
                { key: 'createdAt', label: t('createdAt') || 'Created At' },
            ];
            await exportToExcel(rows, columns, `leads-export-${new Date().toISOString().slice(0, 10)}`, t('leads') || 'Leads');
        } catch (e) {
            setAlertMessage(getLocalizedApiErrorMessage(e, t, 'errorLoadingLeads'));
            setAlertVariant('error');
            setIsAlertModalOpen(true);
        } finally {
            setIsExportingLeads(false);
        }
    };

    const handleViewLead = (lead: Lead) => {
        setSelectedLead(lead);
        const viewLeadPath = currentUser?.company
            ? getCompanyViewLeadRoute(currentUser.company.name, currentUser.company.domain, lead.id)
            : `/view-lead/${lead.id}`;
        window.history.pushState({}, '', viewLeadPath);
        setCurrentPage('ViewLead');
    };

    const handleDeleteLead = (lead: Lead) => {
        setConfirmDeleteConfig({
            title: t('deleteLead') || 'Delete Lead',
            message: t('confirmDeleteLead') || 'Are you sure you want to delete',
            itemName: lead.name,
            onConfirm: async () => {
                try {
                    await deleteLeadMutation.mutateAsync(lead.id);
                } catch (error: any) {
                    console.error('Error deleting lead:', error);
                    throw error; // Let ConfirmDeleteModal handle the error display
                }
            },
        });
        setIsConfirmDeleteModalOpen(true);
    };

    // Check if user can delete a lead (admin, supervisor with permission, or assigned employee)
    const canDeleteLead = (lead: Lead) => {
        const currentRole = normalizeRole(currentUser?.role);
        const isAdmin = currentRole === 'Owner';
        const canDelete = Boolean(currentUser?.can_delete_clients);
        const isSupervisorWithLeads =
            currentRole === 'Supervisor' &&
            hasSupervisorPermission('can_manage_leads') &&
            canDelete;
        const isAssignedEmployee =
            canDelete &&
            (currentRole === 'Employee' || currentRole === 'Doctor') &&
            lead.assignedTo === currentUser?.id;
        return isAdmin || isSupervisorWithLeads || isAssignedEmployee;
    };

    // FIX: Convert page title to camelCase to match translation keys and cast to the correct type.
    const pageTitleKey = (currentPage.charAt(0).toLowerCase() + currentPage.slice(1).replace(/\s/g, '')) as Parameters<typeof t>[0];
    const pageTitle = t(pageTitleKey);
    
    const handleCheckChange = (leadId: number, isChecked: boolean) => {
        setCheckedLeadIds(prev => {
            const newSet = new Set(prev);
            if(isChecked) {
                newSet.add(leadId);
            } else {
                newSet.delete(leadId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (isChecked: boolean) => {
        if(isChecked) {
            setCheckedLeadIds(new Set(normalizedLeads.map(l => l.id)));
        } else {
            setCheckedLeadIds(new Set());
        }
    };
    
    const isAllSelected = normalizedLeads.length > 0 && checkedLeadIds.size === normalizedLeads.length;

    if (leadsLoading) {
        return (
            <PageWrapper title={pageTitle}>
                <PageLoadingState label={t('loadingLeads') || 'Loading leads'} />
            </PageWrapper>
        );
    }

    if (leadsError) {
        return (
            <PageWrapper title={pageTitle}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingLeads') || 'Error loading leads. Please try again.'}
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            {t('reload') || 'Reload'}
                        </Button>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    // Check if current user is admin or supervisor with leads permission (for assign/bulk actions)
    const currentRole = normalizeRole(currentUser?.role);
    const isAdmin = currentRole === 'Owner' || (currentRole === 'Supervisor' && hasSupervisorPermission('can_manage_leads'));

    const userRole = normalizeRole(currentUser?.role);
    const canUseAssigneeQuickFilter =
        currentPage !== 'My Leads' &&
        (userRole === 'Owner' ||
            (userRole === 'Supervisor' && hasSupervisorPermission('can_manage_leads')));

    return (
        <>
        <PageWrapper 
            title={pageTitle}
            actions={
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:flex-nowrap lg:overflow-x-auto lg:p-1 lg:-m-1">
                        <Button variant="secondary" onClick={() => setIsFilterDrawerOpen(true)} className="w-full sm:w-auto shrink-0"><FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span></Button>
                        {!isDataEntryUser && (
                        <Button variant="secondary" onClick={handleExportLeads} className="w-full sm:w-auto shrink-0" disabled={isExportingLeads || totalLeadsCount === 0} title={t('exportLeads') || 'Export to Excel'}><span className="sm:hidden">{isExportingLeads ? (t('loading') || 'Loading...') : t('export')}</span><span className="hidden sm:inline">{isExportingLeads ? (t('loading') || 'Loading...') : (t('exportLeads') || 'Export to Excel')}</span></Button>
                        )}
                        <Button variant="secondary" onClick={() => setIsImportLeadsModalOpen(true)} className="w-full sm:w-auto shrink-0" title={t('importLeads') || 'Import from Excel'}><span className="sm:hidden">{t('import')}</span><span className="hidden sm:inline">{t('importLeads') || 'Import from Excel'}</span></Button>
                        <Button onClick={() => {
                            window.history.pushState({}, '', '/create-lead');
                            setCurrentPage('CreateLead');
                        }} className="w-full sm:w-auto shrink-0"><PlusIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('addLead')}</span></Button>
                        {isAdmin && (
                            <div className="flex w-full flex-none flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsAssignLeadModalOpen(true)}
                                    disabled={checkedLeadIds.size === 0}
                                    className="min-w-0 flex-1 sm:flex-initial sm:w-auto"
                                    title={t('assignLead')}
                                >
                                    {t('assignLead')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setConfirmDeleteConfig({
                                            title: t('assignUnassigned') || 'Assign Unassigned',
                                            message: t('confirmAssignUnassigned') || 'Are you sure you want to assign all unassigned clients?',
                                            itemName: '',
                                            confirmButtonText: t('assignUnassigned') || 'Assign',
                                            confirmButtonVariant: 'primary' as const,
                                            showWarning: false,
                                            showSuccessMessage: false, // Don't show default success message, mutation will handle it
                                            onConfirm: async () => {
                                                try {
                                                    await assignUnassignedMutation.mutateAsync();
                                                } catch (error: any) {
                                                    console.error('Error assigning unassigned clients:', error);
                                                    throw error;
                                                }
                                            },
                                        });
                                        setIsConfirmDeleteModalOpen(true);
                                    }}
                                    disabled={assignUnassignedMutation.isPending}
                                    loading={assignUnassignedMutation.isPending}
                                    className="min-w-0 flex-1 sm:flex-initial sm:w-auto"
                                    title={t('assignUnassigned') || 'Assign Unassigned'}
                                >
                                    {t('assignUnassigned') || 'Assign Unassigned'}
                                </Button>
                            </div>
                        )}
                    </div>
            }
        >
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-thin">
                {leadStatusFilters.map(status => {
                    const count = statusCounts?.[status] ?? 0;
                    
                    const statusConfig = status === 'All' ? null : statuses.find(s => s.name === status);
                    
                    return (
                        <button 
                            key={status}
                            onClick={() => setActiveStatusFilter(status)}
                            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-2 transition-colors ${activeStatusFilter === status ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                        >
                           {statusConfig?.color && (
                               <div 
                                   className="w-2 h-2 rounded-full" 
                                   style={{ backgroundColor: statusConfig.color }}
                               />
                           )}
                           {t(getStatusTranslationKey(status) as any) || status} <span className="hidden sm:inline">({count})</span>
                        </button>
                    )
                })}
            </div>
            <div className="flex w-full flex-col gap-2 mt-3 mb-4">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex w-full min-w-0 gap-2">
                        <div className="relative min-w-0 flex-1">
                            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-gray-500 dark:text-gray-400" aria-hidden>
                                <SearchIcon className="h-4 w-4" />
                            </span>
                            <input
                                type="text"
                                inputMode="search"
                                enterKeyHint="search"
                                value={leadSearchDraft}
                                onChange={(e) => handleLeadSearchInputChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commitLeadSearchFromDraft();
                                    }
                                }}
                                placeholder={t('searchLeadsPlaceholderEnter') || 'Name or phone — press Enter to search'}
                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                                autoComplete="off"
                                className={`w-full min-w-0 py-2 ps-9 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${showLeadSearchClear ? 'pe-9' : 'pe-3'}`}
                                aria-label={t('searchLeadsPlaceholderEnter') || t('searchLeadsByNameOrPhone')}
                            />
                            {showLeadSearchClear ? (
                                <button
                                    type="button"
                                    onClick={clearLeadSearch}
                                    className="absolute inset-y-0 end-0 flex items-center pe-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                    aria-label={t('close') || 'Clear search'}
                                >
                                    <span className="text-lg leading-none px-1">&times;</span>
                                </button>
                            ) : null}
                        </div>
                        <Button
                            type="button"
                            onClick={commitLeadSearchFromDraft}
                            className="w-auto shrink-0"
                        >
                            {t('search')}
                        </Button>
                    </div>
                    {canUseAssigneeQuickFilter && (
                        <AssigneeFilter />
                    )}
                </div>
            </div>
            <Card>
                <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0">
                    <div className="min-w-full block">
                        <div className="overflow-hidden">
                            <table className="w-full text-sm text-left rtl:text-right min-w-[1200px]">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        {!isDataEntryUser && (
                                        <th scope="col" className="p-2 sm:p-4 text-center whitespace-nowrap"><input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={isAllSelected} className="rounded" /></th>
                                        )}
                                        <th scope="col" className="px-4 sm:px-6 py-3 text-center whitespace-nowrap">{t('name')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden lg:table-cell text-center whitespace-nowrap">{t('leadCompanyName')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden lg:table-cell text-center whitespace-nowrap">{t('profession')}</th>
                                        {isMedicalCompany && (
                                            <th scope="col" className="px-4 sm:px-6 py-3 hidden md:table-cell text-center whitespace-nowrap">
                                                {t('patientFileNumber')}
                                            </th>
                                        )}
                                        <th scope="col" className="px-4 sm:px-6 py-3 text-center whitespace-nowrap min-w-[220px]">{t('phone')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden lg:table-cell text-center whitespace-nowrap">{t('source') || 'Source'}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden lg:table-cell text-center whitespace-nowrap">{t('createdBy') || 'Created by'}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden xl:table-cell text-center whitespace-nowrap">{t('campaign') || 'Campaign'}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden xl:table-cell text-center whitespace-nowrap">{t('type')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden lg:table-cell text-center whitespace-nowrap">{t('priority')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden xl:table-cell text-center whitespace-nowrap">{t('budget')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden xl:table-cell text-center whitespace-nowrap">{t('assignedTo')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden xl:table-cell text-center whitespace-nowrap">{t('communicationWay')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden md:table-cell text-center whitespace-nowrap">{t('status')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden lg:table-cell text-center whitespace-nowrap">{t('lastFeedback')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden xl:table-cell text-center whitespace-nowrap">{t('createdAt')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 text-center whitespace-nowrap">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {normalizedLeads.map(lead => {
                                        // Get assigned user info - use assigned_to from API if available
                                        const assignedToId = (lead as any).assigned_to || lead.assignedTo;
                                        const assignedToUsername = (lead as any).assigned_to_username;
                                        const assignedUser = assignedToId ? users.find(u => u.id === assignedToId) : null;
                                        const assignedUserName = assignedUser?.name || 
                                                                 assignedToUsername || 
                                                                 assignedUser?.username || 
                                                                 null;
                                        
                                        return (
                                            <tr key={lead.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                {!isDataEntryUser && (
                                                <td className="p-2 sm:p-4 text-center"><input type="checkbox" checked={checkedLeadIds.has(lead.id)} onChange={(e) => handleCheckChange(lead.id, e.target.checked)} className="rounded" /></td>
                                                )}
                                                <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 dark:text-gray-100 text-center">
                                                    <div className="mx-auto w-full max-w-[220px] min-w-0">
                                                        {isDataEntryUser ? (
                                                            <MarqueeText
                                                                text={lead.name}
                                                                className="w-full"
                                                                contentClassName="text-sm font-medium text-gray-900 dark:text-gray-100"
                                                            />
                                                        ) : (
                                                        <button 
                                                            onClick={() => handleViewLead(lead)}
                                                            className="w-full hover:text-primary-700 dark:hover:text-primary-200 transition-colors focus:outline-none"
                                                        >
                                                            <MarqueeText
                                                                text={lead.name}
                                                                className="w-full"
                                                                contentClassName="text-sm font-medium text-gray-900 dark:text-gray-100"
                                                            />
                                                        </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 hidden lg:table-cell text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {(lead as any).leadCompanyName ?? (lead as any).lead_company_name ?? '-'}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 hidden lg:table-cell text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {(lead as any).profession && String((lead as any).profession).trim() !== '' ? (lead as any).profession : '-'}
                                                </td>
                                                {isMedicalCompany && (
                                                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                        {(lead as Lead).patientFileNumber ??
                                                            (lead as any).patient_file_number ??
                                                            '-'}
                                                    </td>
                                                )}
                                                <td className="px-4 sm:px-6 py-4 text-center min-w-[220px]">
                                                    {isDataEntryUser ? (
                                                        <span className="text-sm text-gray-900 dark:text-gray-100" dir="ltr">
                                                            {lead.phoneNumbers && lead.phoneNumbers.length > 0
                                                                ? lead.phoneNumbers.map((pn: { phone_number: string }) => pn.phone_number).join(', ')
                                                                : (lead.phone || '-')}
                                                        </span>
                                                    ) : (
                                                    <div className="mx-auto w-full min-w-[200px] max-w-full">
                                                        <LeadContactPhoneList
                                                            variant="table"
                                                            phoneNumbers={lead.phoneNumbers}
                                                            fallbackPhone={lead.phone}
                                                            pbxEnabled={canPbxDial}
                                                            onSms={(phone) => setSendSMSModal({ leadId: lead.id, phone, lead })}
                                                            onWhatsApp={(phone) => setSendWhatsAppModal({ leadId: lead.id, phone, lead })}
                                                            onPbxDial={(phone) => handlePbxDial(lead.id, phone)}
                                                            t={t}
                                                        />
                                                    </div>
                                                    )}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-center whitespace-nowrap">
                                                    {(() => {
                                                        const source = (lead as any).source || 'manual';
                                                        const sourceBadgeClass =
                                                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap';
                                                        if (source === 'meta_lead_form') {
                                                            return (
                                                                <span className={`${sourceBadgeClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}>
                                                                    <FacebookIcon className="w-3 h-3" />
                                                                    {t('metaLeadForm') || 'Meta'}
                                                                </span>
                                                            );
                                                        } else if (source === 'whatsapp') {
                                                            return (
                                                                <span className={`${sourceBadgeClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>
                                                                    <WhatsappIcon className="w-3 h-3" />
                                                                    {t('whatsappSource') || 'WhatsApp'}
                                                                </span>
                                                            );
                                                        } else if (source === 'tiktok') {
                                                            return (
                                                                <span className={`${sourceBadgeClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>
                                                                    <TikTokIcon className="w-3 h-3 text-gray-900 dark:text-white" />
                                                                    {t('tiktokSource') || 'TikTok'}
                                                                </span>
                                                            );
                                                        } else if (source === 'api') {
                                                            return (
                                                                <span className={`${sourceBadgeClass} bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200`}>
                                                                    {t('leadApiSource') || 'Custom API'}
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className={`${sourceBadgeClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>
                                                                {t('manualSource') || 'Manual'}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    {(() => {
                                                        const createdById = (lead as any).created_by ?? lead.createdBy;
                                                        const apiName = (lead as any).created_by_name ?? lead.createdByName;
                                                        const creatorUser = createdById ? users.find(u => u.id === createdById) : null;
                                                        return creatorUser?.name ?? apiName ?? '-';
                                                    })()}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-center">
                                                    {lead.campaign ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                            {(lead as any).campaign_name || `Campaign #${lead.campaign}`}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-gray-500">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-center">
                                                    {(() => {
                                                        const type = lead.type?.toLowerCase() || '';
                                                        return (
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                                                type === 'fresh' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                type === 'hot' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                                type === 'cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                            }`}>
                                                                {type === 'fresh' ? t('fresh') : 
                                                                 type === 'hot' ? t('hot') :
                                                                 type === 'cold' ? t('cold') : 
                                                                 lead.type || '-'}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-center">
                                                    {(() => {
                                                        const priority = lead.priority?.toLowerCase() || '';
                                                        return (
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                                                priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                                priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                            }`}>
                                                                {priority === 'high' ? t('high') : 
                                                                 priority === 'medium' ? t('medium') : 
                                                                 priority === 'low' ? t('low') : 
                                                                 lead.priority || '-'}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    {(() => {
                                                        const s = formatLeadBudget(lead as any, language === 'ar' ? 'ar-IQ' : 'en-US');
                                                        return s || '-';
                                                    })()}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    {assignedUserName || '-'}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    {(lead as any).communication_way_name || lead.communicationWay || '-'}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 hidden md:table-cell text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {(() => {
                                                            // Use status_name from API if available, otherwise find by ID or name
                                                            const statusName = (lead as any).status_name || 
                                                                (lead.status ? statuses.find(s => s.id.toString() === lead.status.toString() || s.name === lead.status)?.name : null);
                                                            
                                                            // Find current status config
                                                            const currentStatusConfig = statuses.find(s => 
                                                                s.name === statusName || 
                                                                s.id.toString() === (lead.status?.toString() || '')
                                                            );
                                                            
                                                            // Get available statuses (non-hidden)
                                                            const availableStatuses = statuses.filter(s => !s.isHidden);
                                                            
                                                            const isUpdating = updatingLeadId === lead.id;

                                                            if (!statusName || !currentStatusConfig) {
                                                                return <LeadStatusBadge name="—" size="sm" />;
                                                            }

                                                            if (availableStatuses.length === 0 || isDataEntryUser) {
                                                                return (
                                                                    <LeadStatusBadge
                                                                        name={statusName}
                                                                        color={currentStatusConfig.color}
                                                                        size="sm"
                                                                    />
                                                                );
                                                            }

                                                            return (
                                                                <LeadStatusDropdown
                                                                    leadId={lead.id}
                                                                    currentStatus={currentStatusConfig}
                                                                    availableStatuses={availableStatuses}
                                                                    onStatusChange={handleStatusChange}
                                                                    isUpdating={isUpdating}
                                                                    size="sm"
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    {lead.lastFeedback || (lead as any).last_feedback || '-'}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    {(() => {
                                                        const createdAt = (lead as any).created_at || lead.createdAt;
                                                        return createdAt
                                                            ? formatTimelineDate(createdAt, language === 'ar' ? 'ar' : 'en')
                                                            : '-';
                                                    })()}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-center">
                                                    {isDataEntryUser ? (
                                                        <span className="text-gray-400 dark:text-gray-500">—</span>
                                                    ) : (
                                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                        <button 
                                                            className="p-1 h-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" 
                                                            onClick={() => handleViewLead(lead)}
                                                            title={t('view') || 'View'}
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        {canDeleteLead(lead) && (
                                                            <button 
                                                                className="p-1 h-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                                                onClick={() => handleDeleteLead(lead)}
                                                                title={t('delete') || 'Delete'}
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TableHorizontalScroll>
                <div className="mt-4 px-2 sm:px-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {totalLeadsCount > 0
                            ? `${t('showing')} ${normalizedLeads.length} ${t('of')} ${totalLeadsCount}`
                            : t('noLeadsFound')}
                    </p>
                    <div className="flex items-center gap-2" dir="ltr">
                        <select
                            value={leadsPageSize}
                            onChange={(e) => setLeadsPageSize(Number(e.target.value))}
                            className="px-2 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs sm:text-sm"
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>
                                    {`${size} ${t('perPage')}`}
                                </option>
                            ))}
                        </select>
                        <Button
                            variant="secondary"
                            onClick={() => setLeadsPageNumber(1)}
                            disabled={leadsPageNumber === 1 || leadsLoading}
                        >
                            &laquo;
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setLeadsPageNumber((prev) => Math.max(1, prev - 1))}
                            disabled={!hasPreviousPage || leadsLoading}
                        >
                            {t('previous')}
                        </Button>
                        {paginationItems.map((item, idx) =>
                            item === 'ellipsis' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
                            ) : (
                                <Button
                                    key={item}
                                    variant={item === leadsPageNumber ? 'primary' : 'secondary'}
                                    onClick={() => setLeadsPageNumber(item)}
                                    disabled={leadsLoading}
                                >
                                    {item}
                                </Button>
                            )
                        )}
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-[90px] text-center">
                            {t('page')} {leadsPageNumber} {t('of')} {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            onClick={() => setLeadsPageNumber((prev) => prev + 1)}
                            disabled={!hasNextPage || leadsLoading}
                        >
                            {t('next')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setLeadsPageNumber(totalPages)}
                            disabled={leadsPageNumber === totalPages || leadsLoading}
                        >
                            &raquo;
                        </Button>
                    </div>
                </div>
            </Card>
        </PageWrapper>
        <ImportLeadsModal
            isOpen={isImportLeadsModalOpen}
            onClose={() => setIsImportLeadsModalOpen(false)}
            onSuccess={(imported, failed) => {
                if (imported > 0) {
                    setSuccessMessage(t('importLeadsSuccess') || `${imported} lead(s) imported successfully.`);
                    setIsSuccessModalOpen(true);
                }
            }}
        />
        {sendSMSModal && (
            <SendSMSModal
                isOpen={true}
                onClose={() => setSendSMSModal(null)}
                leadId={sendSMSModal.leadId}
                phoneNumber={sendSMSModal.phone}
                lead={sendSMSModal.lead}
            />
        )}
        {sendWhatsAppModal && (
            <SendWhatsAppModal
                isOpen={true}
                onClose={() => setSendWhatsAppModal(null)}
                leadId={sendWhatsAppModal.leadId}
                phoneNumber={sendWhatsAppModal.phone}
                lead={sendWhatsAppModal.lead}
            />
        )}
        </>
    );
};