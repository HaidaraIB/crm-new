import type { translations } from '../constants';

type Translate = (key: keyof typeof translations.en) => string;

/**
 * Media-only Instagram/Messenger messages carry an empty body, so a timeline row
 * for one would render blank. Substitute a localized placeholder.
 *
 * The generic kinds borrow the `whatsappMedia*Placeholder` keys on purpose:
 * their values are channel-neutral single words ("Image", "صورة"), and a second
 * set of keys holding identical strings is a translation file that drifts.
 * Instagram-only kinds have no WhatsApp equivalent and get their own keys.
 *
 * Mirrored in `crm_mobile/lib/utils/social_message_body_localize.dart` — the
 * lead-timeline parity rule covers this file.
 */
const KIND_KEYS: Record<string, keyof typeof translations.en> = {
    image: 'whatsappMediaImagePlaceholder',
    video: 'whatsappMediaVideoPlaceholder',
    audio: 'whatsappMediaAudioPlaceholder',
    document: 'whatsappMediaDocumentPlaceholder',
    location: 'whatsappMediaLocationPlaceholder',
    share: 'socialMediaSharePlaceholder',
    story_mention: 'socialMediaStoryMentionPlaceholder',
    reel: 'socialMediaReelPlaceholder',
};

export function localizeSocialMessageBody(
    body: string,
    attachmentKind: string | null | undefined,
    isVoiceNote: boolean,
    t: Translate,
): string {
    const trimmed = (body || '').trim();
    if (trimmed) return trimmed;
    if (isVoiceNote) return t('socialMediaVoicePlaceholder');
    if (!attachmentKind) return '';
    const key = KIND_KEYS[attachmentKind];
    return key ? t(key) : t('socialMediaGenericPlaceholder');
}
