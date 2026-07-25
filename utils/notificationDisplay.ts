/**
 * Rebuild notification title/body from type + data in the current UI language.
 * Mirrors CRM-api-1/notifications/translations.py so inbox text follows language switches
 * instead of the frozen strings stored when the notification was sent.
 */

export type NotificationLang = 'ar' | 'en';

export type NotificationDisplayInput = {
  type: string;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
};

export type NotificationDisplay = {
  title: string;
  body: string;
  typeLabel: string;
};

type Template = { title: string; body: string; body_with_campaign?: string };

const TEMPLATES: Record<string, Record<NotificationLang, Template>> = {
  new_lead: {
    ar: {
      title: 'عميل محتمل جديد',
      body: 'أضاف {added_by} العميل المحتمل {lead_name}',
      body_with_campaign: 'أضاف {added_by} العميل المحتمل {lead_name} من حملة {campaign_name}',
    },
    en: {
      title: 'New Lead',
      body: '{added_by} added lead {lead_name}',
      body_with_campaign: '{added_by} added lead {lead_name} from campaign {campaign_name}',
    },
  },
  lead_no_follow_up: {
    ar: { title: 'بدون متابعة', body: 'عميل محتمل لم يتم التواصل معه منذ {hours} ساعة' },
    en: { title: 'No Follow Up', body: 'A lead has not been contacted for {hours} hours' },
  },
  lead_reengaged: {
    ar: { title: 'إعادة تفاعل', body: 'عميل محتمل سابق عاد وتفاعل مرة أخرى' },
    en: { title: 'Lead Reengaged', body: 'A previous lead has reengaged' },
  },
  lead_contact_failed: {
    ar: { title: 'فشل التواصل', body: 'لم يتم الرد بعد {attempts} محاولات اتصال' },
    en: { title: 'Contact Failed', body: 'No response after {attempts} contact attempts' },
  },
  lead_status_changed: {
    ar: { title: 'تغيير الحالة', body: 'تم تغيير حالة العميل المحتمل إلى "{new_status}"' },
    en: { title: 'Status Changed', body: 'Lead status has been changed to "{new_status}"' },
  },
  lead_assigned: {
    ar: { title: 'تم تعيين عميل محتمل جديد', body: 'تم تعيين العميل {lead_name} لك' },
    en: { title: 'Lead Assigned', body: 'Lead {lead_name} has been assigned to you' },
  },
  lead_transferred: {
    ar: { title: 'نقل عميل محتمل', body: 'تم نقل العميل {lead_name} منك' },
    en: { title: 'Lead Transferred', body: 'Lead {lead_name} has been transferred from you' },
  },
  lead_updated: {
    ar: { title: 'تحديث عميل', body: 'تم تحديث معلومات العميل {lead_name}' },
    en: { title: 'Lead Updated', body: 'Lead {lead_name} has been updated' },
  },
  lead_reminder: {
    ar: { title: 'تذكير عميل', body: 'تذكير بموعد متابعة العميل {lead_name}' },
    en: { title: 'Lead Reminder', body: 'Reminder to follow up with lead {lead_name}' },
  },
  whatsapp_message_received: {
    ar: { title: 'رسالة واتساب واردة', body: '{lead_name}: {message_preview}' },
    en: { title: 'WhatsApp Message Received', body: '{lead_name}: {message_preview}' },
  },
  whatsapp_template_sent: {
    ar: { title: 'إرسال قالب واتساب', body: 'تم إرسال رسالة الترحيب بنجاح' },
    en: { title: 'WhatsApp Template Sent', body: 'Welcome message has been sent successfully' },
  },
  whatsapp_send_failed: {
    ar: { title: 'فشل إرسال واتساب', body: 'فشل إرسال قالب واتساب' },
    en: { title: 'WhatsApp Send Failed', body: 'Failed to send WhatsApp template' },
  },
  whatsapp_waiting_response: {
    ar: { title: 'بانتظار الرد', body: 'لا يوجد رد من العميل المحتمل منذ {hours} ساعة' },
    en: { title: 'Waiting for Response', body: 'No response from lead for {hours} hours' },
  },
  campaign_performance: {
    ar: { title: 'أداء الحملة', body: 'الحملة {campaign_name} حققت {leads_count} عميل محتمل' },
    en: { title: 'Campaign Performance', body: 'Campaign {campaign_name} has achieved {leads_count} leads' },
  },
  campaign_low_performance: {
    ar: { title: 'انخفاض الأداء', body: 'انخفاض عدد العملاء المحتملين اليوم في حملة {campaign_name}' },
    en: { title: 'Low Performance', body: 'Low number of leads today in campaign {campaign_name}' },
  },
  campaign_stopped: {
    ar: { title: 'إيقاف حملة', body: 'تم إيقاف الحملة {campaign_name} بسبب {reason}' },
    en: { title: 'Campaign Stopped', body: 'Campaign {campaign_name} has been stopped due to {reason}' },
  },
  campaign_budget_alert: {
    ar: { title: 'تنبيه الميزانية', body: 'الميزانية المتبقية في حملة {campaign_name} أقل من {remaining_percent}%' },
    en: { title: 'Budget Alert', body: 'Remaining budget in campaign {campaign_name} is less than {remaining_percent}%' },
  },
  task_created: {
    ar: { title: 'مهمة جديدة', body: 'لديك مهمة متابعة جديدة: {task_title}' },
    en: { title: 'New Task', body: 'You have a new follow-up task: {task_title}' },
  },
  task_reminder: {
    ar: { title: 'تذكير مهمة', body: 'تبقى {minutes_remaining} دقيقة على موعد المتابعة: {task_title}' },
    en: { title: 'Task Reminder', body: '{minutes_remaining} minutes remaining for follow-up: {task_title}' },
  },
  call_reminder: {
    ar: { title: 'تذكير مكالمة', body: 'تبقى {minutes_remaining} دقيقة على موعد مكالمة المتابعة مع {lead_name}' },
    en: { title: 'Call Reminder', body: '{minutes_remaining} minutes remaining for follow-up call with {lead_name}' },
  },
  pbx_incoming_call: {
    ar: { title: 'مكالمة واردة', body: 'مكالمة واردة من {phone}' },
    en: { title: 'Incoming Call', body: 'Incoming call from {phone}' },
  },
  softphone_incoming_call: {
    ar: { title: 'مكالمة واردة', body: 'مكالمة واردة من {phone}' },
    en: { title: 'Incoming Call', body: 'Incoming call from {phone}' },
  },
  pbx_call_missed: {
    ar: { title: 'مكالمة فائتة', body: 'مكالمة فائتة من {phone}' },
    en: { title: 'Missed Call', body: 'Missed call from {phone}' },
  },
  visit_reminder: {
    ar: { title: 'تذكير زيارة', body: 'تبقى {minutes_remaining} دقيقة على موعد الزيارة القادمة مع {lead_name}' },
    en: { title: 'Visit Reminder', body: '{minutes_remaining} minutes remaining for upcoming visit with {lead_name}' },
  },
  reception_visit_reminder: {
    ar: { title: 'تذكير زيارة (استقبال)', body: 'تبقى {minutes_remaining} دقيقة على موعد زيارة للمريض {lead_name}' },
    en: { title: 'Visit Reminder (Reception)', body: '{minutes_remaining} minutes until visit for patient {lead_name}' },
  },
  field_visit_reminder: {
    ar: { title: 'تذكير زيارة ميدانية', body: 'تبقى {minutes_remaining} دقيقة على موعد الزيارة الميدانية القادمة مع {lead_name}' },
    en: { title: 'Field Visit Reminder', body: '{minutes_remaining} minutes remaining for upcoming field visit with {lead_name}' },
  },
  reception_field_visit_reminder: {
    ar: { title: 'تذكير زيارة ميدانية (استقبال)', body: 'تبقى {minutes_remaining} دقيقة على موعد زيارة ميدانية للمريض {lead_name}' },
    en: { title: 'Field Visit Reminder (Reception)', body: '{minutes_remaining} minutes until field visit for patient {lead_name}' },
  },
  task_completed: {
    ar: { title: 'مهمة مكتملة', body: 'تم إكمال المهمة: {task_title}' },
    en: { title: 'Task Completed', body: 'Task completed: {task_title}' },
  },
  deal_created: {
    ar: { title: 'صفقة جديدة', body: 'تم إنشاء صفقة جديدة: {deal_title}' },
    en: { title: 'New Deal', body: 'A new deal has been created: {deal_title}' },
  },
  deal_updated: {
    ar: { title: 'تحديث صفقة', body: 'تم تحديث معلومات الصفقة: {deal_title}' },
    en: { title: 'Deal Updated', body: 'Deal has been updated: {deal_title}' },
  },
  deal_closed: {
    ar: { title: 'إغلاق صفقة', body: 'تم إغلاق الصفقة {deal_title} بقيمة {value}' },
    en: { title: 'Deal Closed', body: 'Deal {deal_title} has been closed with value {value}' },
  },
  deal_reminder: {
    ar: { title: 'تذكير صفقة', body: 'تذكير بموعد متابعة الصفقة: {deal_title}' },
    en: { title: 'Deal Reminder', body: 'Reminder to follow up on deal: {deal_title}' },
  },
  daily_report: {
    ar: { title: 'تقرير يومي', body: 'اليوم: {leads_count} عميل محتمل – {deals_count} مبيعات' },
    en: { title: 'Daily Report', body: 'Today: {leads_count} leads – {deals_count} sales' },
  },
  weekly_report: {
    ar: { title: 'تقرير أسبوعي', body: 'تقرير الأداء الأسبوعي جاهز' },
    en: { title: 'Weekly Report', body: 'Weekly performance report is ready' },
  },
  top_employee: {
    ar: { title: 'أفضل موظف', body: 'أفضل موظف مبيعات لهذا الأسبوع: {employee_name}' },
    en: { title: 'Top Employee', body: 'Top sales employee this week: {employee_name}' },
  },
  login_from_new_device: {
    ar: { title: 'تسجيل دخول جديد', body: 'تم تسجيل دخول من جهاز جديد: {device}' },
    en: { title: 'Login from New Device', body: 'Login detected from new device: {device}' },
  },
  system_update: {
    ar: { title: 'تحديث النظام', body: 'تم إضافة ميزة جديدة إلى Loop CRM: {feature}' },
    en: { title: 'System Update', body: 'New feature added to Loop CRM: {feature}' },
  },
  subscription_expiring: {
    ar: { title: 'تنبيه الاشتراك', body: 'اشتراكك ينتهي خلال {days_remaining} أيام' },
    en: { title: 'Subscription Expiring', body: 'Your subscription expires in {days_remaining} days' },
  },
  payment_failed: {
    ar: { title: 'فشل الدفع', body: 'فشل عملية الدفع، يرجى التحقق' },
    en: { title: 'Payment Failed', body: 'Payment failed, please check' },
  },
  subscription_expired: {
    ar: { title: 'انتهاء الاشتراك', body: 'انتهى الاشتراك، يرجى التجديد' },
    en: { title: 'Subscription Expired', body: 'Subscription has expired, please renew' },
  },
  general: {
    ar: { title: 'إشعار عام', body: 'هذا إشعار عام' },
    en: { title: 'General Notification', body: 'This is a general notification' },
  },
};

