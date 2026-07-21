import { translations } from '../constants';

type TFn = (key: keyof typeof translations.en) => string;

export type TimelineEventFormatContext = {
    t: TFn;
    users: Array<{ id: number; name?: string; username?: string }>;
    statuses: Array<{ id: number; name: string }>;
    channels: Array<{ id: number; name: string }>;
};

const EDIT_NOTE_FIELD_KEYS: Record<string, keyof typeof translations.en> = {
    budget: 'timelineFieldBudgetUpdated',
    'budget max': 'timelineFieldBudgetMaxUpdated',
    budget_max: 'timelineFieldBudgetMaxUpdated',
    'communication way': 'timelineFieldCommunicationWayUpdated',
    communication_way: 'timelineFieldCommunicationWayUpdated',
    name: 'timelineFieldNameUpdated',
    priority: 'timelineFieldPriorityUpdated',
    type: 'timelineFieldTypeUpdated',
    notes: 'timelineFieldNotesUpdated',
    profession: 'timelineFieldProfessionUpdated',
    residence: 'timelineFieldResidenceUpdated',
    'lead company name': 'timelineFieldLeadCompanyNameUpdated',
    lead_company_name: 'timelineFieldLeadCompanyNameUpdated',
    'interested developer': 'timelineFieldInterestedDeveloperUpdated',
    interested_developer: 'timelineFieldInterestedDeveloperUpdated',
    'interested project': 'timelineFieldInterestedProjectUpdated',
    interested_project: 'timelineFieldInterestedProjectUpdated',
    'interested unit': 'timelineFieldInterestedUnitUpdated',
    interested_unit: 'timelineFieldInterestedUnitUpdated',
};

const EVENT_TYPE_ACTION_KEYS: Record<string, keyof typeof translations.en> = {
    status_change: 'statusUpdated',
    assignment: 'leadAssigned',
    location_update: 'timeline',
    edit: 'leadEdited',
    re_assignment: 'leadReAssigned',
    created: 'timelineEventCreated',
};

const SOURCE_VALUE_KEYS: Record<string, keyof typeof translations.en> = {
    'custom lead api': 'leadApiSource',
    'custom api': 'leadApiSource',
    whatsapp: 'whatsappSource',
    tiktok: 'tiktokSource',
    meta: 'metaLeadForm',
    manual: 'manualSource',
};

function normalizeToken(value: string): string {
    return value.trim().toLowerCase();
}

export type TimelineActorFallback = 'system' | 'whatsapp' | 'contact';

/** Resolve the bold name shown on a timeline card (CRM user, contact, or system label). */
export function resolveTimelineActor(options: {
    createdById?: number | null;
    createdByUsername?: string | null;
    users: Array<{ id: number; name?: string; username?: string; avatar?: string }>;
    t: TFn;
    fallback?: TimelineActorFallback;
    contactName?: string | null;
    contactPhone?: string | null;
}): { name: string; avatar?: string } {
    const { createdById, createdByUsername, users, t, fallback, contactName, contactPhone } = options;
    if (createdById != null) {
        const user = users.find((u) => u.id === createdById);
        if (user?.name) return { name: user.name, avatar: user.avatar };
        if (user?.username) return { name: user.username, avatar: user.avatar };
    }
    if (createdByUsername?.trim()) {
        return { name: createdByUsername.trim() };
    }
    if (fallback === 'contact') {
        const contact = (contactName || contactPhone || '').trim();
        if (contact) return { name: contact };
    }
    if (fallback === 'whatsapp') return { name: t('whatsappSource') };
    if (fallback === 'system') return { name: t('timelineActorSystem') };
    return { name: t('unknown') };
}

export function timelineEventActorFallback(
    event: { event_type: string; new_value?: string | null; created_by?: number | null }
): TimelineActorFallback | undefined {
    if (event.created_by != null) return undefined;
    if (event.event_type === 'whatsapp_message') return 'contact';
    if (event.event_type === 'created' && normalizeToken(event.new_value || '') === 'whatsapp') {
        return 'whatsapp';
    }
    if (['assignment', 're_assignment', 'created'].includes(event.event_type)) {
        return 'system';
    }
    return 'system';
}

