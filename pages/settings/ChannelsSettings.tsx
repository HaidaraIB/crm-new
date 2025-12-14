
import React from 'react';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { Card, Button, TrashIcon, PlusIcon, EditIcon } from '../../components/index';
import { Channel } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useChannels, useDeleteChannel } from '../../hooks/useQueries';


export const ChannelsSettings = () => {
    const { 
        t, 
        language,
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen,
        setIsAddChannelModalOpen,
        setIsEditChannelModalOpen,
        setEditingChannel,
        channelTypes
    } = useAppContext();
    
    // Fetch channels using React Query
    const { data: channelsData } = useChannels();
    const channels = Array.isArray(channelsData) 
        ? channelsData 
        : (channelsData?.results || []);
    
    // Delete mutation
    const deleteChannelMutation = useDeleteChannel();

    // Helper function to translate channel type names
    const translateChannelType = (type: string): string => {
        if (!type) return type;
        const typeLower = type.toLowerCase();
        if (typeLower === 'web') return t('web');
        if (typeLower === 'social') return t('social');
        if (typeLower === 'advertising') return t('advertising');
        if (typeLower === 'email') return t('email');
        if (typeLower === 'phone') return t('phone') || 'Phone';
        if (typeLower === 'sms') return t('sms') || 'SMS';
        if (typeLower === 'whatsapp') return t('whatsapp') || 'WhatsApp';
        if (typeLower === 'telegram') return t('telegram') || 'Telegram';
        if (typeLower === 'instagram') return t('instagram') || 'Instagram';
        if (typeLower === 'facebook') return t('facebook') || 'Facebook';
        if (typeLower === 'linkedin') return t('linkedin') || 'LinkedIn';
        if (typeLower === 'twitter') return t('twitter') || 'Twitter';
        if (typeLower === 'tiktok') return t('tikTok') || 'TikTok';
        if (typeLower === 'youtube') return t('youtube') || 'YouTube';
        if (typeLower === 'other') return t('other') || 'Other';
        return type; // Return original if no translation found
    };

    // Get unique channel types from channels (from API)
    const localChannelTypes = React.useMemo(() => {
        if (!channels || !Array.isArray(channels)) return [];
        const types = new Set<string>();
        channels.forEach(c => {
            if (c.type) {
                types.add(c.type);
            }
        });
        return Array.from(types);
    }, [channels]);


    const handleEditChannel = (channel: Channel) => {
        setEditingChannel(channel);
        setIsEditChannelModalOpen(true);
    };

    const handleDeleteChannel = (id: number) => {
        const channel = channels.find(c => c.id === id);
        if (channel) {
            setConfirmDeleteConfig({
                title: t('deleteChannel') || 'Delete Channel',
                message: t('confirmDeleteChannel') || 'Are you sure you want to delete',
                itemName: channel.name,
                onConfirm: async () => {
                    try {
                        await deleteChannelMutation.mutateAsync(id);
                    } catch (error) {
                        console.error('Error deleting channel:', error);
                        throw error;
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{t('activeChannels')}</h2>
                    <Button onClick={() => setIsAddChannelModalOpen(true)}>
                        {language === 'ar' ? (
                            <>{t('addChannel')} <PlusIcon className="w-4 h-4" /></>
                        ) : (
                            <><PlusIcon className="w-4 h-4" /> {t('addChannel')}</>
                        )}
                    </Button>
                </div>
                 <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                                    {t('name')}
                                </th>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                                    {t('type')}
                                </th>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                                    {t('priority')}
                                </th>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[120px]">
                                    {t('actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {channels && channels.length > 0 ? channels.map(channel => (
                                <tr 
                                    key={channel.id} 
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {channel.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            {translateChannelType(channel.type)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            (channel.priority?.toLowerCase() || 'medium') === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                            (channel.priority?.toLowerCase() || 'medium') === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        }`}>
                                            {t((channel.priority?.toLowerCase() || 'medium'))}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`flex items-center gap-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                                                onClick={() => handleEditChannel(channel)}
                                                title={t('edit') || 'Edit'}
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-red-600 dark:text-red-400"
                                                onClick={() => handleDeleteChannel(channel.id)}
                                                title={t('delete') || 'Delete'}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('noChannelsAvailable') || 'No channels available'}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