const TEAM_ACTIVITY_TITLES: Record<NotificationLang, string> = {
  ar: 'نشاط الفريق',
  en: 'Team activity',
};

const TEAM_ACTIVITY_BODIES: Record<string, Record<NotificationLang, string>> = {
  status_change: {
    ar: 'قام الموظف {employee} بتغيير حالة العميل المحتمل {lead} من {old_status} إلى {new_status}',
    en: 'Employee {employee} changed the status of lead {lead} from {old_status} to {new_status}',
  },
  assignment: {
    ar: 'قام الموظف {employee} بتغيير تعيين العميل المحتمل {lead} من {old_assignee} إلى {new_assignee}',
    en: 'Employee {employee} changed the assignment of lead {lead} from {old_assignee} to {new_assignee}',
  },
  edit: {
    ar: 'قام الموظف {employee} بتحديث العميل المحتمل {lead}: {detail}',
    en: 'Employee {employee} updated lead {lead}: {detail}',
  },
  lead_created: {
    ar: 'قام الموظف {employee} بإنشاء عميل محتمل جديد {lead}',
    en: 'Employee {employee} created lead {lead}',
  },
  call_logged: {
    ar: 'قام الموظف {employee} بتسجيل مكالمة على العميل المحتمل {lead}',
    en: 'Employee {employee} logged a call on lead {lead}',
  },
  visit_logged: {
    ar: 'قام الموظف {employee} بتسجيل زيارة على العميل المحتمل {lead}',
    en: 'Employee {employee} logged a visit on lead {lead}',
  },
  field_visit_logged: {
    ar: 'قام الموظف {employee} بتسجيل زيارة ميدانية على العميل المحتمل {lead}',
    en: 'Employee {employee} logged a field visit on lead {lead}',
  },
  task_created: {
    ar: 'قام الموظف {employee} بإضافة مهمة على العميل المحتمل {lead}',
    en: 'Employee {employee} added a task on lead {lead}',
  },
  deal_won: {
    ar: 'قام الموظف {employee} بإغلاق صفقة ناجحة للعميل المحتمل {lead} ({deal_title}) بقيمة {value}',
    en: 'Employee {employee} won a deal for lead {lead} ({deal_title}) with value {value}',
  },
  no_follow_up: {
    ar: 'تأخر الموظف {employee} في متابعة العميل المحتمل {lead} لمدة {hours} ساعة',
    en: 'Employee {employee} is overdue following up on lead {lead} for {hours} hours',
  },
  unknown: {
    ar: 'قام الموظف {employee} بإجراء على العميل المحتمل {lead}: {detail}',
    en: 'Employee {employee} performed an action on lead {lead}: {detail}',
  },
};