export function parseEditFieldKeyFromNotes(notes: string | null | undefined): keyof typeof translations.en | null {
    if (!notes) return null;
    const trimmed = notes.trim();

    // New machine keys: field_updated:communication_way
    const keyMatch = trimmed.match(/^field_updated:([a-z0-9_]+)$/i);
    if (keyMatch) {
        const slug = normalizeToken(keyMatch[1]);
        return EDIT_NOTE_FIELD_KEYS[slug] ?? EDIT_NOTE_FIELD_KEYS[slug.replace(/_/g, ' ')] ?? null;
    }

    // Legacy English prose: "Communication way updated"
    const match = trimmed.match(/^(.+?)\s+updated$/i);
    if (!match) return null;
    const slug = normalizeToken(match[1].replace(/_/g, ' '));
    return EDIT_NOTE_FIELD_KEYS[slug] ?? null;
}

function inferEditFieldKeyFromValues(
    oldValue: string | null | undefined,
    newValue: string | null | undefined
): keyof typeof translations.en | null {
    const looksLikeCoordinate = (value: string | null | undefined) =>
        typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim());

    if (looksLikeCoordinate(oldValue) || looksLikeCoordinate(newValue)) {
        return 'timelineFieldLocationUpdated';
    }
    return null;
}

export function getEditFieldLabel(
    notes: string | null | undefined,
    t: TFn,
    oldValue?: string | null,
    newValue?: string | null
): string | null {
    const fieldKey =
        parseEditFieldKeyFromNotes(notes) ?? inferEditFieldKeyFromValues(oldValue, newValue);
    if (fieldKey) return t(fieldKey);

    const match = notes?.match(/^(.+?)\s+updated$/i);
    if (match) {
        const human = match[1].replace(/_/g, ' ').trim();
        return t('timelineFieldGenericUpdated').replace('{{field}}', human);
    }

    return null;
}

export function getTimelineEventAction(
    eventType: string,
    t: TFn,
    notes?: string | null,
    oldValue?: string | null,
    newValue?: string | null
): string {
    if (eventType === 'edit') {
        return getEditFieldLabel(notes, t, oldValue, newValue) || t('leadEdited');
    }
    const key = EVENT_TYPE_ACTION_KEYS[eventType];
    if (key) return t(key);
    return t('timeline');
}

export function localizeTimelineEventNotes(
    notes: string | null | undefined,
    eventType: string,
    t: TFn
): string {
    if (!notes?.trim()) return '';

    const trimmed = notes.trim();

    if (eventType === 'edit') {
        const fieldKey = parseEditFieldKeyFromNotes(trimmed);
        if (fieldKey) return t(fieldKey);
    }

    if (eventType === 'created' || trimmed.toLowerCase().startsWith('lead from')) {
        const lower = trimmed.toLowerCase();
        if (lower.includes('custom lead api') || lower.includes('custom api')) {
            const emailMatch = trimmed.match(/email:\s*(.+)/i);
            const base = t('timelineLeadFromCustomApi');
            return emailMatch ? `${base} · ${emailMatch[1].trim()}` : base;
        }
        if (lower.includes('tiktok')) return t('timelineLeadFromTikTok');
        if (lower.includes('whatsapp')) return t('timelineLeadFromWhatsapp');
        if (lower.includes('meta')) return t('timelineLeadFromMeta');
    }

    if (eventType === 'status_change') {
        const statusMatch = trimmed.match(/status changed from (.+) to (.+)/i);
        if (statusMatch) {
            return `${t('statusChangedFrom')} ${formatTimelineEventValue(statusMatch[1], { t, users: [], statuses: [], channels: [] })} ${t('statusChangedTo')} ${formatTimelineEventValue(statusMatch[2], { t, users: [], statuses: [], channels: [] })}`;
        }
    }

    if (eventType === 'assignment') {
        const assignedMatch = trimmed.match(/^assigned to (.+?)(?: \(was (.+)\))?$/i);
        if (assignedMatch) {
            const newVal = formatTimelineEventValue(assignedMatch[1], { t, users: [], statuses: [], channels: [] }, 'user');
            const oldVal = assignedMatch[2]
                ? formatTimelineEventValue(assignedMatch[2], { t, users: [], statuses: [], channels: [] }, 'user')
                : null;
            if (oldVal && oldVal !== newVal) {
                return `${t('assignedToAction')} ${newVal} (${t('was')} ${oldVal})`;
            }
            return `${t('assignedToAction')} ${newVal}`;
        }
        const unassignedMatch = trimmed.match(/^unassigned \(was (.+)\)$/i);
        if (unassignedMatch) {
            const oldVal = formatTimelineEventValue(unassignedMatch[1], { t, users: [], statuses: [], channels: [] }, 'user');
            return `${t('unassigned')} (${t('was')} ${oldVal})`;
        }
    }

    if (trimmed.toLowerCase().includes('bulk assigned')) {
        const bulkMatch = trimmed.match(/bulk assigned to (.+?)(?: \(was (.+)\))?$/i);
        if (bulkMatch) {
            const newVal = formatTimelineEventValue(bulkMatch[1], { t, users: [], statuses: [], channels: [] }, 'user');
            const oldVal = bulkMatch[2]
                ? formatTimelineEventValue(bulkMatch[2], { t, users: [], statuses: [], channels: [] }, 'user')
                : null;
            if (oldVal && oldVal !== newVal) {
                return `${t('bulkAssignedTo')} ${newVal} (${t('was')} ${oldVal})`;
            }
            return `${t('bulkAssignedTo')} ${newVal}`;
        }
    }

    return trimmed;
}

