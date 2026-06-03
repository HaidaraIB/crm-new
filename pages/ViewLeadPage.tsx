

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, Timeline, EditIcon, PlusIcon, Loader, ArrowLeftIcon, PhoneIcon, FacebookIcon, WhatsappIcon, LeadStatusDropdown, LeadStatusBadge, LeadContactPhoneList } from '../components/index';
import SendSMSModal from '../components/modals/SendSMSModal';
import SendWhatsAppModal from '../components/modals/SendWhatsAppModal';
import { formatDateToLocal, formatDateTimeToLocal, formatTimelineDate, formatTimelineDetailDateTime } from '../utils/dateUtils';
import { formatLeadBudget } from '../utils/budgetRange';
import { useUsers, useClientTasks, useStatuses, useLeads, useUpdateLead, useClientEvents, useStages, useClientCalls, useClientVisits, useClientFieldVisits, useCallMethods, useVisitTypes, useLeadSMSMessages, useLeadWhatsAppMessages, useChannels } from '../hooks/useQueries';
import { useQuery } from '@tanstack/react-query';
import { getConnectedAccountAPI, getPbxSettingsAPI, pbxDialAPI, getPbxDialStatusAPI } from '../services/api';
import { getLocalizedApiErrorMessage, localizePbxResultMessage } from '../utils/apiErrorMessage';
import { useFieldVisitAllowed } from '../hooks/useFieldVisitAllowed';
import { LeadLocationMapPicker } from '../components/LeadLocationMapPicker';
import {
    clientLocationEventTranslationKey,
    parseLeadCoordinate,
} from '../utils/leadLocation';
import { BriefcaseIcon, MapPinIcon } from '../components/icons';
import { Lead } from '../types';
import { mapApiLeadToDisplayLead } from '../utils/normalizeLead';
import {
    formatTimelineEventValuePair,
    getEditFieldLabel,
    getTimelineEventAction,
    localizeTimelineEventNotes,
} from '../utils/timelineEvents';
import { translations } from '../constants';
import { MarqueeText } from '../components/MarqueeText';

