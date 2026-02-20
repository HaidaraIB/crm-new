

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, Timeline, DealIcon, EditIcon, PlusIcon, Loader, ArrowLeftIcon, WhatsappIcon, PhoneIcon, FacebookIcon, SmsIcon } from '../components/index';
import SendSMSModal from '../components/modals/SendSMSModal';
import { formatDateToLocal, formatDateTimeToLocal } from '../utils/dateUtils';
import { useUsers, useClientTasks, useStatuses, useLeads, useUpdateLead, useClientEvents, useStages, useClientCalls, useCallMethods, useLeadSMSMessages } from '../hooks/useQueries';
import { ChevronDownIcon } from '../components/icons';
import { Lead } from '../types';

// Status Dropdown Component (same as in LeadsPage)
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
    const bgColor = rgb 
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`
        : 'bg-gray-200 dark:bg-gray-600';
    // Simple: white text in dark mode, black text in light mode - no other conditions
    const textColor = theme === 'light' ? '#000000' : '#ffffff';
    
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            const estimatedDropdownHeight = availableStatuses.length * 40 + 16;
            
            const left = buttonRect.left;
            let top = 0;
            let shouldOpenUpward = false;
            
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

export const ViewLeadPage = () => {
    const { t, selectedLead, setIsAddActionModalOpen, setIsAddCallModalOpen, setEditingLead, setIsEditLeadModalOpen, setCurrentPage, setSelectedLeadForDeal, setSelectedLead, currentUser, theme, language } = useAppContext();
    
    // Update lead mutation
    const updateLeadMutation = useUpdateLead();
    const [updatingLeadId, setUpdatingLeadId] = React.useState<number | null>(null);
    const [sendSMSModal, setSendSMSModal] = React.useState<{ phone: string } | null>(null);
    
    // Handle status change
    const handleStatusChange = async (leadId: number, newStatusId: number) => {
        setUpdatingLeadId(leadId);
        try {
            const status = statuses.find(s => s.id === newStatusId);
            if (!status) {
                throw new Error('Status not found');
            }
            
            // Get the lead to preserve other fields
            const lead = allLeads.find((l: any) => l.id === leadId);
            if (!lead) {
                throw new Error('Lead not found');
            }
            
            // Get company ID
            const companyId = lead.company?.id || lead.company || lead.company_id;
            if (!companyId) {
                throw new Error('Company ID not found');
            }
            
            // Prepare update data
            const updateData: any = {
                name: lead.name,
                phone: lead.phone_number || lead.phone || '',
                budget: lead.budget || 0,
                assignedTo: lead.assigned_to || 0,
                type: lead.type || '',
                communicationWay: lead.communication_way || '',
                priority: lead.priority || '',
                status: status.id,
                company: companyId,
            };
            
            // Include phoneNumbers if they exist
            if (lead.phone_numbers && lead.phone_numbers.length > 0) {
                updateData.phoneNumbers = lead.phone_numbers;
            }
            
            await updateLeadMutation.mutateAsync({
                id: leadId,
                data: updateData,
            });
            
            // Refetch leads to update the display
            refetchLeads();
        } catch (error) {
            console.error('Error updating lead status:', error);
            alert(t('errorUpdatingLeadStatus') || 'Failed to update lead status. Please try again.');
        } finally {
            setUpdatingLeadId(null);
        }
    };
    
    // Get leadId from URL
    const pathname = decodeURIComponent(window.location.pathname);
    const leadIdFromUrl = pathname.match(/\/view-lead\/(\d+)/)?.[1];
    const leadId = leadIdFromUrl ? parseInt(leadIdFromUrl) : selectedLead?.id;
    
    // Fetch data using React Query hooks
    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];
    
    const { data: clientTasksResponse } = useClientTasks();
    const clientTasks = clientTasksResponse?.results || [];
    
    const { data: clientCallsResponse } = useClientCalls();
    const clientCalls = clientCallsResponse?.results || [];
    
    const { data: callMethodsData } = useCallMethods();
    const callMethods = Array.isArray(callMethodsData) 
        ? callMethodsData 
        : (callMethodsData?.results || []);
    
    const { data: clientEventsResponse } = useClientEvents(leadId);
    const clientEvents = clientEventsResponse?.results || [];
    
    const { data: leadSMSMessages = [], refetch: refetchLeadSMS } = useLeadSMSMessages(leadId ?? undefined);
    
    const { data: statusesData } = useStatuses();
    // Handle both array response and object with results property
    const statuses = Array.isArray(statusesData) 
        ? statusesData 
        : (statusesData?.results || []);
    
    const { data: stagesData } = useStages();
    const stages = Array.isArray(stagesData) 
        ? stagesData 
        : (stagesData?.results || []);
    
    // Fetch leads to get updated data
    const { data: leadsResponse, refetch: refetchLeads } = useLeads();
    const allLeads = leadsResponse?.results || [];
    
    // Find the current lead from the fetched leads list (most up-to-date)
    const currentLead = useMemo(() => {
        // First try to find by leadId from URL
        if (leadId) {
            const apiLead = allLeads.find((l: any) => l.id === leadId);
            if (apiLead) {
                // Transform API lead to Lead format
                const transformedLead: Lead = {
                    id: apiLead.id,
                    name: apiLead.name,
                    phone: apiLead.phone_number || apiLead.phone || '',
                    phoneNumbers: apiLead.phone_numbers || [],
                    status: apiLead.status_name || apiLead.status || '',
                    type: apiLead.type || '',
                    assignedTo: apiLead.assigned_to || (apiLead.assigned_to_username ? 0 : 0),
                    budget: apiLead.budget || 0,
                    communicationWay: apiLead.communication_way_name || apiLead.communication_way || '',
                    priority: apiLead.priority || '',
                    createdAt: apiLead.created_at || apiLead.createdAt || '',
                    lastFeedback: apiLead.last_feedback || apiLead.lastFeedback || '',
                    campaign: apiLead.campaign || null,
                    campaign_name: apiLead.campaign_name || (apiLead.campaign ? String(apiLead.campaign) : null),
                    source: apiLead.source || 'manual',
                    integration_account: apiLead.integration_account || null,
                };
                // Store assigned_to from API for display
                (transformedLead as any).assigned_to = apiLead.assigned_to;
                (transformedLead as any).assigned_to_username = apiLead.assigned_to_username;
                return transformedLead;
            }
        }
        
        // Fallback to selectedLead if no leadId from URL
        if (!selectedLead?.id) return selectedLead;
        
        // Find lead from API data
        const apiLead = allLeads.find((l: any) => l.id === selectedLead.id);
        if (apiLead) {
            // Transform API lead to Lead format
            const transformedLead: Lead = {
                id: apiLead.id,
                name: apiLead.name,
                phone: apiLead.phone_number || apiLead.phone || '',
                phoneNumbers: apiLead.phone_numbers || [],
                status: apiLead.status_name || apiLead.status || '',
                type: apiLead.type || '',
                assignedTo: apiLead.assigned_to || (apiLead.assigned_to_username ? 0 : 0),
                budget: apiLead.budget || 0,
                communicationWay: apiLead.communication_way_name || apiLead.communication_way || '',
                priority: apiLead.priority || '',
                createdAt: apiLead.created_at || apiLead.createdAt || '',
                lastFeedback: apiLead.last_feedback || apiLead.lastFeedback || '',
                notes: apiLead.notes || '',
                campaign: apiLead.campaign || null,
                campaign_name: apiLead.campaign_name || (apiLead.campaign ? String(apiLead.campaign) : null),
                source: apiLead.source || 'manual',
                integration_account: apiLead.integration_account || null,
            };
            // Store assigned_to from API for display
            (transformedLead as any).assigned_to = apiLead.assigned_to;
            (transformedLead as any).assigned_to_username = apiLead.assigned_to_username;
            return transformedLead;
        }
        
        // Fallback to selectedLead from context
        return selectedLead;
    }, [allLeads, selectedLead, leadId]);
    
    // Update selectedLead when currentLead is found from URL
    useEffect(() => {
        if (currentLead && leadId && currentLead.id === leadId && currentLead.id !== selectedLead?.id) {
            setSelectedLead(currentLead);
        }
    }, [currentLead, leadId, selectedLead, setSelectedLead]);
    
    // Update selectedLead when currentLead changes (only once when data is loaded)
    const hasUpdatedLead = React.useRef(false);
    useEffect(() => {
        if (currentLead && currentLead.id === selectedLead?.id && !hasUpdatedLead.current) {
            // Only update if the data is actually different
            const isDifferent = 
                currentLead.name !== selectedLead.name ||
                currentLead.status !== selectedLead.status ||
                currentLead.communicationWay !== selectedLead.communicationWay ||
                currentLead.priority !== selectedLead.priority ||
                currentLead.type !== selectedLead.type;
            
            if (isDifferent) {
                setSelectedLead(currentLead);
                hasUpdatedLead.current = true;
            }
        }
    }, [currentLead, selectedLead, setSelectedLead]);
    
    // Reset the ref when selectedLead.id changes
    useEffect(() => {
        hasUpdatedLead.current = false;
    }, [selectedLead?.id]);
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, [selectedLead?.id]);

    // Helper function to convert status to translation key
    const getStatusTranslationKey = (status: string): string => {
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

    // دالة لتحويل stage إلى نص جميل
    const formatStage = (stage: string): string => {
        // Try to translate using status translation keys first
        const translationKey = getStatusTranslationKey(stage);
        const translated = t(translationKey as any);
        if (translated && translated !== translationKey) {
            return translated;
        }
        
        // Fallback to stage name as is
        return stage;
    };

    // Use currentLead instead of selectedLead for display
    const displayLead = currentLead || selectedLead;
    
    // تحويل ClientTasks إلى TimelineEntries
    const leadClientTasks = displayLead ? clientTasks.filter(ct => {
        const clientId = ct.client || ct.clientId;
        return clientId === displayLead.id;
    }) : [];

    // تصفية المكالمات للعميل المحتمل المحدد
    const leadClientCalls = displayLead ? clientCalls.filter(cc => {
        const clientId = cc.client || cc.clientId;
        return clientId === displayLead.id;
    }) : [];

    // Get last feedback from the most recent ClientTask
    const sortedClientTasks = [...leadClientTasks].sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA;
    });
    const lastClientTask = sortedClientTasks.length > 0 ? sortedClientTasks[0] : null;
    const lastFeedback = lastClientTask?.notes || '';
    
    const timelineHistory = useMemo(() => {
        if (!displayLead) return [];

        // Format Actions (ClientTasks)
        const actions = leadClientTasks.map(ct => {
            const user = users.find(u => u.id === (ct.created_by || ct.createdBy));
            const stageName = ct.stage_name || ct.stage;
            const stageConfig = stages.find(s => s.name === stageName || s.id.toString() === (ct.stage?.toString() || ''));
            const formattedStage = formatStage(stageName || '');
            
            return {
                id: `action-${ct.id}`,
                type: 'action',
                user: user?.name || ct.created_by_username || t('unknown'),
                avatar: user?.avatar || '',
                action: t('stageUpdated') || 'Stage updated',
                details: ct.notes || '',
                date: formatDateToLocal(ct.created_at || ct.createdAt),
                timestamp: new Date(ct.created_at || ct.createdAt).getTime(),
                stage: formattedStage,
                color: stageConfig?.color,
            };
        });

        // Format Calls (ClientCalls)
        const calls = leadClientCalls.map(cc => {
            const user = users.find(u => u.id === (cc.created_by || cc.createdBy));
            const callMethod = callMethods.find(cm => cm.id === (cc.call_method || cc.callMethod));
            const callMethodName = callMethod?.name || cc.call_method_name || t('call') || 'Call';
            
            // Use call_datetime if available, otherwise use created_at
            const callDate = cc.call_datetime || cc.created_at || cc.createdAt;
            const timestamp = new Date(callDate).getTime();
            
            // Format call datetime and follow-up date for display (clean, modern format)
            const formatCleanDateTime = (dateString: string | null | undefined): string => {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return '';
                    // Format as "Jan 24, 2026 at 4:58 PM" - more readable
                    const options: Intl.DateTimeFormatOptions = {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    };
                    return date.toLocaleString('en-US', options);
                } catch {
                    return '';
                }
            };
            
            const callDateTimeFormatted = formatCleanDateTime(callDate);
            const followUpDateFormatted = formatCleanDateTime(cc.follow_up_date);
            
            return {
                id: `call-${cc.id}`,
                type: 'call',
                user: user?.name || cc.created_by_username || t('unknown'),
                avatar: user?.avatar || '',
                action: t('callMade') || 'Call made',
                details: cc.notes || '', // Keep notes separate from dates
                date: formatDateToLocal(callDate),
                timestamp: timestamp,
                stage: callMethodName,
                color: callMethod?.color,
                callDatetime: callDateTimeFormatted, // Separate field for call datetime
                followUpDate: followUpDateFormatted, // Separate field for follow-up date
            };
        });

        // Format Events (ClientEvents)
        // Helper function to format values for display
        const formatValue = (value: string | null | undefined) => {
            if (!value || value === 'None') {
                return t('unassigned') || 'Unassigned';
            }
            return value;
        };
        
        // Helper function to format user values (try to get user name from ID)
        const formatUserValue = (value: string | null | undefined) => {
            if (!value || value === 'None') {
                return t('unassigned') || 'Unassigned';
            }
            // Try to find user name if value is a user ID
            const userId = parseInt(value);
            if (!isNaN(userId)) {
                const assignedUser = users.find(u => u.id === userId);
                return assignedUser?.name || value;
            }
            return value;
        };
        
        const events = clientEvents.map(ce => {
            const user = users.find(u => u.id === ce.created_by);
            
            let actionText = '';
            let eventColor = undefined;
            let translatedDetails = '';
            
            if (ce.event_type === 'status_change') {
                actionText = t('statusUpdated') || 'Status updated';
                // Try to find the status color
                const statusConfig = statuses.find(s => s.name === ce.new_value || s.id.toString() === ce.new_value);
                if (statusConfig) {
                    eventColor = statusConfig.color;
                }
                
                // Create translated description for status change
                const oldVal = formatValue(ce.old_value);
                const newVal = formatValue(ce.new_value);
                
                if (oldVal && newVal) {
                    translatedDetails = `${t('statusChangedFrom') || 'Status changed from'} ${oldVal} ${t('statusChangedTo') || 'to'} ${newVal}`;
                } else if (newVal) {
                    translatedDetails = `${t('statusChangedFrom') || 'Status changed from'} ${t('unassigned') || 'Unassigned'} ${t('statusChangedTo') || 'to'} ${newVal}`;
                }
            }
            else if (ce.event_type === 'assignment') {
                actionText = t('leadAssigned') || 'Lead assigned';
                
                // Create translated description for assignment
                const newVal = formatUserValue(ce.new_value);
                const oldVal = formatUserValue(ce.old_value);
                
                // Check if it's a bulk assignment (notes contain "Bulk assigned")
                if (ce.notes && ce.notes.toLowerCase().includes('bulk')) {
                    if (oldVal && oldVal !== newVal) {
                        translatedDetails = `${t('bulkAssignedTo') || 'Bulk assigned to'} ${newVal} (${t('was') || 'was'} ${oldVal})`;
                    } else {
                        translatedDetails = `${t('bulkAssignedTo') || 'Bulk assigned to'} ${newVal}`;
                    }
                } else {
                    if (oldVal && oldVal !== newVal) {
                        translatedDetails = `${t('assignedToAction') || 'Assigned to'} ${newVal} (${t('was') || 'was'} ${oldVal})`;
                    } else {
                        translatedDetails = `${t('assignedToAction') || 'Assigned to'} ${newVal}`;
                    }
                }
            }
            else if (ce.event_type === 'edit') {
                actionText = t('leadEdited') || 'Lead edited';
                // For edit events, use the notes if available, otherwise create a generic description
                translatedDetails = ce.notes || '';
            }
            else {
                actionText = ce.event_type;
                translatedDetails = ce.notes || '';
            }

            return {
                id: `event-${ce.id}`,
                type: 'event',
                user: user?.name || ce.created_by_username || t('unknown'),
                avatar: user?.avatar || '',
                action: actionText,
                details: translatedDetails || ce.notes || '',
                date: formatDateToLocal(ce.created_at),
                timestamp: new Date(ce.created_at).getTime(),
                oldValue: formatValue(ce.old_value),
                newValue: formatValue(ce.new_value),
                color: eventColor,
            };
        });

        // Format SMS messages (Twilio)
        const smsEntries = (leadSMSMessages as any[]).map((sms) => {
            const user = users.find(u => u.id === sms.created_by);
            return {
                id: `sms-${sms.id}`,
                type: 'sms' as const,
                user: user?.name || sms.created_by_username || t('unknown'),
                avatar: user?.avatar || '',
                action: t('smsSent') || 'SMS sent',
                details: sms.body || '',
                date: formatDateToLocal(sms.created_at),
                timestamp: new Date(sms.created_at).getTime(),
                stage: sms.phone_number,
            };
        });

        // Combine and sort by date descending
        return [...actions, ...calls, ...events, ...smsEntries].sort((a, b) => b.timestamp - a.timestamp);
    }, [displayLead, leadClientTasks, leadClientCalls, clientEvents, leadSMSMessages, users, t, stages, statuses, callMethods]);

    if (!displayLead) {
        return <PageWrapper title={t('leads')}><div>{t('leadNotFound')}</div></PageWrapper>;
    }

    if (loading) {
        return (
            <PageWrapper title={displayLead.name}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper 
            title={
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            window.history.pushState({}, '', '/leads');
                            setCurrentPage('Leads');
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title={t('back') || 'Back'}
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span>{displayLead.name}</span>
                </div>
            }
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button 
                        variant="secondary"
                        onClick={() => {
                            if (displayLead) {
                                setSelectedLeadForDeal(displayLead.id);
                                window.history.pushState({}, '', '/create-deal');
                                setCurrentPage('CreateDeal');
                            }
                        }}
                    >
                        <DealIcon className="w-4 h-4"/> {t('addDeal')}
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={() => {
                            if (displayLead) {
                                setEditingLead(displayLead);
                                window.history.pushState({}, '', '/edit-lead');
                                setCurrentPage('EditLead');
                            }
                        }}
                    >
                        <EditIcon className="w-4 h-4"/> {t('editClient')}
                    </Button>
                    <Button onClick={() => setIsAddActionModalOpen(true)}><PlusIcon className="w-4 h-4"/> {t('add_action')}</Button>
                    <Button variant="secondary" onClick={() => setIsAddCallModalOpen(true)}><PhoneIcon className="w-4 h-4"/> {t('addCall') || 'Add Call'}</Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-3 dark:border-gray-700">{t('contactInformation') || 'Contact Information'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('phoneNumbers') || 'Phone Numbers'}</label>
                            <div className="mt-2 space-y-2">
                                {displayLead.phoneNumbers && displayLead.phoneNumbers.length > 0 ? (
                                    displayLead.phoneNumbers.map((pn) => (
                                        <div key={pn.id} className={`grid ${language === 'ar' ? 'grid-cols-[1fr_auto_auto_auto_auto]' : 'grid-cols-[auto_auto_auto_auto_1fr]'} items-center gap-2`}>
                                            {language === 'ar' ? (
                                                <>
                                                    <div className="min-w-0">
                                                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                                                            {pn.phone_number}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {pn.phone_type === 'mobile' ? t('mobile') : 
                                                             pn.phone_type === 'home' ? t('home') : 
                                                             pn.phone_type === 'work' ? t('work') : 
                                                             pn.phone_type === 'other' ? t('other') : 
                                                             pn.phone_type}
                                                        </p>
                                                    </div>
                                                    <div className="w-16 text-right">
                                                        {pn.is_primary ? (
                                                            <span className="text-xs text-primary whitespace-nowrap">({t('primary') || 'Primary'})</span>
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
                                                        title={t('openWhatsApp') || 'Open WhatsApp'}
                                                    >
                                                        <WhatsappIcon className="w-5 h-5"/>
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSendSMSModal({ phone: pn.phone_number })}
                                                        className="inline-flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                        title={t('sendSms') || 'Send SMS'}
                                                    >
                                                        <SmsIcon className="w-5 h-5"/>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <a 
                                                        href={`https://wa.me/${pn.phone_number.replace(/[^0-9]/g, '')}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="inline-flex items-center justify-center w-8 h-8 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                        title={t('openWhatsApp') || 'Open WhatsApp'}
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
                                                    <button
                                                        type="button"
                                                        onClick={() => setSendSMSModal({ phone: pn.phone_number })}
                                                        className="inline-flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                        title={t('sendSms') || 'Send SMS'}
                                                    >
                                                        <SmsIcon className="w-5 h-5"/>
                                                    </button>
                                                    <div className="w-16 text-left">
                                                        {pn.is_primary ? (
                                                            <span className="text-xs text-primary whitespace-nowrap">({t('primary') || 'Primary'})</span>
                                                        ) : (
                                                            <span className="text-xs whitespace-nowrap">&nbsp;</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                                                            {pn.phone_number}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {pn.phone_type === 'mobile' ? t('mobile') : 
                                                             pn.phone_type === 'home' ? t('home') : 
                                                             pn.phone_type === 'work' ? t('work') : 
                                                             pn.phone_type === 'other' ? t('other') : 
                                                             pn.phone_type}
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className={`grid ${language === 'ar' ? 'grid-cols-[1fr_auto_auto_auto_auto]' : 'grid-cols-[auto_auto_auto_auto_1fr]'} items-center gap-2`}>
                                        {language === 'ar' ? (
                                            <>
                                                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                                                    {displayLead.phone || '-'}
                                                </p>
                                                <div className="w-16"></div>
                                                {displayLead.phone && (
                                                    <>
                                                        <a 
                                                            href={`tel:${displayLead.phone.replace(/[^0-9+]/g, '')}`}
                                                            className="inline-flex items-center justify-center w-8 h-8 text-primary hover:opacity-80 transition-opacity flex-shrink-0"
                                                            title={t('call') || 'Call'}
                                                        >
                                                            <PhoneIcon className="w-5 h-5"/>
                                                        </a>
                                                        <a 
                                                            href={`https://wa.me/${displayLead.phone.replace(/[^0-9]/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="inline-flex items-center justify-center w-8 h-8 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                            title={t('openWhatsApp') || 'Open WhatsApp'}
                                                        >
                                                            <WhatsappIcon className="w-5 h-5"/>
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSendSMSModal({ phone: displayLead.phone! })}
                                                            className="inline-flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                            title={t('sendSms') || 'Send SMS'}
                                                        >
                                                            <SmsIcon className="w-5 h-5"/>
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {displayLead.phone && (
                                                    <>
                                                        <a 
                                                            href={`https://wa.me/${displayLead.phone.replace(/[^0-9]/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="inline-flex items-center justify-center w-8 h-8 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                            title={t('openWhatsApp') || 'Open WhatsApp'}
                                                        >
                                                            <WhatsappIcon className="w-5 h-5"/>
                                                        </a>
                                                        <a 
                                                            href={`tel:${displayLead.phone.replace(/[^0-9+]/g, '')}`}
                                                            className="inline-flex items-center justify-center w-8 h-8 text-primary hover:opacity-80 transition-opacity flex-shrink-0"
                                                            title={t('call') || 'Call'}
                                                        >
                                                            <PhoneIcon className="w-5 h-5"/>
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSendSMSModal({ phone: displayLead.phone! })}
                                                            className="inline-flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0"
                                                            title={t('sendSms') || 'Send SMS'}
                                                        >
                                                            <SmsIcon className="w-5 h-5"/>
                                                        </button>
                                                    </>
                                                )}
                                                <div className="w-16"></div>
                                                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                                                    {displayLead.phone || '-'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('communicationWay')}</label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">
                                {(displayLead as any).communication_way_name || displayLead.communicationWay || '-'}
                            </p>
                        </div>
                        {(() => {
                            const assignedToId = (displayLead as any).assigned_to || displayLead.assignedTo;
                            const assignedToUsername = (displayLead as any).assigned_to_username;
                            
                            if (assignedToId) {
                                const assignedUser = users.find(u => u.id === assignedToId);
                                const displayName = assignedUser?.name || 
                                                   assignedToUsername || 
                                                   assignedUser?.username || 
                                                   t('unknown');
                                
                                return (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('assignedTo')}</label>
                                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">{displayName}</p>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </Card>
                <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-3 dark:border-gray-700">{t('status')}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('status')}</label>
                            <div className="mt-1">
                                {(() => {
                                    // Use status_name from API if available, otherwise find by ID or name
                                    const statusName = (displayLead as any).status_name || 
                                        (displayLead.status ? statuses.find(s => s.id.toString() === displayLead.status.toString() || s.name === displayLead.status)?.name : null);
                                    
                                    // Find current status config
                                    const currentStatusConfig = statuses.find(s => 
                                        s.name === statusName || 
                                        s.id.toString() === (displayLead.status?.toString() || '')
                                    );
                                    
                                    // Get available statuses (non-hidden)
                                    const availableStatuses = statuses.filter(s => !s.isHidden);
                                    
                                    const isUpdating = updatingLeadId === displayLead.id;
                                    
                                    // Convert hex to RGB for background opacity
                                    const hexToRgb = (hex: string) => {
                                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                        return result ? {
                                            r: parseInt(result[1], 16),
                                            g: parseInt(result[2], 16),
                                            b: parseInt(result[3], 16)
                                        } : null;
                                    };
                                    
                                    if (!statusName || !currentStatusConfig) {
                                        return (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                -
                                            </span>
                                        );
                                    }
                                    
                                    return (
                                        <StatusDropdown
                                            leadId={displayLead.id}
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
                        </div>
                        {displayLead.lastStage && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('lastStage')}</label>
                                <div className="mt-1">
                                    {(() => {
                                        const stageName = displayLead.lastStage;
                                        const stageConfig = stages.find(s => s.name === stageName || s.id.toString() === stageName);
                                        const stageColor = stageConfig?.color || '#808080';
                                        
                                        // Convert hex to RGB for background opacity
                                        const hexToRgb = (hex: string) => {
                                            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                            return result ? {
                                                r: parseInt(result[1], 16),
                                                g: parseInt(result[2], 16),
                                                b: parseInt(result[3], 16)
                                            } : null;
                                        };
                                        
                                        const rgb = hexToRgb(stageColor);
                                        const bgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` : undefined;
                                        const textColor = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : undefined;
                                        
                                        return (
                                            <span 
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                                                style={{ 
                                                    backgroundColor: bgColor || (theme === 'dark' ? '#1e293b' : '#f1f5f9'),
                                                    color: textColor || (theme === 'dark' ? '#e2e8f0' : '#475569'),
                                                    border: `1px solid ${textColor || 'transparent'}`
                                                }}
                                            >
                                                {formatStage(stageName)}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('priority')}</label>
                            <div className="mt-1">
                                {(() => {
                                    const priority = displayLead.priority?.toLowerCase() || '';
                                    return (
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                            priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        }`}>
                                            {priority === 'high' ? t('high') : 
                                             priority === 'medium' ? t('medium') : 
                                             priority === 'low' ? t('low') : 
                                             displayLead.priority || '-'}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('type')}</label>
                            <div className="mt-1">
                                {(() => {
                                    const type = displayLead.type?.toLowerCase() || '';
                                    return (
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                            type === 'fresh' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                            type === 'cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        }`}>
                                            {type === 'fresh' ? t('fresh') : 
                                             type === 'cold' ? t('cold') : 
                                             displayLead.type || '-'}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('source') || 'Source'}</label>
                            <div className="mt-1">
                                {(() => {
                                    const source = displayLead.source || 'manual';
                                    if (source === 'meta_lead_form') {
                                        return (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                <FacebookIcon className="w-4 h-4" />
                                                {t('metaLeadForm') || 'Meta'}
                                            </span>
                                        );
                                    } else if (source === 'whatsapp') {
                                        return (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                <WhatsappIcon className="w-4 h-4" />
                                                {t('whatsappSource') || 'WhatsApp'}
                                            </span>
                                        );
                                    } else if (source === 'tiktok') {
                                        return (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                {t('tiktokSource') || 'TikTok'}
                                            </span>
                                        );
                                    }
                                    return (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                            {t('manualSource') || 'Manual'}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                        {displayLead.campaign && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('campaign') || 'Campaign'}</label>
                                <div className="mt-1">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                        {(displayLead as any).campaign_name || `Campaign #${displayLead.campaign}`}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
                <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-3 dark:border-gray-700">{t('financialInformation') || 'Financial Information'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('budget')}</label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">
                                {displayLead.budget && displayLead.budget > 0 ? (
                                    <span className="text-lg font-semibold">
                                        {(() => {
                                            const num = Number(displayLead.budget);
                                            const formatted = num.toLocaleString('en-US', { 
                                                minimumFractionDigits: 0, 
                                                maximumFractionDigits: 2 
                                            });
                                            // Remove trailing zeros after decimal point
                                            return formatted.replace(/\.0+$/, '');
                                        })()}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 dark:text-gray-500">-</span>
                                )}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('createdAt')}</label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">
                                {(displayLead as any).created_at ? formatDateToLocal((displayLead as any).created_at) : 
                                 displayLead.createdAt ? formatDateToLocal(displayLead.createdAt) : '-'}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('lastFeedback')}</label>
                            <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                {lastFeedback || displayLead.lastFeedback || (displayLead as any).last_feedback || '-'}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="mt-6">
                <h2 className="text-xl font-bold mb-4">{t('timeline')}</h2>
                <Timeline history={timelineHistory} />
            </div>

            {sendSMSModal && displayLead && (
                <SendSMSModal
                    isOpen={!!sendSMSModal}
                    onClose={() => setSendSMSModal(null)}
                    leadId={displayLead.id}
                    phoneNumber={sendSMSModal.phone}
                    onSent={() => refetchLeadSMS()}
                />
            )}
        </PageWrapper>
    )
}
