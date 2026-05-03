import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useDevelopers, useProjects, useUnits } from '../hooks/useQueries';

export type LeadInterestInventoryValue = {
    interestedDeveloper: string;
    interestedProject: string;
    interestedUnit: string;
};

export function emptyLeadInterestInventory(): LeadInterestInventoryValue {
    return { interestedDeveloper: '', interestedProject: '', interestedUnit: '' };
}

/** API body for interested_developer / interested_project / interested_unit (snake_case). */
export function buildInterestedInventoryApiBody(
    specialization: string | undefined,
    value: LeadInterestInventoryValue
): Record<string, number | null> {
    if (specialization !== 'real_estate') return {};
    return {
        interested_developer: value.interestedDeveloper ? Number(value.interestedDeveloper) : null,
        interested_project: value.interestedProject ? Number(value.interestedProject) : null,
        interested_unit: value.interestedUnit ? Number(value.interestedUnit) : null,
    };
}

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {children}
    </label>
);

const Select = ({
    id,
    children,
    value,
    onChange,
    disabled,
}: {
    id: string;
    children?: React.ReactNode;
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
}) => {
    const { language: contextLanguage } = useAppContext();
    const lang = contextLanguage;
    return (
        <select
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 disabled:opacity-50"
        >
            {children}
        </select>
    );
};

type Props = {
    value: LeadInterestInventoryValue;
    onChange: (next: LeadInterestInventoryValue) => void;
    idPrefix?: string;
    /** e.g. md:col-span-2 for full-width row in grids */
    className?: string;
};

export const LeadInterestInventoryFields = ({ value, onChange, idPrefix = 'lead-inv', className }: Props) => {
    const { t, currentUser } = useAppContext();
    const isRE = currentUser?.company?.specialization === 'real_estate';
    const devId = value.interestedDeveloper ? Number(value.interestedDeveloper) : undefined;
    const projId = value.interestedProject ? Number(value.interestedProject) : undefined;

    const { data: devResp } = useDevelopers();
    const { data: projResp } = useProjects(undefined, undefined, undefined, devId);
    const { data: unitsResp } = useUnits(
        projId ? { project: projId } : {},
        undefined,
        { enabled: isRE && !!projId }
    );

    const developers = useMemo(() => devResp?.results ?? [], [devResp?.results]);
    const projects = useMemo(() => projResp?.results ?? [], [projResp?.results]);
    const units = useMemo(() => unitsResp?.results ?? [], [unitsResp?.results]);

    if (!isRE) return null;

    const none = t('noneOptional') || '— (optional)';

    return (
        <div className={className ?? 'md:col-span-2 space-y-3'}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('leadInventoryInterest') || 'Property interest (optional)'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <Label htmlFor={`${idPrefix}-dev`}>{t('interestedDeveloper') || 'Developer'}</Label>
                    <Select
                        id={`${idPrefix}-dev`}
                        value={value.interestedDeveloper}
                        onChange={(e) => {
                            const v = e.target.value;
                            onChange({
                                interestedDeveloper: v,
                                interestedProject: '',
                                interestedUnit: '',
                            });
                        }}
                    >
                        <option value="">{none}</option>
                        {developers.map((d: { id: number; name: string }) => (
                            <option key={d.id} value={String(d.id)}>
                                {d.name}
                            </option>
                        ))}
                    </Select>
                </div>
                <div>
                    <Label htmlFor={`${idPrefix}-proj`}>{t('interestedProject') || 'Project'}</Label>
                    <Select
                        id={`${idPrefix}-proj`}
                        value={value.interestedProject}
                        onChange={(e) => {
                            const v = e.target.value;
                            onChange({
                                ...value,
                                interestedDeveloper: value.interestedDeveloper,
                                interestedProject: v,
                                interestedUnit: '',
                            });
                        }}
                    >
                        <option value="">{none}</option>
                        {projects.map((p: { id: number; name: string }) => (
                            <option key={p.id} value={String(p.id)}>
                                {p.name}
                            </option>
                        ))}
                    </Select>
                </div>
                <div>
                    <Label htmlFor={`${idPrefix}-unit`}>{t('interestedUnit') || 'Unit'}</Label>
                    <Select
                        id={`${idPrefix}-unit`}
                        value={value.interestedUnit}
                        disabled={!projId}
                        onChange={(e) => {
                            onChange({ ...value, interestedUnit: e.target.value });
                        }}
                    >
                        <option value="">{none}</option>
                        {units.map((u: { id: number; name: string; code?: string }) => (
                            <option key={u.id} value={String(u.id)}>
                                {u.code ? `${u.name} (${u.code})` : u.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>
        </div>
    );
};