export const ViewLeadPage = () => {
    const { t, selectedLead, setIsAddActionModalOpen, setIsAddCallModalOpen, setIsAddVisitModalOpen, setIsAddFieldVisitModalOpen, setEditingLead, setIsEditLeadModalOpen, setCurrentPage, setSelectedLeadForDeal, setSelectedLead, currentUser, theme, language, setSuccessMessage, setIsSuccessModalOpen, setAlertMessage, setAlertVariant, setIsAlertModalOpen } = useAppContext();
    
    const { data: pbxSettings } = useQuery({
        queryKey: ['pbxSettings'],
        queryFn: getPbxSettingsAPI,
    });
    const pbxEnabled = !!pbxSettings?.is_enabled;

    const [updatingLeadId, setUpdatingLeadId] = React.useState<number | null>(null);
    const [sendSMSModal, setSendSMSModal] = React.useState<{ phone: string } | null>(null);
    const [sendWhatsAppModal, setSendWhatsAppModal] = React.useState<{ phone: string } | null>(null);
    const [updatingMetaQualification, setUpdatingMetaQualification] = React.useState(false);
    
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
                budget_max: lead.budget_max ?? lead.budgetMax ?? null,
                assignedTo: lead.assigned_to || 0,
                type: lead.type || '',
                communicationWay: lead.communication_way || '',
                priority: lead.priority || '',
                status: status.id,
                company: companyId,
                lead_company_name: lead.lead_company_name ?? lead.leadCompanyName ?? null,
                profession: lead.profession ?? null,
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

    const { data: clientVisitsResponse } = useClientVisits();
    const clientVisits = clientVisitsResponse?.results || [];

    const fieldVisitsAllowed = useFieldVisitAllowed();

    const { data: clientFieldVisitsResponse } = useClientFieldVisits({
        enabled: fieldVisitsAllowed,
    });
    const clientFieldVisits = clientFieldVisitsResponse?.results || [];
    
    const { data: callMethodsData } = useCallMethods();
    const callMethods = Array.isArray(callMethodsData) 
        ? callMethodsData 
        : (callMethodsData?.results || []);

    const { data: visitTypesData } = useVisitTypes();
    const visitTypes = Array.isArray(visitTypesData)
        ? visitTypesData
        : (visitTypesData?.results || []);
    
    const { data: clientEventsResponse } = useClientEvents(leadId);
    const clientEvents = clientEventsResponse?.results || [];
    
    const { data: leadSMSMessages = [], refetch: refetchLeadSMS } = useLeadSMSMessages(leadId ?? undefined);
    const { data: leadWhatsAppMessages = [], refetch: refetchLeadWhatsApp } = useLeadWhatsAppMessages(leadId ?? undefined);
    
    const { data: statusesData } = useStatuses();
    // Handle both array response and object with results property
    const statuses = Array.isArray(statusesData) 
        ? statusesData 
        : (statusesData?.results || []);

    const { data: channelsData } = useChannels();
    const channels = Array.isArray(channelsData)
        ? channelsData
        : (channelsData?.results || []);
    
    const { data: stagesData } = useStages();
    const stages = Array.isArray(stagesData) 
        ? stagesData 
        : (stagesData?.results || []);
    
    // Fetch leads to get updated data
    const { data: leadsResponse, refetch: refetchLeads } = useLeads();
    const allLeads = leadsResponse?.results || [];
    const updateLeadMutation = useUpdateLead();
    
    // Find the current lead from the fetched leads list (most up-to-date)
    const currentLead = useMemo(() => {
        // First try to find by leadId from URL
        if (leadId) {
            const apiLead = allLeads.find((l: any) => l.id === leadId);
            if (apiLead) {
                return mapApiLeadToDisplayLead(apiLead);
            }
        }
        
        // Fallback to selectedLead if no leadId from URL
        if (!selectedLead?.id) return selectedLead;
        
        // Find lead from API data
        const apiLead = allLeads.find((l: any) => l.id === selectedLead.id);
        if (apiLead) {
            return mapApiLeadToDisplayLead(apiLead);
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

    const formatPbxCallSummary = (cc: Record<string, unknown>): string => {
        const parts: string[] = [];
        const direction = (cc.pbx_direction ?? cc.pbxDirection) as string | undefined;
        if (direction === 'inbound') parts.push(t('inbound'));
        else if (direction === 'outbound') parts.push(t('outbound'));
        else if (direction === 'internal') parts.push(t('internal'));

        const disposition = (cc.pbx_disposition ?? cc.pbxDisposition) as string | undefined;
        if (disposition === 'answered') parts.push(t('answered'));
        else if (disposition === 'no_answer') parts.push(t('missed'));
        else if (disposition === 'busy') parts.push(t('busy'));
        else if (disposition === 'failed') parts.push(t('callFailed'));

        const duration = (cc.pbx_duration_sec ?? cc.pbxDurationSec) as number | undefined;
        if (duration) parts.push(`${duration}s`);

        const legacyNotes = (cc.notes as string) || '';
        return parts.length ? parts.join(' · ') : legacyNotes;
    };

    const pollPbxDialStatus = async (commandId: number) => {
        for (let attempt = 0; attempt < 15; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            try {
                const status = await getPbxDialStatusAPI(commandId);
                if (status.status === 'completed') {
                    setSuccessMessage(t('pbxDialCompleted'));
                    setIsSuccessModalOpen(true);
                    return;
                }
                if (status.status === 'failed') {
                    setAlertMessage(
                        localizePbxResultMessage(status.result_message, t) || t('pbxDialFailed')
                    );
                    setAlertVariant('error');
                    setIsAlertModalOpen(true);
                    return;
                }
            } catch {
                // keep polling until timeout
            }
        }
    };

    const handlePbxDial = async (phone: string) => {
        if (!displayLead?.id) return;
        try {
            const result = await pbxDialAPI({ client: displayLead.id, phone_number: phone });
            setSuccessMessage(t('pbxDialQueued'));
            setIsSuccessModalOpen(true);
            if (result?.id) {
                void pollPbxDialStatus(result.id);
            }
        } catch (e: any) {
            setAlertMessage(getLocalizedApiErrorMessage(e, t, 'pbxDialFailed'));
            setAlertVariant('error');
            setIsAlertModalOpen(true);
        }
    };

    const integrationAccountId = displayLead?.integration_account ?? (displayLead as any)?.integrationAccount ?? null;
    const isMetaLead = (displayLead?.source || (displayLead as any)?.source) === 'meta_lead_form';

    const { data: metaIntegrationAccount } = useQuery({
        queryKey: ['integrationAccount', integrationAccountId],
        queryFn: () => getConnectedAccountAPI(integrationAccountId as number),
        enabled: isMetaLead && !!integrationAccountId,
    });
    const metaPixelConfigured = Boolean(metaIntegrationAccount?.metadata?.pixel_id);
    const metaLeadgenId = displayLead?.metaLeadgenId ?? (displayLead as any)?.meta_leadgen_id ?? null;
    const metaQualificationStatus = displayLead?.metaQualificationStatus ?? (displayLead as any)?.meta_qualification_status ?? null;
    const metaQualificationSentAt = displayLead?.metaQualificationSentAt ?? (displayLead as any)?.meta_qualification_sent_at ?? null;
    const metaQualificationError = displayLead?.metaQualificationError ?? (displayLead as any)?.meta_qualification_error ?? null;
    const metaQualificationDisabled = !metaLeadgenId || !metaPixelConfigured;

    const metaQualificationErrorText = useMemo(() => {
        if (!metaQualificationError) return null;
        const key = metaQualificationError as keyof typeof translations.en;
        if (key in translations.en) {
            return t(key);
        }
        return metaQualificationError;
    }, [metaQualificationError, t, language]);

    const handleMetaQualificationChange = async (newStatus: '' | 'qualified' | 'unqualified') => {
        if (!displayLead?.id) return;
        const lead = allLeads.find((l: any) => l.id === displayLead.id) ?? displayLead;
        const companyId = (lead as any).company?.id || (lead as any).company || (lead as any).company_id;
        if (!companyId) {
            alert(t('errorUpdatingLead') || 'Failed to update lead.');
            return;
        }
        setUpdatingMetaQualification(true);
        try {
            const updateData: Record<string, unknown> = {
                name: lead.name,
                phone: (lead as any).phone_number || lead.phone || '',
                budget: lead.budget || 0,
                budget_max: (lead as any).budget_max ?? lead.budgetMax ?? null,
                assignedTo: (lead as any).assigned_to || 0,
                type: lead.type || '',
                communicationWay: (lead as any).communication_way || '',
                priority: lead.priority || '',
                status: (lead as any).status?.id ?? (lead as any).status,
                company: companyId,
                lead_company_name: (lead as any).lead_company_name ?? lead.leadCompanyName ?? null,
                profession: lead.profession ?? null,
                meta_qualification_status: newStatus === '' ? null : newStatus,
            };
            if ((lead as any).phone_numbers?.length) {
                updateData.phoneNumbers = (lead as any).phone_numbers;
            }
            await updateLeadMutation.mutateAsync({ id: displayLead.id, data: updateData });
            await refetchLeads();
        } catch (error) {
            console.error('Error updating Meta qualification:', error);
            alert(t('errorUpdatingLead') || 'Failed to update lead. Please try again.');
        } finally {
            setUpdatingMetaQualification(false);
        }
    };
    
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

    const leadClientVisits = displayLead ? clientVisits.filter((cv: { client?: number; clientId?: number }) => {
        const clientId = cv.client || cv.clientId;
        return clientId === displayLead.id;
    }) : [];

    const leadClientFieldVisits = displayLead ? clientFieldVisits.filter((cv: { client?: number; clientId?: number }) => {
        const clientId = cv.client || cv.clientId;
        return clientId === displayLead.id;
    }) : [];

    const leadLocationLat = displayLead
        ? parseLeadCoordinate(
              (displayLead as Lead).locationLatitude ?? (displayLead as any).location_latitude
          )
        : null;
    const leadLocationLng = displayLead
        ? parseLeadCoordinate(
              (displayLead as Lead).locationLongitude ?? (displayLead as any).location_longitude
          )
        : null;
    const hasLeadLocation = leadLocationLat != null && leadLocationLng != null;

    const showVisitActions =
        currentUser?.company?.specialization === 'real_estate' ||
        currentUser?.company?.specialization === 'services' ||
        currentUser?.company?.specialization === 'medical';

    const timelineHistory = useMemo(() => {
        if (!displayLead) return [];

        const lang = (language === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
        const formatDetailDateTime = (dateString: string | null | undefined) =>
            formatTimelineDetailDateTime(dateString, lang);

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
                action: t('stageUpdated'),
                details: ct.notes || '',
                date: formatTimelineDate(ct.created_at || ct.createdAt, lang),
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

            const callDateTimeFormatted = formatDetailDateTime(callDate);
            const followUpDateFormatted = formatDetailDateTime(cc.follow_up_date);
            const isPbxCall = cc.source === 'pbx';
            const recordingUrl = (cc.pbx_recording_url ?? cc.pbxRecordingUrl) as string | undefined;

            return {
                id: `call-${cc.id}`,
                type: 'call',
                user: user?.name || cc.created_by_username || t('unknown'),
                avatar: user?.avatar || '',
                action: isPbxCall
                    ? formatPbxCallSummary(cc)
                    : t('callMade'),
                details: isPbxCall ? '' : (cc.notes || ''),
                date: formatTimelineDate(callDate, lang),
                timestamp: timestamp,
                stage: isPbxCall ? t('pbxCallSource') : callMethodName,
                color: isPbxCall ? '#4f46e5' : callMethod?.color,
                callDatetime: callDateTimeFormatted,
                followUpDate: followUpDateFormatted,
                recordingUrl: recordingUrl || undefined,
            };
        });

        const visits = leadClientVisits.map((cv: Record<string, unknown>) => {
            const user = users.find(u => u.id === (cv.created_by || cv.createdBy));
            const vt = visitTypes.find((x: { id: number }) => x.id === (cv.visit_type as number));
            const visitTypeName = vt?.name || (cv.visit_type_name as string) || (t('visit') as string) || 'Visit';

            const visitDateRaw = (cv.visit_datetime as string) || (cv.created_at as string) || (cv.createdAt as string);
            const timestamp = new Date(visitDateRaw).getTime();

            const visitDt = formatDetailDateTime(visitDateRaw);
            const upcoming = formatDetailDateTime(cv.upcoming_visit_date as string | undefined);

            return {
                id: `visit-${cv.id}`,
                type: 'visit' as const,
                user: user?.name || (cv.created_by_username as string) || t('unknown'),
                avatar: user?.avatar || '',
                action: t('visitLogged'),
                details: (cv.summary as string) || '',
                date: formatTimelineDate(visitDateRaw, lang),
                timestamp,
                stage: visitTypeName,
                color: vt?.color,
                callDatetime: visitDt,
                followUpDate: upcoming || undefined,
            };
        });

        const fieldVisits = fieldVisitsAllowed
            ? leadClientFieldVisits.map((cv: Record<string, unknown>) => {
            const user = users.find(u => u.id === (cv.created_by || cv.createdBy));
            const visitDateRaw = (cv.visit_datetime as string) || (cv.created_at as string) || (cv.createdAt as string);
            const timestamp = new Date(visitDateRaw).getTime();

            const visitDt = formatDetailDateTime(visitDateRaw);
            const upcoming = formatDetailDateTime(cv.upcoming_visit_date as string | undefined);

            return {
                id: `field-visit-${cv.id}`,
                type: 'field_visit' as const,
                user: user?.name || (cv.created_by_username as string) || t('unknown'),
                avatar: user?.avatar || '',
                action: t('fieldVisitLogged'),
                details: (cv.summary as string) || '',
                date: formatTimelineDate(visitDateRaw, lang),
                timestamp,
                stage: t('fieldVisit'),
                callDatetime: visitDt,
                followUpDate: upcoming || undefined,
                locationPhotoUrl:
                    (cv.client_location_photo_url as string | undefined) ||
                    (cv.clientLocationPhotoUrl as string | undefined) ||
                    undefined,
            };
        })
            : [];

        // Format Events (ClientEvents)
        const eventFormatCtx = { t, users, statuses, channels };

        const events = clientEvents.map(ce => {
            const user = users.find(u => u.id === ce.created_by);
            const actionText =
                ce.event_type === 'location_update'
                    ? t(clientLocationEventTranslationKey(ce.notes))
                    : getTimelineEventAction(ce.event_type, t, ce.notes, ce.old_value, ce.new_value);

            const editFieldLabel =
                ce.event_type === 'edit'
                    ? getEditFieldLabel(ce.notes, t, ce.old_value, ce.new_value)
                    : undefined;

            let eventColor: string | undefined;
            if (ce.event_type === 'status_change') {
                const statusConfig = statuses.find(
                    (s) => s.name === ce.new_value || s.id.toString() === ce.new_value
                );
                if (statusConfig) eventColor = statusConfig.color;
            }

            const { oldFormatted, newFormatted } = formatTimelineEventValuePair(
                ce.old_value,
                ce.new_value,
                eventFormatCtx,
                ce.event_type,
                ce.notes
            );

            let translatedDetails = '';
            if (ce.event_type === 'location_update') {
                translatedDetails = '';
            } else if (ce.event_type === 're_assignment') {
                const hoursMatch = ce.notes?.match(/(\d+)\s*ساعة/);
                const hours = hoursMatch?.[1] || String(currentUser?.company?.re_assign_hours ?? 24);
                translatedDetails = t('autoReassignedFromTo')
                    .replace('{from}', oldFormatted || t('unassigned'))
                    .replace('{to}', newFormatted || t('unassigned'))
                    .replace('{hours}', hours);
            } else {
                translatedDetails = localizeTimelineEventNotes(ce.notes, ce.event_type, t);
            }

            const showValuePair =
                ce.event_type !== 'location_update' &&
                (oldFormatted != null || newFormatted != null);
            const suppressDetailsWithPair =
                showValuePair &&
                ['edit', 'status_change', 'assignment', 'created'].includes(ce.event_type);
            const detailsOnly = translatedDetails && !suppressDetailsWithPair;

            return {
                id: `event-${ce.id}`,
                type: ce.event_type === 'location_update' ? 'location_update' as const : 'event',
                user: user?.name || ce.created_by_username || t('unknown'),
                avatar: user?.avatar || '',
                action: actionText,
                fieldLabel: editFieldLabel || undefined,
                details: detailsOnly ? translatedDetails : '',
                date: formatTimelineDate(ce.created_at, lang),
                timestamp: new Date(ce.created_at).getTime(),
                oldValue: ce.event_type === 'location_update'
                    ? (ce.old_value || undefined)
                    : oldFormatted,
                newValue: ce.event_type === 'location_update'
                    ? (ce.new_value || undefined)
                    : newFormatted,
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
                action: t('smsSent'),
                details: sms.body || '',
                date: formatTimelineDate(sms.created_at, lang),
                timestamp: new Date(sms.created_at).getTime(),
                stage: sms.phone_number,
            };
        });

        // Format WhatsApp messages
        const waEntries = (leadWhatsAppMessages as any[]).map((wa) => {
            const user = users.find(u => u.id === wa.created_by);
            const dir = wa.direction === 'outbound' ? t('whatsappSent') : t('whatsappReceived');
            return {
                id: `wa-${wa.id}`,
                type: 'whatsapp' as const,
                user: user?.name || wa.created_by_username || t('unknown'),
                avatar: user?.avatar || '',
                action: dir,
                details: wa.body || '',
                date: formatTimelineDate(wa.created_at, lang),
                timestamp: new Date(wa.created_at).getTime(),
                stage: wa.phone_number,
            };
        });

        return [...actions, ...calls, ...visits, ...fieldVisits, ...events, ...smsEntries, ...waEntries];
    }, [displayLead, leadClientTasks, leadClientCalls, leadClientVisits, leadClientFieldVisits, clientEvents, leadSMSMessages, leadWhatsAppMessages, users, t, stages, statuses, channels, callMethods, visitTypes, fieldVisitsAllowed, language, currentUser?.company?.re_assign_hours]);

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
                <div className="flex min-w-0 w-full items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            window.history.pushState({}, '', '/leads');
                            setCurrentPage('Leads');
                        }}
                        className="shrink-0 rounded-md p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={t('back') || 'Back'}
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <MarqueeText
                        text={displayLead.name}
                        className="min-w-0 flex-1"
                        contentClassName="text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg md:text-xl"
                    />
                </div>
            }
            actions={
                <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-end gap-2 lg:flex-nowrap">
                    <Button
                        variant="secondary"
                        type="button"
                        className="w-full sm:w-auto shrink-0"
                        onClick={() => {
                            if (!displayLead) return;
                            setEditingLead(displayLead);
                            window.history.pushState({}, '', '/edit-lead');
                            setCurrentPage('EditLead');
                        }}
                    >
                        <span className="flex items-center gap-2 rtl:flex-row-reverse whitespace-nowrap">
                            <EditIcon className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                            {t('editClient')}
                        </span>
                    </Button>
                    <Button
                        variant="secondary"
                        type="button"
                        className="w-full sm:w-auto shrink-0"
                        onClick={() => {
                            if (!displayLead) return;
                            setSelectedLeadForDeal(displayLead.id);
                            window.history.pushState({}, '', '/create-deal');
                            setCurrentPage('CreateDeal');
                        }}
                    >
                        <span className="flex items-center gap-2 rtl:flex-row-reverse whitespace-nowrap">
                            <BriefcaseIcon className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                            {t('addDeal')}
                        </span>
                    </Button>
                    <Button
                        variant="secondary"
                        type="button"
                        className="w-full sm:w-auto shrink-0"
                        onClick={() => setIsAddCallModalOpen(true)}
                    >
                        <span className="flex items-center gap-2 rtl:flex-row-reverse whitespace-nowrap">
                            <PhoneIcon className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                            {t('addCall') || 'Add Call'}
                        </span>
                    </Button>
                    {showVisitActions && (
                        <Button
                            variant="secondary"
                            type="button"
                            className="w-full sm:w-auto shrink-0"
                            onClick={() => setIsAddVisitModalOpen(true)}
                        >
                            <span className="flex items-center gap-2 rtl:flex-row-reverse whitespace-nowrap">
                                <MapPinIcon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                {t('addVisit') || 'Add visit'}
                            </span>
                        </Button>
                    )}
                    {fieldVisitsAllowed && (
                    <Button
                        variant="secondary"
                        type="button"
                        className="w-full sm:w-auto shrink-0"
                        onClick={() => setIsAddFieldVisitModalOpen(true)}
                    >
                        <span className="flex items-center gap-2 rtl:flex-row-reverse whitespace-nowrap">
                            <MapPinIcon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            {t('addFieldVisit')}
                        </span>
                    </Button>
                    )}
                    <Button onClick={() => setIsAddActionModalOpen(true)} className="w-full sm:w-auto shrink-0">
                        <PlusIcon className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">{t('add_action')}</span>
                    </Button>
                </div>
            }
        >
            <div className="min-w-0 overflow-x-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-3 dark:border-gray-700">{t('contactInformation') || 'Contact Information'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('leadCompanyName')}</label>
                            <p className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">{(displayLead.leadCompanyName ?? (displayLead as any).lead_company_name) || '—'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('profession')}</label>
                            <p className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">{(displayLead.profession && String(displayLead.profession).trim()) ? displayLead.profession : '—'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('residence')}</label>
                            <p className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">{((displayLead as Lead).residence && String((displayLead as Lead).residence).trim()) ? (displayLead as Lead).residence : '—'}</p>
                        </div>
                        {hasLeadLocation && (
                            <div className="overflow-hidden md:col-span-1">
                                <LeadLocationMapPicker
                                    latitude={leadLocationLat}
                                    longitude={leadLocationLng}
                                    onChange={() => {}}
                                    readOnly
                                />
                            </div>
                        )}
                        {(displayLead as Lead).patientFileNumber != null && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('patientFileNumber')}</label>
                                <p className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">{(displayLead as Lead).patientFileNumber ?? (displayLead as any).patient_file_number}</p>
                            </div>
                        )}
                        {currentUser?.company?.specialization === 'real_estate' && (
                            <div className="md:col-span-1 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                    {t('leadInventoryInterest') || 'Property interest'}
                                </p>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('interestedDeveloper') || 'Developer'}</label>
                                    <p className="mt-1 text-base font-medium text-gray-900 dark:text-gray-100">
                                        {((displayLead as Lead).interestedDeveloperName ?? (displayLead as any).interested_developer_name) || '—'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('interestedProject') || 'Project'}</label>
                                    <p className="mt-1 text-base font-medium text-gray-900 dark:text-gray-100">
                                        {((displayLead as Lead).interestedProjectName ?? (displayLead as any).interested_project_name) || '—'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('interestedUnit') || 'Unit'}</label>
                                    <p className="mt-1 text-base font-medium text-gray-900 dark:text-gray-100">
                                        {(() => {
                                            const un = (displayLead as Lead).interestedUnitName ?? (displayLead as any).interested_unit_name;
                                            const uc = (displayLead as Lead).interestedUnitCode ?? (displayLead as any).interested_unit_code;
                                            if (un && uc) return `${un} (${uc})`;
                                            if (un) return un;
                                            return '—';
                                        })()}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('phoneNumbers') || 'Phone Numbers'}</label>
                            <div className="mt-2 w-full">
                                <LeadContactPhoneList
                                    variant="details"
                                    phoneNumbers={displayLead.phoneNumbers}
                                    fallbackPhone={displayLead.phone}
                                    pbxEnabled={pbxEnabled}
                                    onSms={(phone) => setSendSMSModal({ phone })}
                                    onWhatsApp={(phone) => setSendWhatsAppModal({ phone })}
                                    onPbxDial={handlePbxDial}
                                    t={t}
                                />
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

                                    if (availableStatuses.length === 0) {
                                        return <LeadStatusBadge name="—" size="md" />;
                                    }

                                    return (
                                        <LeadStatusDropdown
                                            leadId={displayLead.id}
                                            currentStatus={currentStatusConfig ?? null}
                                            availableStatuses={availableStatuses}
                                            onStatusChange={handleStatusChange}
                                            isUpdating={isUpdating}
                                            size="md"
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
                                            type === 'hot' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                            type === 'cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        }`}>
                                            {type === 'fresh' ? t('fresh') :
                                             type === 'hot' ? t('hot') :
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
                                    } else if (source === 'api') {
                                        return (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                                                {t('leadApiSource') || 'Custom API'}
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
                        {isMetaLead && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                    {t('metaQualification')}
                                </label>
                                <div className="mt-1">
                                    <select
                                        value={metaQualificationStatus ?? ''}
                                        onChange={(e) => handleMetaQualificationChange(e.target.value as '' | 'qualified' | 'unqualified')}
                                        disabled={metaQualificationDisabled || updatingMetaQualification}
                                        title={
                                            !metaLeadgenId
                                                ? t('metaQualificationNoLeadId')
                                                : !metaPixelConfigured
                                                    ? t('metaQualificationNoPixel')
                                                    : undefined
                                        }
                                        className="block w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">{t('metaQualificationNotSet')}</option>
                                        <option value="qualified">{t('qualified')}</option>
                                        <option value="unqualified">{t('unqualified')}</option>
                                    </select>
                                    {updatingMetaQualification && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('loading')}</p>
                                    )}
                                    {!metaLeadgenId && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            {t('metaQualificationNoLeadId')}
                                        </p>
                                    )}
                                    {metaLeadgenId && !metaPixelConfigured && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            {t('metaQualificationNoPixel')}
                                        </p>
                                    )}
                                    {metaQualificationSentAt && !metaQualificationError && (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            {t('metaQualificationSent')}
                                            {metaQualificationSentAt ? ` · ${formatDateTimeToLocal(metaQualificationSentAt)}` : ''}
                                        </p>
                                    )}
                                    {metaQualificationErrorText && (
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{metaQualificationErrorText}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('createdBy') || 'Created by'}</label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">
                                {(() => {
                                    const createdById = (displayLead as any).created_by ?? displayLead.createdBy;
                                    const apiName = (displayLead as any).created_by_name ?? displayLead.createdByName;
                                    const creatorUser = createdById ? users.find(u => u.id === createdById) : null;
                                    return creatorUser?.name ?? apiName ?? '-';
                                })()}
                            </p>
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
                                {(() => {
                                    const s = formatLeadBudget(displayLead as any, language === 'ar' ? 'ar-IQ' : 'en-US');
                                    return s ? (
                                        <span className="text-lg font-semibold">{s}</span>
                                    ) : (
                                        <span className="text-gray-400 dark:text-gray-500">-</span>
                                    );
                                })()}
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
                                {displayLead.lastFeedback || (displayLead as any).last_feedback || '-'}
                            </p>
                        </div>
                        {(displayLead.notes != null && String(displayLead.notes).trim() !== '') && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('notes')}</label>
                                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap">
                                    {String(displayLead.notes).trim()}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="mt-6">
                <Timeline history={timelineHistory} />
            </div>
            </div>

            {sendSMSModal && displayLead && (
                <SendSMSModal
                    isOpen={!!sendSMSModal}
                    onClose={() => setSendSMSModal(null)}
                    leadId={displayLead.id}
                    phoneNumber={sendSMSModal.phone}
                    lead={displayLead}
                    onSent={() => refetchLeadSMS()}
                />
            )}
            {sendWhatsAppModal && displayLead && (
                <SendWhatsAppModal
                    isOpen={!!sendWhatsAppModal}
                    onClose={() => setSendWhatsAppModal(null)}
                    leadId={displayLead.id}
                    phoneNumber={sendWhatsAppModal.phone}
                    lead={displayLead}
                    onSent={() => { refetchLeadWhatsApp(); refetchLeadSMS(); }}
                />
            )}
        </PageWrapper>
    )
}