const UNASSIGNED: Record<NotificationLang, string> = {
  ar: 'غير معيّن',
  en: 'Unassigned',
};

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function formatTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => str(data[key]));
}

function normalizeLang(language: string | undefined | null): NotificationLang {
  return language === 'en' ? 'en' : 'ar';
}

function flattenData(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(data || {}) };
  // Common aliases used across send sites
  if (out.lead == null && out.lead_name != null) out.lead = out.lead_name;
  if (out.lead_name == null && out.lead != null) out.lead_name = out.lead;
  if (out.employee == null && (out.employee_name != null || out.actor_name != null)) {
    out.employee = out.employee_name ?? out.actor_name;
  }
  if (out.message_preview == null && out.message != null) out.message_preview = out.message;
  if (out.phone == null && out.caller != null) out.phone = out.caller;
  return out;
}

function localizeAssignee(lang: NotificationLang, value: unknown): string {
  const text = str(value).trim();
  if (!text || text.toLowerCase() === 'unassigned' || text.toLowerCase() === 'none') {
    return UNASSIGNED[lang];
  }
  return text;
}

function teamActivityDisplay(
  lang: NotificationLang,
  data: Record<string, unknown>,
): NotificationDisplay {
  const action = str(data.action || 'unknown') || 'unknown';
  const bodies = TEAM_ACTIVITY_BODIES[action] || TEAM_ACTIVITY_BODIES.unknown;
  const title = TEAM_ACTIVITY_TITLES[lang];
  const body = formatTemplate(bodies[lang], {
    ...data,
    employee: data.employee || data.employee_name || data.actor_name || '',
    lead: data.lead || data.lead_name || '',
    detail: data.detail || data.details || data.summary || '',
    old_assignee: localizeAssignee(lang, data.old_assignee),
    new_assignee: localizeAssignee(lang, data.new_assignee),
  });
  return { title, body, typeLabel: title };
}

