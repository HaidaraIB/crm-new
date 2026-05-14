
import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper, LegalLinks } from '../components/index';
import { ChannelsSettings } from './settings/ChannelsSettings';
import { StagesSettings } from './settings/StagesSettings';
import { StatusesSettings } from './settings/StatusesSettings';
import { CallMethodsSettings } from './settings/CallMethodsSettings';
import { VisitTypesSettings } from './settings/VisitTypesSettings';
import { LeadAssignmentSettings } from './settings/LeadAssignmentSettings';
import { SupervisorsSettings } from './settings/SupervisorsSettings';
import { NewLeadSmsSettings } from './settings/NewLeadSmsSettings';
import { useAppContext } from '../context/AppContext';
import { normalizeRole } from '../utils/roles';
import { PAGE_TAB_ACTIVE, PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';

type SettingsTab =
    | 'Channels'
    | 'Stages'
    | 'Statuses'
    | 'CallMethods'
    | 'VisitTypes'
    | 'LeadAssignment'
    | 'NewLeadSms'
    | 'Supervisors';

const ALL_SETTINGS_TAB_IDS: SettingsTab[] = [
    'Channels',
    'Stages',
    'Statuses',
    'CallMethods',
    'VisitTypes',
    'LeadAssignment',
    'NewLeadSms',
    'Supervisors',
];

export const SettingsPage = () => {
    const { t, currentUser } = useAppContext();
    const showVisitTypes =
        currentUser?.company?.specialization === 'real_estate' ||
        currentUser?.company?.specialization === 'services';

    const tabs: SettingsTab[] = useMemo(
        () => [
            'Channels',
            'Stages',
            'Statuses',
            'CallMethods',
            ...(showVisitTypes ? (['VisitTypes'] as const) : []),
            'LeadAssignment',
            'NewLeadSms',
            ...(normalizeRole(currentUser?.role) === 'Owner' ? (['Supervisors'] as const) : []),
        ],
        [currentUser?.role, showVisitTypes]
    );

    const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
        const savedTab = localStorage.getItem('settingsActiveTab') as SettingsTab;
        return savedTab && ALL_SETTINGS_TAB_IDS.includes(savedTab)
            ? savedTab
            : 'Channels';
    });

    useEffect(() => {
        localStorage.setItem('settingsActiveTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'Supervisors' && normalizeRole(currentUser?.role) !== 'Owner') {
            setActiveTab('Channels');
        }
    }, [currentUser?.role, activeTab]);

    useEffect(() => {
        if (activeTab === 'VisitTypes' && !showVisitTypes) {
            setActiveTab('Channels');
        }
    }, [activeTab, showVisitTypes]);

    const renderContent = () => {
        switch (activeTab) {
            case 'Channels':
                return <ChannelsSettings />;
            case 'Stages':
                return <StagesSettings />;
            case 'Statuses':
                return <StatusesSettings />;
            case 'CallMethods':
                return <CallMethodsSettings />;
            case 'VisitTypes':
                return <VisitTypesSettings />;
            case 'LeadAssignment':
                return <LeadAssignmentSettings />;
            case 'NewLeadSms':
                return <NewLeadSmsSettings />;
            case 'Supervisors':
                return <SupervisorsSettings />;
            default:
                return null;
        }
    };

    return (
        <PageWrapper title={t('settings')}>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-4 rtl:space-x-reverse flex-wrap" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('Channels')}
                        className={`whitespace-nowrap py-4 px-1 text-sm transition-colors ${activeTab === 'Channels' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                    >
                        {t('channels')}
                    </button>
                    <button
                        onClick={() => setActiveTab('Stages')}
                        className={`whitespace-nowrap py-4 px-1 text-sm transition-colors ${activeTab === 'Stages' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                    >
                        {t('stages')}
                    </button>
                    <button
                        onClick={() => setActiveTab('Statuses')}
                        className={`whitespace-nowrap py-4 px-1 text-sm transition-colors ${activeTab === 'Statuses' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                    >
                        {t('statuses')}
                    </button>
                    <button
                        onClick={() => setActiveTab('CallMethods')}
                        className={`whitespace-nowrap py-4 px-1 text-sm transition-colors ${activeTab === 'CallMethods' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                    >
                        {t('callMethods') || 'Call Methods'}
                    </button>
                    {showVisitTypes && (
                        <button
                            onClick={() => setActiveTab('VisitTypes')}
                            className={`whitespace-nowrap py-4 px-1 text-sm transition-colors ${activeTab === 'VisitTypes' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                        >
                            {t('visitTypes') || 'Visit types'}
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('LeadAssignment')}
                        className={`whitespace-nowrap py-4 px-1 text-sm transition-colors ${activeTab === 'LeadAssignment' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                    >
                        {t('leadAssignmentSettings')}
                    </button>
                    <button
                        onClick={() => setActiveTab('NewLeadSms')}
                        className={`whitespace-nowrap py-4 px-1 text-sm transition-colors ${activeTab === 'NewLeadSms' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                    >
                        {t('newLeadSmsSettings')}
                    </button>
                    {normalizeRole(currentUser?.role) === 'Owner' && (
                        <button
                            onClick={() => setActiveTab('Supervisors')}
                            className={`whitespace-nowrap py-4 px-1 text-sm transition-colors ${activeTab === 'Supervisors' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}
                        >
                            {t('supervisorsTitle')}
                        </button>
                    )}
                </nav>
            </div>
            {renderContent()}
            <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
                <LegalLinks variant="horizontal" size="sm" />
            </footer>
        </PageWrapper>
    );
};
