import { resolveLocalizedApiError } from '../../services/api';
import type { translations } from '../../constants';
import type { AlertVariant } from '../../components/Alert';

export type ComposerAlert = {
  variant: 'error' | 'warning' | 'info';
  message: string;
};

type TFn = (key: keyof typeof translations.en) => string;

export function mapWhatsAppSendErrorToComposer(
  e: unknown,
  t: TFn,
  opts: {
    setComposerAlert: (a: ComposerAlert | null) => void;
    showToast: (msg: string, o?: { variant?: AlertVariant }) => void;
    showAlert: (msg: string, variant?: 'info' | 'warning' | 'error') => void;
  }
): void {
  const err = e as { error_key?: string; code?: string };
  const key = err?.error_key || err?.code || '';
  if (key === 'whatsapp_display_name_not_approved') {
    opts.setComposerAlert({
      variant: 'error',
      message: t('whatsapp_display_name_not_approved'),
    });
    return;
  }
  if (key === 'whatsapp_outside_session_use_template') {
    opts.setComposerAlert({
      variant: 'warning',
      message: t('whatsappOutsideSessionUseTemplate'),
    });
    return;
  }
  if (key === 'whatsapp_template_not_found_or_language') {
    opts.setComposerAlert({
      variant: 'error',
      message: t('whatsapp_template_not_found_or_language'),
    });
    return;
  }
  if (key === 'whatsapp_contact_not_found') {
    opts.showToast(t('whatsappContactNotFound'), { variant: 'warning' });
    return;
  }
  if (key === 'whatsapp_voice_note_requires_ogg') {
    opts.showAlert(t('whatsapp_voice_note_requires_ogg'), 'error');
    return;
  }
  opts.showAlert(resolveLocalizedApiError(e, t, t('error')), 'error');
}
