
import React, { useState, useEffect } from 'react';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { PageWrapper, Loader } from '../components/index';
import { ChannelsSettings } from './settings/ChannelsSettings';
import { StagesSettings } from './settings/StagesSettings';
import { StatusesSettings } from './settings/StatusesSettings';
import { useAppContext } from '../context/AppContext';

type SettingsTab = 'Channels' | 'Stages' | 'Statuses';

export const SettingsPage = () => {
    const { t } = useAppContext();
    const [activeTab, setActiveTab] = useState<SettingsTab>('Channels');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'Channels': return <ChannelsSettings />;
            case 'Stages': return <StagesSettings />;
            case 'Statuses': return <StatusesSettings />;
            default: return null;
        }
    };

    if (loading) {
        return (
            <PageWrapper title={t('settings')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper title={t('settings')}>
             <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-4 rtl:space-x-reverse" aria-label="Tabs">
                    <button onClick={() => setActiveTab('Channels')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'Channels' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('channels')}</button>
                    <button onClick={() => setActiveTab('Stages')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'Stages' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('stages')}</button>
                    <button onClick={() => setActiveTab('Statuses')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'Statuses' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('statuses')}</button>
                </nav>
            </div>
            {renderContent()}
        </PageWrapper>
    );
};