/**
 * Localized title/body/typeLabel for an inbox notification in the active UI language.
 * Falls back to API title/body when no template exists.
 */
export function getNotificationDisplay(
  n: NotificationDisplayInput,
  language: string | undefined | null,
): NotificationDisplay {
  const lang = normalizeLang(language);
  const type = n.type || 'general';
  const data = flattenData(n.data);
  const apiTitle = str(n.title).trim();
  const apiBody = str(n.body).trim();

  if (type === 'team_activity') {
    return teamActivityDisplay(lang, data);
  }

  const typeKey =
    type === 'softphone_incoming_call' ? 'softphone_incoming_call' : type;
  const tplSet = TEMPLATES[typeKey];
  if (!tplSet) {
    return {
      title: apiTitle || (lang === 'ar' ? 'إشعار' : 'Notification'),
      body: apiBody,
      typeLabel: apiTitle || type,
    };
  }

  const tpl = tplSet[lang] || tplSet.ar;
  let bodyTpl = tpl.body;
  if (type === 'new_lead' && str(data.campaign_name).trim() && tpl.body_with_campaign) {
    bodyTpl = tpl.body_with_campaign;
  }
  const body = formatTemplate(bodyTpl, data);

  // PBX / softphone: prefer caller phone as title when no matched lead name.
  if (
    type === 'pbx_incoming_call' ||
    type === 'pbx_call_missed' ||
    type === 'softphone_incoming_call'
  ) {
    const phone = str(data.phone).trim();
    const clientName = str(data.client_name || data.lead_name).trim();
    const title = clientName || phone || tpl.title;
    const localizedBody = phone ? formatTemplate(tpl.body, { ...data, phone }) : tpl.title;
    return { title, body: localizedBody, typeLabel: tpl.title };
  }

  return {
    title: tpl.title,
    body: body || apiBody,
    typeLabel: tpl.title,
  };
}
