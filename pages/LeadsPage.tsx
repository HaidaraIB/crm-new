

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterIcon, PlusIcon, EyeIcon, WhatsappIcon, Loader, PhoneIcon, ImportLeadsModal, SmsIcon } from '../components/index';
import { TrashIcon, ChevronDownIcon, FacebookIcon } from '../components/icons';
import SendSMSModal from '../components/modals/SendSMSModal';
import { Lead } from '../types';
import { useLeads, useDeleteLead, useUpdateLead, useUsers, useStatuses, useClientTasks, useAssignUnassignedClients } from '../hooks/useQueries';
import { exportToExcel } from '../utils/exportToExcel';

// Status Dropdown Component
const StatusDropdown = ({ 
    leadId, 
    currentStatus, 
    availableStatuses, 
    onStatusChange, 
    isUpdating,
    hexToRgb,
    theme
}: { 
    leadId: number;
    currentStatus: any;
    availableStatuses: any[];
    onStatusChange: (leadId: number, statusId: number) => void;
    isUpdating: boolean;
    hexToRgb: (hex: string) => { r: number; g: number; b: number } | null;
    theme: 'light' | 'dark';
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);
    
    const statusName = currentStatus?.name || '';
    const statusColor = currentStatus?.color || '#808080';
    const rgb = hexToRgb(statusColor);
    // Background with good opacity
    const bgColor = rgb 
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`
        : 'bg-gray-200 dark:bg-gray-600';
    // Simple: white text in dark mode, black text in light mode - no other conditions
    const textColor = theme === 'light' ? '#000000' : '#ffffff';
    
    // Calculate dropdown position and direction
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            const estimatedDropdownHeight = availableStatuses.length * 36 + 8; // Approximate height
            
            // Calculate position using fixed positioning
            const left = buttonRect.left;
            let top = 0;
            let shouldOpenUpward = false;
            
            // Open upward if there's not enough space below but enough above
            if (spaceBelow < estimatedDropdownHeight && spaceAbove > estimatedDropdownHeight) {
                shouldOpenUpward = true;
                top = buttonRect.top - estimatedDropdownHeight;
            } else {
                shouldOpenUpward = false;
                top = buttonRect.bottom;
            }
            
            setOpenUpward(shouldOpenUpward);
            setDropdownPosition({ top, left });
        }
    }, [isOpen, availableStatuses.length]);
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(target) &&
                dropdownMenuRef.current &&
                !dropdownMenuRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);
    
    if (availableStatuses.length === 0) {
        return (
            <span 
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!rgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                style={rgb ? {
                    backgroundColor: bgColor,
                    color: textColor,
                } : undefined}
            >
                {statusName}
            </span>
        );
    }
    
    return (
        <div className="relative inline-flex items-center" ref={dropdownRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => !isUpdating && setIsOpen(!isOpen)}
                disabled={isUpdating}
                className={`inline-flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap outline-none cursor-pointer transition-colors focus:ring-2 focus:ring-primary/70 focus:ring-offset-2 pr-9 min-w-[110px] ${
                    !rgb 
                        ? 'bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500' 
                        : 'border'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                style={rgb ? {
                    backgroundColor: bgColor,
                    color: textColor,
                    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
                } : {
                    color: textColor,
                }}
            >
                <span 
                    className="flex-1 text-center font-medium"
                    style={{ color: textColor }}
                >
                    {statusName}
                </span>
                <div 
                    className="absolute right-2.5 flex items-center pointer-events-none"
                    style={{ color: textColor }}
                >
                    <ChevronDownIcon 
                        className={`w-4 h-4 transition-all duration-200 ${isUpdating ? 'opacity-50' : 'opacity-100'} ${isOpen ? (openUpward ? '' : 'rotate-180') : ''}`}
                    />
                </div>
            </button>
            
            {isOpen && (
                <>
                    <div 
                        ref={dropdownMenuRef}
                        className="fixed z-[9999] min-w-[180px] bg-gray-800 dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden border border-gray-700/80 dark:border-gray-600/80 backdrop-blur-md"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                        }}
                    >
                        <div className="py-1.5">
                            {availableStatuses.map((status, index) => {
                                const isSelected = status.id === currentStatus?.id;
                                
                                return (
                                    <button
                                        key={status.id}
                                        type="button"
                                        onClick={() => {
                                            if (status.id !== currentStatus?.id) {
                                                onStatusChange(leadId, status.id);
                                            }
                                            setIsOpen(false);
                                        }}
                                        className={`relative w-full text-left px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                                            isSelected 
                                                ? 'text-white dark:text-white bg-primary/15' 
                                                : 'text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white hover:bg-gray-700/60 dark:hover:bg-gray-700/60'
                                        }`}
                                    >
                                        <span className="relative z-10 flex items-center justify-between">
                                            <span className="flex-1">{status.name}</span>
                                            {isSelected && (
                                                <svg className="w-4 h-4 text-primary ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-sm"></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
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
        theme,
        language,
        setIsSuccessModalOpen,
        setSuccessMessage,
    } = useAppContext();
    
    // Determine API filters based on current page
    const apiFilters = useMemo(() => {
        const filters: { type?: string; priority?: string; search?: string } = {};
        if (currentPage === 'Fresh Leads') filters.type = 'fresh';
        else if (currentPage === 'Cold Leads') filters.type = 'cold';
        else if (currentPage === 'Rotated Leads') filters.type = 'rotated';
        if (leadFilters.search) filters.search = leadFilters.search;
        if (leadFilters.priority && leadFilters.priority !== 'All') filters.priority = leadFilters.priority.toLowerCase();
        return filters;
    }, [currentPage, leadFilters]);

    // Fetch leads using React Query
    const { data: leadsResponse, isLoading: leadsLoading, error: leadsError } = useLeads(apiFilters);
    const allLeads = leadsResponse?.results || [];
    // Normalize API fields to frontend naming for consistent rendering (phone_numbers -> phoneNumbers, etc.)
    const normalizedLeads = React.useMemo(() => {
        return (allLeads || []).map((l: any) => ({
            ...l,
            phoneNumbers: l.phone_numbers || l.phoneNumbers || [],
            phone: l.phone_number || l.phone || '',
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
        }));
    }, [allLeads]);

    // Fetch users, statuses, and client tasks
    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];
    
    const { data: statusesData } = useStatuses();
    // Handle both array response and object with results property
    const statuses = Array.isArray(statusesData) 
        ? statusesData 
        : (statusesData?.results || []);
    
    const { data: clientTasksResponse } = useClientTasks();
    const clientTasks = clientTasksResponse?.results || [];

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
        onError: (error: any) => {
            console.error('Error assigning unassigned clients:', error);
            // Use translation for error message
            setSuccessMessage(t('errorAssigningClients') || 'Failed to assign unassigned clients.');
            setIsSuccessModalOpen(true);
        },
    });
    
    // Track which lead is being updated
    const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);
    // Send SMS modal: { leadId, phone }
    const [sendSMSModal, setSendSMSModal] = useState<{ leadId: number; phone: string } | null>(null);

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
            
            // Prepare update data
            const updateData: any = {
                name: lead.name,
                phone: lead.phone,
                budget: lead.budget,
                assignedTo: lead.assignedTo,
                type: lead.type,
                communicationWay: lead.communicationWay,
                priority: lead.priority,
                status: status.id, // Send status ID
                company: companyId, // Include company ID
            };
            
            // Include phoneNumbers if they exist
            if (lead.phoneNumbers && lead.phoneNumbers.length > 0) {
                updateData.phoneNumbers = lead.phoneNumbers;
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
    const [activeStatusFilter, setActiveStatusFilter] = useState<Lead['status']>('All');
    const [isImportLeadsModalOpen, setIsImportLeadsModalOpen] = useState(false);

    const handleExportLeads = () => {
        const rows = filteredLeads.map((l: Lead & { assigned_to_username?: string; campaign_name?: string }) => {
            const phone = l.phone || (l.phoneNumbers && l.phoneNumbers.length > 0
                ? (l.phoneNumbers.find(p => p.is_primary) || l.phoneNumbers[0]).phone_number
                : '');
            return {
                name: l.name,
                phone,
                budget: l.budget ?? '',
                type: l.type ?? '',
                priority: l.priority ?? '',
                status: ((l as any).status_name || l.status) ?? '',
                communicationWay: ((l as any).communication_way_name || l.communicationWay) ?? '',
                assignedToName: (l as any).assigned_to_username ?? '',
                source: l.source ?? '',
                campaign: (l as any).campaign_name ?? l.campaign_name ?? '',
                createdAt: l.createdAt ? new Date(l.createdAt).toLocaleString() : '',
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
            { key: 'campaign', label: t('campaign') || 'Campaign' },
            { key: 'createdAt', label: t('createdAt') || 'Created At' },
        ];
        exportToExcel(rows, columns, `leads-export-${new Date().toISOString().slice(0, 10)}`, t('leads') || 'Leads');
    };

    const handleViewLead = (lead: Lead) => {
        setSelectedLead(lead);
        window.history.pushState({}, '', `/view-lead/${lead.id}`);
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

    // Check if user can delete a lead (admin or assigned employee)
    const canDeleteLead = (lead: Lead) => {
        const isAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'admin';
        const isAssignedEmployee = lead.assignedTo === currentUser?.id;
        return isAdmin || isAssignedEmployee;
    };

    // FIX: Convert page title to camelCase to match translation keys and cast to the correct type.
    const pageTitleKey = (currentPage.charAt(0).toLowerCase() + currentPage.slice(1).replace(/\s/g, '')) as Parameters<typeof t>[0];
    const pageTitle = t(pageTitleKey);
    
    // Calculate filtered leads without status filter (for tab counts)
    const filteredLeadsWithoutStatus = useMemo(() => {
        let leads = normalizedLeads;
        
        // 1. Filter by sidebar page type
        switch (currentPage) {
            case 'Fresh Leads': leads = leads.filter(l => (l.type?.toLowerCase() || '') === 'fresh'); break;
            case 'Cold Leads': leads = leads.filter(l => (l.type?.toLowerCase() || '') === 'cold'); break;
            case 'My Leads': 
                if (currentUser?.id) {
                    leads = leads.filter(l => {
                        // Use assigned_to from API if available, otherwise fallback to assignedTo
                        const assignedToId = (l as any).assigned_to || l.assignedTo;
                        return assignedToId === currentUser.id;
                    });
                }
                break;
            case 'Rotated Leads': leads = leads.filter(l => l.type === 'Rotated'); break;
            default: break; // All Leads
        }

        // Note: Status filter is applied separately in filteredLeads

        // 3. Apply filters from FilterDrawer (excluding status filter for tab counts)
        if (leadFilters.type && leadFilters.type !== 'All') {
            leads = leads.filter(l => (l.type?.toLowerCase() || '') === leadFilters.type.toLowerCase());
        }

        if (leadFilters.priority && leadFilters.priority !== 'All') {
            leads = leads.filter(l => (l.priority?.toLowerCase() || '') === leadFilters.priority.toLowerCase());
        }

        if (leadFilters.assignedTo && leadFilters.assignedTo !== 'All') {
            leads = leads.filter(l => {
                // Use assigned_to from API if available, otherwise fallback to assignedTo
                const assignedToId = (l as any).assigned_to || l.assignedTo;
                return assignedToId === parseInt(leadFilters.assignedTo);
            });
        }

        if (leadFilters.communicationWay && leadFilters.communicationWay !== 'All') {
            leads = leads.filter(l => l.communicationWay === leadFilters.communicationWay);
        }

        if (leadFilters.budgetMin) {
            const minBudget = parseFloat(leadFilters.budgetMin);
            if (!isNaN(minBudget)) {
                leads = leads.filter(l => l.budget >= minBudget);
            }
        }

        if (leadFilters.budgetMax) {
            const maxBudget = parseFloat(leadFilters.budgetMax);
            if (!isNaN(maxBudget)) {
                leads = leads.filter(l => l.budget <= maxBudget);
            }
        }

        if (leadFilters.createdAtFrom) {
            leads = leads.filter(l => {
                const createdAt = (l as any).created_at || l.createdAt;
                if (!createdAt) return false;
                const leadDate = new Date(createdAt);
                const filterDate = new Date(leadFilters.createdAtFrom);
                return leadDate >= filterDate;
            });
        }

        if (leadFilters.createdAtTo) {
            leads = leads.filter(l => {
                const createdAt = (l as any).created_at || l.createdAt;
                if (!createdAt) return false;
                const leadDate = new Date(createdAt);
                const filterDate = new Date(leadFilters.createdAtTo);
                // Set to end of day for inclusive comparison
                filterDate.setHours(23, 59, 59, 999);
                return leadDate <= filterDate;
            });
        }

        if (leadFilters.search) {
            const searchLower = leadFilters.search.toLowerCase();
            leads = leads.filter(l => 
                l.name.toLowerCase().includes(searchLower) || 
                l.phone.includes(searchLower)
            );
        }

        return leads;
    }, [currentPage, allLeads, leadFilters, currentUser, statuses]);

    // Apply status filter to get final filtered leads
    const filteredLeads = useMemo(() => {
        let leads = filteredLeadsWithoutStatus;

        // Apply status filter from FilterDrawer if set (takes priority over activeStatusFilter)
        if (leadFilters.status && leadFilters.status !== 'All') {
            leads = leads.filter(l => {
                const statusName = (l as any).status_name || 
                    (l.status ? statuses.find(s => s.id.toString() === l.status.toString() || s.name === l.status)?.name : null);
                return statusName === leadFilters.status;
            });
        } else if(activeStatusFilter !== 'All') {
            // Filter by quick status tabs only if no status filter from FilterDrawer
            leads = leads.filter(l => {
                const statusName = (l as any).status_name || 
                    (l.status ? statuses.find(s => s.id.toString() === l.status.toString() || s.name === l.status)?.name : null);
                return statusName === activeStatusFilter;
            });
        }

        return leads;
    }, [filteredLeadsWithoutStatus, activeStatusFilter, leadFilters.status, statuses]);

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
            setCheckedLeadIds(new Set(filteredLeads.map(l => l.id)));
        } else {
            setCheckedLeadIds(new Set());
        }
    };
    
    const isAllSelected = filteredLeads.length > 0 && checkedLeadIds.size === filteredLeads.length;

    if (leadsLoading) {
        return (
            <PageWrapper title={pageTitle}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
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

    // Check if current user is admin (Owner role)
    const isAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'admin';

    return (
        <>
        <PageWrapper 
            title={pageTitle}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsFilterDrawerOpen(true)} className="w-full sm:w-auto"><FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span></Button>
                    <Button variant="secondary" onClick={handleExportLeads} className="w-full sm:w-auto" disabled={filteredLeads.length === 0}><span className="hidden sm:inline">{t('exportLeads') || 'Export to Excel'}</span></Button>
                    <Button variant="secondary" onClick={() => setIsImportLeadsModalOpen(true)} className="w-full sm:w-auto"><span className="hidden sm:inline">{t('importLeads') || 'Import from Excel'}</span></Button>
                    <Button onClick={() => {
                        window.history.pushState({}, '', '/create-lead');
                        setCurrentPage('CreateLead');
                    }} className="w-full sm:w-auto"><PlusIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('addLead')}</span></Button>
                    {isAdmin && (
                        <>
                            <Button 
                                variant="secondary" 
                                onClick={() => setIsAssignLeadModalOpen(true)} 
                                disabled={checkedLeadIds.size === 0} 
                                className="w-full sm:w-auto"
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
                                className="w-full sm:w-auto"
                            >
                                {t('assignUnassigned') || 'Assign Unassigned'}
                            </Button>
                        </>
                    )}
                </>
            }
        >
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto scrollbar-thin">
                {leadStatusFilters.map(status => {
                    // Calculate count from filtered leads (without status filter)
                    const count = status === 'All' 
                        ? filteredLeadsWithoutStatus.length 
                        : filteredLeadsWithoutStatus.filter(l => {
                            const statusName = (l as any).status_name || 
                                (l.status ? statuses.find(s => s.id.toString() === l.status.toString() || s.name === l.status)?.name : null);
                            return statusName === status;
                        }).length;
                    
                    const statusConfig = status === 'All' ? null : statuses.find(s => s.name === status);
                    
                    return (
                        <button 
                            key={status}
                            onClick={() => setActiveStatusFilter(status)}
                            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${activeStatusFilter === status ? 'border-b-2 border-primary text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
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
            <Card>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                        <div className="overflow-hidden">
                            <table className="w-full text-sm text-left rtl:text-right min-w-[1200px]">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th scope="col" className="p-2 sm:p-4 text-center whitespace-nowrap"><input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={isAllSelected} className="rounded" /></th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 text-center whitespace-nowrap">{t('name')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 text-center whitespace-nowrap">{t('phone')}</th>
                                        <th scope="col" className="px-4 sm:px-6 py-3 hidden lg:table-cell text-center whitespace-nowrap">{t('source') || 'Source'}</th>
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
                                    {filteredLeads.map(lead => {
                                        // Get assigned user info - use assigned_to from API if available
                                        const assignedToId = (lead as any).assigned_to || lead.assignedTo;
                                        const assignedToUsername = (lead as any).assigned_to_username;
                                        const assignedUser = assignedToId ? users.find(u => u.id === assignedToId) : null;
                                        const assignedUserName = assignedUser?.name || 
                                                                 assignedToUsername || 
                                                                 assignedUser?.username || 
                                                                 null;
                                        
                                        // Get last feedback from the most recent ClientTask for this lead
                                        const leadClientTasks = clientTasks
                                            .filter((ct: any) => {
                                                const clientId = ct.client || ct.clientId;
                                                return clientId === lead.id;
                                            })
                                            .sort((a: any, b: any) => {
                                                const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
                                                const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
                                                return dateB - dateA;
                                            });
                                        const lastClientTask = leadClientTasks.length > 0 ? leadClientTasks[0] : null;
                                        const lastFeedback = lastClientTask?.notes || '';
                                        
                                        return (
                                            <tr key={lead.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="p-2 sm:p-4 text-center"><input type="checkbox" checked={checkedLeadIds.has(lead.id)} onChange={(e) => handleCheckChange(lead.id, e.target.checked)} className="rounded" /></td>
                                                <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    <button 
                                                        onClick={() => handleViewLead(lead)}
                                                        className="hover:text-primary transition-colors focus:outline-none"
                                                    >
                                                        {lead.name}
                                                    </button>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-center">
                                                    <div className="flex flex-col gap-2">
                                                        {lead.phoneNumbers && lead.phoneNumbers.length > 0 ? (
                                                            lead.phoneNumbers.map((pn) => (
                                                                <div key={pn.id} className={`grid ${language === 'ar' ? 'grid-cols-[1fr_auto_auto_auto_auto]' : 'grid-cols-[auto_auto_auto_auto_1fr]'} items-center gap-1`}>
                                                                    {language === 'ar' ? (
                                                                        <>
                                                                            <span className={`text-gray-900 dark:text-gray-100 whitespace-nowrap text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                                                                {pn.phone_number}
                                                                            </span>
                                                                            <div className="w-16 text-right">
                                                                                {pn.is_primary ? (
                                                                                    <span className="text-xs text-primary whitespace-nowrap">
                                                                                        ({t('primary') || 'Primary'})
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-xs whitespace-nowrap">&nbsp;</span>
                                                                                )}
                                                                            </div>
                                                                            <a 
                                                                                href={`tel:${pn.phone_number.replace(/[^0-9+]/g, '')}`}
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-primary hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={`${t('call') || 'Call'} - ${pn.phone_type}`}
                                                                            >
                                                                                <PhoneIcon className="w-5 h-5"/>
                                                                            </a>
                                                                            <a 
                                                                                href={`https://wa.me/${pn.phone_number.replace(/[^0-9]/g, '')}`} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={`${t('openWhatsApp') || 'Open WhatsApp'} - ${pn.phone_type}`}
                                                                            >
                                                                                <WhatsappIcon className="w-5 h-5"/>
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSendSMSModal({ leadId: lead.id, phone: pn.phone_number })}
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={t('sendSms') || 'Send SMS'}
                                                                            >
                                                                                <SmsIcon className="w-5 h-5"/>
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSendSMSModal({ leadId: lead.id, phone: pn.phone_number })}
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={t('sendSms') || 'Send SMS'}
                                                                            >
                                                                                <SmsIcon className="w-5 h-5"/>
                                                                            </button>
                                                                            <a 
                                                                                href={`https://wa.me/${pn.phone_number.replace(/[^0-9]/g, '')}`} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={`${t('openWhatsApp') || 'Open WhatsApp'} - ${pn.phone_type}`}
                                                                            >
                                                                                <WhatsappIcon className="w-5 h-5"/>
                                                                            </a>
                                                                            <a 
                                                                                href={`tel:${pn.phone_number.replace(/[^0-9+]/g, '')}`}
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-primary hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={`${t('call') || 'Call'} - ${pn.phone_type}`}
                                                                            >
                                                                                <PhoneIcon className="w-5 h-5"/>
                                                                            </a>
                                                                            <div className="w-16 text-left">
                                                                                {pn.is_primary ? (
                                                                                    <span className="text-xs text-primary whitespace-nowrap">
                                                                                        ({t('primary') || 'Primary'})
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-xs whitespace-nowrap">&nbsp;</span>
                                                                                )}
                                                                            </div>
                                                                            <span className={`text-gray-900 dark:text-gray-100 whitespace-nowrap text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                                                                {pn.phone_number}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            lead.phone ? (
                                                                <div className={`grid ${language === 'ar' ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[auto_auto_auto_1fr]'} items-center gap-1`}>
                                                                    {language === 'ar' ? (
                                                                        <>
                                                                            <span className={`text-gray-900 dark:text-gray-100 whitespace-nowrap text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}>{lead.phone}</span>
                                                                            <a 
                                                                                href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-primary hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={t('call') || 'Call'}
                                                                            >
                                                                                <PhoneIcon className="w-5 h-5"/>
                                                                            </a>
                                                                            <a 
                                                                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={t('openWhatsApp') || 'Open WhatsApp'}
                                                                            >
                                                                                <WhatsappIcon className="w-5 h-5"/>
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSendSMSModal({ leadId: lead.id, phone: lead.phone })}
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={t('sendSms') || 'Send SMS'}
                                                                            >
                                                                                <SmsIcon className="w-5 h-5"/>
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSendSMSModal({ leadId: lead.id, phone: lead.phone })}
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={t('sendSms') || 'Send SMS'}
                                                                            >
                                                                                <SmsIcon className="w-5 h-5"/>
                                                                            </button>
                                                                            <a 
                                                                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={t('openWhatsApp') || 'Open WhatsApp'}
                                                                            >
                                                                                <WhatsappIcon className="w-5 h-5"/>
                                                                            </a>
                                                                            <a 
                                                                                href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                                                                                className="inline-flex items-center justify-center w-8 h-8 text-primary hover:opacity-80 transition-opacity flex-shrink-0"
                                                                                title={t('call') || 'Call'}
                                                                            >
                                                                                <PhoneIcon className="w-5 h-5"/>
                                                                            </a>
                                                                            <span className={`text-gray-900 dark:text-gray-100 whitespace-nowrap text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}>{lead.phone}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-900 dark:text-gray-100">-</span>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-center">
                                                    {(() => {
                                                        const source = (lead as any).source || 'manual';
                                                        if (source === 'meta_lead_form') {
                                                            return (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                    <FacebookIcon className="w-3 h-3" />
                                                                    {t('metaLeadForm') || 'Meta'}
                                                                </span>
                                                            );
                                                        } else if (source === 'whatsapp') {
                                                            return (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                    <WhatsappIcon className="w-3 h-3" />
                                                                    {t('whatsappSource') || 'WhatsApp'}
                                                                </span>
                                                            );
                                                        } else if (source === 'tiktok') {
                                                            return (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                                    {t('tiktokSource') || 'TikTok'}
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                                {t('manualSource') || 'Manual'}
                                                            </span>
                                                        );
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
                                                                type === 'cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                            }`}>
                                                                {type === 'fresh' ? t('fresh') : 
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
                                                    {lead.budget && lead.budget > 0 ? (
                                                        (() => {
                                                            const num = Number(lead.budget);
                                                            const formatted = num.toLocaleString('en-US', { 
                                                                minimumFractionDigits: 0, 
                                                                maximumFractionDigits: 2 
                                                            });
                                                            // Remove trailing zeros after decimal point
                                                            return formatted.replace(/\.0+$/, '');
                                                        })()
                                                    ) : '-'}
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
                                                            
                                                            // Convert hex to RGB for background opacity
                                                            const hexToRgb = (hex: string) => {
                                                                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                                                return result ? {
                                                                    r: parseInt(result[1], 16),
                                                                    g: parseInt(result[2], 16),
                                                                    b: parseInt(result[3], 16)
                                                                } : null;
                                                            };
                                                            
                                                            const statusColor = currentStatusConfig?.color || '#808080';
                                                            const rgb = hexToRgb(statusColor);
                                                            const bgColor = rgb 
                                                                ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
                                                                : 'bg-gray-100 dark:bg-gray-700';
                                                            const textColor = rgb
                                                                ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
                                                                : 'text-gray-800 dark:text-gray-200';
                                                            
                                                            if (availableStatuses.length === 0) {
                                                                return (
                                                                    <span 
                                                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!rgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                                        style={rgb ? {
                                                                            backgroundColor: bgColor,
                                                                            color: textColor,
                                                                        } : undefined}
                                                                    >
                                                                        {statusName}
                                                                    </span>
                                                                );
                                                            }
                                                            
                                                            return (
                                                                <StatusDropdown
                                                                    leadId={lead.id}
                                                                    currentStatus={currentStatusConfig}
                                                                    availableStatuses={availableStatuses}
                                                                    onStatusChange={handleStatusChange}
                                                                    isUpdating={isUpdating}
                                                                    hexToRgb={hexToRgb}
                                                                    theme={theme}
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    {lastFeedback || lead.lastFeedback || (lead as any).last_feedback || '-'}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                    {(lead as any).created_at ? 
                                                        new Date((lead as any).created_at).toLocaleDateString() : 
                                                        lead.createdAt ? 
                                                            new Date(lead.createdAt).toLocaleDateString() : 
                                                            '-'}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-center">
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
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
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
            />
        )}
        </>
    );
};