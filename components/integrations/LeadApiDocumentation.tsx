import React, { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button, Card } from '../index';
import { leadApiDocT, type LeadApiDocKey } from '../../constants/leadApiDocumentation';

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-gray-200 dark:border-gray-700 pb-8 last:border-0">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

function CodeBlock({
  code,
  label,
  copyLabel,
  copiedLabel,
  isRtl,
}: {
  code: string;
  label?: string;
  copyLabel: string;
  copiedLabel: string;
  isRtl: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="mb-4">
      {label ? (
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      ) : null}
      <div className="relative rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-900 dark:bg-gray-950 overflow-hidden">
        <pre className="overflow-x-auto p-4 text-xs sm:text-sm text-gray-100 font-mono leading-relaxed" dir="ltr">
          <code>{code}</code>
        </pre>
        <Button
          variant="secondary"
          className={`absolute top-2 text-xs py-1 px-2 min-h-0 ${isRtl ? 'start-2' : 'end-2'}`}
          onClick={onCopy}
        >
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  );
}

function FieldsTable({
  rows,
  headers,
}: {
  headers: [string, string, string];
  rows: { field: string; required: string; description: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
      <table className="min-w-full text-sm text-start">
        <thead className="bg-gray-50 dark:bg-gray-800/80">
          <tr>
            <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{headers[0]}</th>
            <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{headers[1]}</th>
            <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{headers[2]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rows.map((row) => (
            <tr key={row.field} className="bg-white dark:bg-gray-900/40">
              <td className="px-3 py-2 font-mono text-xs text-primary-700 dark:text-primary-300 whitespace-nowrap" dir="ltr">
                {row.field}
              </td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.required}</td>
              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeadApiDocumentation({
  endpointUrl,
  onBack,
}: {
  endpointUrl: string;
  onBack: () => void;
}) {
  const { language } = useAppContext();
  const docLanguage = language === 'ar' ? 'ar' : 'en';
  const t = useCallback((key: LeadApiDocKey) => leadApiDocT(docLanguage, key), [docLanguage]);
  const dir = docLanguage === 'ar' ? 'rtl' : 'ltr';
  const url = endpointUrl || 'https://your-api.example.com/api/v1/integrations/leads/inbound/';
  const placeholderKey = 'crm_lk_YOUR_KEY_HERE';

  const exampleRequest = useMemo(
    () =>
      JSON.stringify(
        {
          name: 'Jane Doe',
          phone: '+9647700000001',
          external_id: 'form-submission-uuid-123',
          email: 'jane@example.com',
          notes: 'Interested in villa',
          priority: 'high',
          type: 'fresh',
          custom_fields: { budget: '50000', city: 'Baghdad' },
        },
        null,
        2
      ),
    []
  );

  const success201 = useMemo(
    () =>
      JSON.stringify(
        {
          success: true,
          data: {
            client_id: 42,
            patient_file_number: 1001,
            created_at: '2026-05-25T12:00:00+00:00',
            duplicate: false,
          },
        },
        null,
        2
      ),
    []
  );

  const duplicate200 = useMemo(
    () =>
      JSON.stringify(
        {
          success: true,
          data: {
            client_id: 42,
            patient_file_number: 1001,
            created_at: '2026-05-25T12:00:00+00:00',
            duplicate: true,
          },
        },
        null,
        2
      ),
    []
  );

  const validation400 = useMemo(
    () =>
      JSON.stringify(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Validation failed.',
            details: { name: ['This field is required.'] },
          },
        },
        null,
        2
      ),
    []
  );

  const curlSample = `curl -X POST "${url}" \\
  -H "Authorization: Bearer ${placeholderKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Doe","phone":"+9647700000001","external_id":"sub-001"}'`;

  const jsSample = `const res = await fetch("${url}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${placeholderKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Jane Doe",
    phone: "+9647700000001",
    external_id: "sub-001",
  }),
});
const json = await res.json();`;

  const phpSample = `$ch = curl_init("${url}");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer ${placeholderKey}",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "name" => "Jane Doe",
        "phone" => "+9647700000001",
        "external_id" => "sub-001",
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$response = curl_exec($ch);
curl_close($ch);`;

  const pythonSample = `import requests

resp = requests.post(
    "${url}",
    headers={
        "Authorization": f"Bearer {os.environ['CRM_LEAD_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "name": "Jane Doe",
        "phone": "+9647700000001",
        "external_id": "sub-001",
    },
    timeout=30,
)
resp.raise_for_status()
data = resp.json()`;

  const toc: { id: string; key: LeadApiDocKey }[] = [
    { id: 'overview', key: 'leadApiDocSectionOverview' },
    { id: 'how-it-works', key: 'leadApiDocSectionHowItWorks' },
    { id: 'quick-start', key: 'leadApiDocSectionQuickStart' },
    { id: 'endpoint', key: 'leadApiDocSectionEndpoint' },
    { id: 'auth', key: 'leadApiDocSectionAuth' },
    { id: 'request', key: 'leadApiDocSectionRequest' },
    { id: 'response', key: 'leadApiDocSectionResponse' },
    { id: 'errors', key: 'leadApiDocSectionErrors' },
    { id: 'idempotency', key: 'leadApiDocSectionIdempotency' },
    { id: 'security', key: 'leadApiDocSectionSecurity' },
    { id: 'optional-ids', key: 'leadApiDocSectionOptionalIds' },
    { id: 'samples', key: 'leadApiDocSectionSamples' },
    { id: 'troubleshooting', key: 'leadApiDocSectionTroubleshooting' },
  ];

  const fieldRows = [
    { field: t('leadApiDocFieldName'), required: t('leadApiDocRequiredYes'), description: t('leadApiDocDescName') },
    { field: t('leadApiDocFieldPhone'), required: t('leadApiDocRequiredRecommended'), description: t('leadApiDocDescPhone') },
    { field: t('leadApiDocFieldExternalId'), required: t('leadApiDocRequiredRecommended'), description: t('leadApiDocDescExternalId') },
    { field: t('leadApiDocFieldEmail'), required: t('leadApiDocRequiredNo'), description: t('leadApiDocDescEmail') },
    { field: t('leadApiDocFieldNotes'), required: t('leadApiDocRequiredNo'), description: t('leadApiDocDescNotes') },
    { field: t('leadApiDocFieldCampaignId'), required: t('leadApiDocRequiredNo'), description: t('leadApiDocDescCampaignId') },
    { field: t('leadApiDocFieldCommunicationWayId'), required: t('leadApiDocRequiredNo'), description: t('leadApiDocDescCommunicationWayId') },
    { field: t('leadApiDocFieldStatusId'), required: t('leadApiDocRequiredNo'), description: t('leadApiDocDescStatusId') },
    { field: t('leadApiDocFieldPriority'), required: t('leadApiDocRequiredNo'), description: t('leadApiDocDescPriority') },
    { field: t('leadApiDocFieldType'), required: t('leadApiDocRequiredNo'), description: t('leadApiDocDescType') },
    { field: t('leadApiDocFieldCustomFields'), required: t('leadApiDocRequiredNo'), description: t('leadApiDocDescCustomFields') },
  ];

  const tableHeaders: [string, string, string] =
    docLanguage === 'ar'
      ? ['الحقل', 'الإلزام', 'الوصف']
      : ['Field', 'Required', 'Description'];

  const copyLabel = t('leadApiDocCopy');
  const copiedLabel = t('leadApiDocCopied');
  const isRtl = docLanguage === 'ar';

  return (
    <article dir={dir} lang={docLanguage} className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('leadApiDocPageTitle')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('leadApiDocLanguageNote')}</p>
        </div>
        <Button variant="secondary" onClick={onBack}>
          {t('leadApiDocBackToSetup')}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <nav className="lg:w-52 shrink-0">
          <Card className="p-4 lg:sticky lg:top-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              {t('leadApiDocToc')}
            </p>
            <ul className="space-y-1.5 text-sm">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-primary-700 dark:text-primary-300 hover:underline"
                  >
                    {t(item.key)}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </nav>

        <div className="flex-1 min-w-0 space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <DocSection id="overview" title={t('leadApiDocSectionOverview')}>
            <p>{t('leadApiDocOverview')}</p>
          </DocSection>

          <DocSection id="how-it-works" title={t('leadApiDocSectionHowItWorks')}>
            <p className="mb-3">{t('leadApiDocHowItWorksIntro')}</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>{t('leadApiDocHowItWorksStep1')}</li>
              <li>{t('leadApiDocHowItWorksStep2')}</li>
              <li>{t('leadApiDocHowItWorksStep3')}</li>
              <li>{t('leadApiDocHowItWorksStep4')}</li>
            </ol>
          </DocSection>

          <DocSection id="quick-start" title={t('leadApiDocSectionQuickStart')}>
            <ol className="list-decimal list-inside space-y-2">
              <li>{t('leadApiDocQuickStart1')}</li>
              <li>{t('leadApiDocQuickStart2')}</li>
              <li>{t('leadApiDocQuickStart3')}</li>
              <li>{t('leadApiDocQuickStart4')}</li>
            </ol>
          </DocSection>

          <DocSection id="endpoint" title={t('leadApiDocSectionEndpoint')}>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li dir="ltr" className="font-mono text-xs sm:text-sm">
                {t('leadApiDocEndpointMethod')}
              </li>
              <li dir="ltr" className="font-mono text-xs sm:text-sm">
                {t('leadApiDocEndpointContentType')}
              </li>
            </ul>
            <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">{t('leadApiDocEndpointYourUrl')}</p>
            <CodeBlock code={url} copyLabel={copyLabel} copiedLabel={copiedLabel}
              isRtl={isRtl} />
          </DocSection>

          <DocSection id="auth" title={t('leadApiDocSectionAuth')}>
            <p className="mb-3">{t('leadApiDocAuthIntro')}</p>
            <ul className="list-disc list-inside space-y-2 mb-3 font-mono text-xs sm:text-sm" dir="ltr">
              <li>{t('leadApiDocAuthBearer')}</li>
              <li>{t('leadApiDocAuthHeader')}</li>
            </ul>
            <p className="text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              {t('leadApiDocAuthDoNot')}
            </p>
          </DocSection>

          <DocSection id="request" title={t('leadApiDocSectionRequest')}>
            <FieldsTable headers={tableHeaders} rows={fieldRows} />
            <CodeBlock
              label={t('leadApiDocExampleRequest')}
              code={exampleRequest}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
              isRtl={isRtl}
            />
          </DocSection>

          <DocSection id="response" title={t('leadApiDocSectionResponse')}>
            <p className="mb-3">{t('leadApiDocEnvelope')}</p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>{t('leadApiDocHttp201')}</li>
              <li>{t('leadApiDocHttp200')}</li>
              <li>{t('leadApiDocHttp400')}</li>
              <li>{t('leadApiDocHttp401')}</li>
              <li>{t('leadApiDocHttp403')}</li>
              <li>{t('leadApiDocHttp429')}</li>
              <li>{t('leadApiDocHttp500')}</li>
            </ul>
            <CodeBlock label={t('leadApiDocSuccessExample')} code={success201} copyLabel={copyLabel} copiedLabel={copiedLabel}
              isRtl={isRtl} />
            <CodeBlock label={t('leadApiDocDuplicateExample')} code={duplicate200} copyLabel={copyLabel} copiedLabel={copiedLabel}
              isRtl={isRtl} />
            <CodeBlock label={t('leadApiDocValidationExample')} code={validation400} copyLabel={copyLabel} copiedLabel={copiedLabel}
              isRtl={isRtl} />
          </DocSection>

          <DocSection id="errors" title={t('leadApiDocSectionErrors')}>
            <ul className="list-disc list-inside space-y-2 font-mono text-xs sm:text-sm" dir="ltr">
              <li>{t('leadApiDocErrMissingApiKey')}</li>
              <li>{t('leadApiDocErrInvalidApiKey')}</li>
              <li>{t('leadApiDocErrInvalidJson')}</li>
              <li>{t('leadApiDocErrIntegrationDisabled')}</li>
              <li>{t('leadApiDocErrQuota')}</li>
              <li>{t('leadApiDocErrValidation')}</li>
            </ul>
          </DocSection>

          <DocSection id="idempotency" title={t('leadApiDocSectionIdempotency')}>
            <p>{t('leadApiDocIdempotency')}</p>
          </DocSection>

          <DocSection id="security" title={t('leadApiDocSectionSecurity')}>
            <ul className="list-disc list-inside space-y-2">
              <li>{t('leadApiDocSecurity1')}</li>
              <li>{t('leadApiDocSecurity2')}</li>
              <li>{t('leadApiDocSecurity3')}</li>
              <li>{t('leadApiDocSecurity4')}</li>
            </ul>
          </DocSection>

          <DocSection id="optional-ids" title={t('leadApiDocSectionOptionalIds')}>
            <p className="mb-3">{t('leadApiDocOptionalIdsIntro')}</p>
            <ul className="list-disc list-inside space-y-2">
              <li>{t('leadApiDocOptionalIdsCampaign')}</li>
              <li>{t('leadApiDocOptionalIdsStatus')}</li>
              <li>{t('leadApiDocOptionalIdsChannel')}</li>
            </ul>
          </DocSection>

          <DocSection id="samples" title={t('leadApiDocSectionSamples')}>
            <CodeBlock label={t('leadApiDocSampleCurl')} code={curlSample} copyLabel={copyLabel} copiedLabel={copiedLabel}
              isRtl={isRtl} />
            <CodeBlock label={t('leadApiDocSampleJs')} code={jsSample} copyLabel={copyLabel} copiedLabel={copiedLabel}
              isRtl={isRtl} />
            <CodeBlock label={t('leadApiDocSamplePhp')} code={phpSample} copyLabel={copyLabel} copiedLabel={copiedLabel}
              isRtl={isRtl} />
            <CodeBlock label={t('leadApiDocSamplePython')} code={pythonSample} copyLabel={copyLabel} copiedLabel={copiedLabel}
              isRtl={isRtl} />
          </DocSection>

          <DocSection id="troubleshooting" title={t('leadApiDocSectionTroubleshooting')}>
            <ul className="list-disc list-inside space-y-2">
              <li>{t('leadApiDocTs401')}</li>
              <li>{t('leadApiDocTs403')}</li>
              <li>{t('leadApiDocTs400')}</li>
              <li>{t('leadApiDocTsNoLead')}</li>
              <li>{t('leadApiDocTsRateLimit')}</li>
            </ul>
          </DocSection>
        </div>
      </div>
    </article>
  );
}