export function formatTimelineEventValue(
    value: string | null | undefined,
    ctx: TimelineEventFormatContext,
    hint: 'user' | 'status' | 'channel' | 'generic' = 'generic'
): string {
    const { t, users, statuses, channels } = ctx;
    if (value == null || value === '' || value === 'None' || value === 'null') {
        return t('timelineValueEmpty');
    }

    const trimmed = value.trim();
    const normalized = normalizeToken(trimmed);

    if (normalized === 'unassigned' || normalized === 'none') {
        return t('unassigned');
    }

    const sourceKey = SOURCE_VALUE_KEYS[normalized];
    if (sourceKey) return t(sourceKey);

    if (hint === 'user' || /^\d+$/.test(trimmed)) {
        const userId = parseInt(trimmed, 10);
        if (!isNaN(userId)) {
            const user = users.find((u) => u.id === userId);
            if (user?.name) return user.name;
            if (user?.username) return user.username;
        }
        const byUsername = users.find(
            (u) =>
                normalizeToken(u.username || '') === normalized ||
                normalizeToken(u.name || '') === normalized
        );
        if (byUsername?.name) return byUsername.name;
        if (byUsername?.username) return byUsername.username;
    }

    if (hint === 'status' || hint === 'generic') {
        const statusById = statuses.find((s) => s.id.toString() === trimmed);
        if (statusById) return statusById.name;
        const statusByName = statuses.find((s) => normalizeToken(s.name) === normalized);
        if (statusByName) return statusByName.name;
    }

    if (hint === 'channel' || hint === 'generic') {
        const channelById = channels.find((c) => c.id.toString() === trimmed);
        if (channelById) return channelById.name;
        const channelByName = channels.find((c) => normalizeToken(c.name) === normalized);
        if (channelByName) return channelByName.name;
        if (normalized === 'whatsapp') return t('whatsappSource');
    }

    if (/^0+(\.0+)?$/.test(trimmed) || trimmed === '0.00') {
        return t('timelineValueEmpty');
    }

    return trimmed;
}

export function inferValueHintFromEditNotes(
    notes: string | null | undefined
): 'user' | 'status' | 'channel' | 'generic' {
    const fieldKey = parseEditFieldKeyFromNotes(notes);
    if (fieldKey === 'timelineFieldCommunicationWayUpdated') return 'channel';
    return 'generic';
}

export function formatTimelineEventValuePair(
    oldValue: string | null | undefined,
    newValue: string | null | undefined,
    ctx: TimelineEventFormatContext,
    eventType: string,
    notes?: string | null
): { oldFormatted?: string; newFormatted?: string } {
    let hint: 'user' | 'status' | 'channel' | 'generic' = 'generic';
    if (eventType === 'assignment' || eventType === 're_assignment') hint = 'user';
    if (eventType === 'status_change') hint = 'status';
    if (eventType === 'created') hint = 'generic';
    if (eventType === 'edit') hint = inferValueHintFromEditNotes(notes);

    return {
        oldFormatted: oldValue != null && oldValue !== '' ? formatTimelineEventValue(oldValue, ctx, hint) : undefined,
        newFormatted: newValue != null && newValue !== '' ? formatTimelineEventValue(newValue, ctx, hint) : undefined,
    };
}
