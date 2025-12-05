

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterIcon, PlusIcon, EyeIcon, WhatsappIcon, Loader } from '../components/index';
import { TrashIcon } from '../components/icons';
import { Lead } from '../types';

export const LeadsPage = () => {
    const { 
        t, 
        currentPage,
        setCurrentPage, 
        setSelectedLead, 
        setIsAddLeadModalOpen, 
        setIsAddActionModalOpen, 
        setIsAssignLeadModalOpen, 
        setIsFilterDrawerOpen,
        checkedLeadIds,
        setCheckedLeadIds,
        leads: allLeads,
        currentUser,
        users,
        leadFilters,
        setLeadFilters,
        statuses,
        deleteLead,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
    } = useAppContext();
    
    // Get status filters from settings (non-hidden statuses) or use defaults
    const leadStatusFilters: Lead['status'][] = React.useMemo(() => {
        const defaultFilters: Lead['status'][] = ['All', 'Untouched', 'Touched', 'Following', 'Meeting', 'No Answer', 'Out Of Service'];
        if (statuses.length > 0) {
            const statusNames = statuses
                .filter(s => !s.isHidden)
                .map(s => s.name as Lead['status']);
            return ['All', ...statusNames];
        }
        return defaultFilters;
    }, [statuses]);
    const [activeStatusFilter, setActiveStatusFilter] = useState<Lead['status']>('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: استدعي API لتحميل Leads عند فتح الصفحة
        // مثال:
        // const loadLeads = async () => {
        //   try {
        //     const filters = { type: currentPage, status: activeStatusFilter };
        //     const leadsData = await getLeadsAPI(filters);
        //     // TODO: استخدم setLeads من AppContext لتحديث البيانات
        //     // لكن هذا يحتاج تعديل AppContext لإضافة setLeads
        //   } catch (error) {
        //     console.error('Error loading leads:', error);
        //   } finally {
        //     setLoading(false);
        //   }
        // };
        // loadLeads();
        
        // الكود الحالي (للاختبار فقط):
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, [currentPage, activeStatusFilter]);

    const handleViewLead = (lead: Lead) => {
        setSelectedLead(lead);
        setCurrentPage('ViewLead');
    };

    const handleDeleteLead = (lead: Lead) => {
        setConfirmDeleteConfig({
            title: t('deleteLead') || 'Delete Lead',
            message: t('confirmDeleteLead') || 'Are you sure you want to delete',
            itemName: lead.name,
            onConfirm: async () => {
                try {
                    await deleteLead(lead.id);
                } catch (error: any) {
                    console.error('Error deleting lead:', error);
                    throw error; // Let ConfirmDeleteModal handle the error display
                }
            },
        });
        setIsConfirmDeleteModalOpen(true);
    };

    // Check if user can delete a lead (admin or assigned employee)
    const canDeleteLead = (lead: Lead) => {
        const isAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'admin';
        const isAssignedEmployee = lead.assignedTo === currentUser?.id;
        return isAdmin || isAssignedEmployee;
    };

    // FIX: Convert page title to camelCase to match translation keys and cast to the correct type.
    const pageTitleKey = (currentPage.charAt(0).toLowerCase() + currentPage.slice(1).replace(/\s/g, '')) as Parameters<typeof t>[0];
    const pageTitle = t(pageTitleKey);
    
    const filteredLeads = useMemo(() => {
        let leads = allLeads;
        
        // 1. Filter by sidebar page type
        switch (currentPage) {
            case 'Fresh Leads': leads = leads.filter(l => l.type === 'Fresh'); break;
            case 'Cold Leads': leads = leads.filter(l => l.type === 'Cold'); break;
            case 'My Leads': 
                if (currentUser?.id) {
                    leads = leads.filter(l => l.assignedTo === currentUser.id);
                }
                break;
            case 'Rotated Leads': leads = leads.filter(l => l.type === 'Rotated'); break;
            default: break; // All Leads
        }

        // 2. Filter by quick status tabs
        if(activeStatusFilter !== 'All') {
            leads = leads.filter(l => l.status === activeStatusFilter);
        }

        // 3. Apply filters from FilterDrawer
        if (leadFilters.status && leadFilters.status !== 'All') {
            leads = leads.filter(l => l.status === leadFilters.status);
        }

        if (leadFilters.type && leadFilters.type !== 'All') {
            leads = leads.filter(l => l.type === leadFilters.type);
        }

        if (leadFilters.priority && leadFilters.priority !== 'All') {
            leads = leads.filter(l => l.priority === leadFilters.priority);
        }

        if (leadFilters.assignedTo && leadFilters.assignedTo !== 'All') {
            leads = leads.filter(l => l.assignedTo === parseInt(leadFilters.assignedTo));
        }

        if (leadFilters.communicationWay && leadFilters.communicationWay !== 'All') {
            leads = leads.filter(l => l.communicationWay === leadFilters.communicationWay);
        }

        if (leadFilters.budgetMin) {
            const minBudget = parseFloat(leadFilters.budgetMin);
            if (!isNaN(minBudget)) {
                leads = leads.filter(l => l.budget >= minBudget);
            }
        }

        if (leadFilters.budgetMax) {
            const maxBudget = parseFloat(leadFilters.budgetMax);
            if (!isNaN(maxBudget)) {
                leads = leads.filter(l => l.budget <= maxBudget);
            }
        }

        if (leadFilters.createdAtFrom) {
            leads = leads.filter(l => {
                if (!l.createdAt) return false;
                const leadDate = new Date(l.createdAt);
                const filterDate = new Date(leadFilters.createdAtFrom);
                return leadDate >= filterDate;
            });
        }

        if (leadFilters.createdAtTo) {
            leads = leads.filter(l => {
                if (!l.createdAt) return false;
                const leadDate = new Date(l.createdAt);
                const filterDate = new Date(leadFilters.createdAtTo);
                // Set to end of day for inclusive comparison
                filterDate.setHours(23, 59, 59, 999);
                return leadDate <= filterDate;
            });
        }

        if (leadFilters.search) {
            const searchLower = leadFilters.search.toLowerCase();
            leads = leads.filter(l => 
                l.name.toLowerCase().includes(searchLower) || 
                l.phone.includes(searchLower)
            );
        }

        return leads;
    }, [currentPage, activeStatusFilter, allLeads, leadFilters, currentUser]);

    const handleCheckChange = (leadId: number, isChecked: boolean) => {
        setCheckedLeadIds(prev => {
            const newSet = new Set(prev);
            if(isChecked) {
                newSet.add(leadId);
            } else {
                newSet.delete(leadId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (isChecked: boolean) => {
        if(isChecked) {
            setCheckedLeadIds(new Set(filteredLeads.map(l => l.id)));
        } else {
            setCheckedLeadIds(new Set());
        }
    };
    
    const isAllSelected = filteredLeads.length > 0 && checkedLeadIds.size === filteredLeads.length;

    if (loading) {
        return (
            <PageWrapper title={pageTitle}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    // Check if current user is admin (Owner role)
    const isAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'admin';

    return (
        <PageWrapper 
            title={pageTitle}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsFilterDrawerOpen(true)} className="w-full sm:w-auto"><FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span></Button>
                    <Button onClick={() => setCurrentPage('CreateLead')} className="w-full sm:w-auto"><PlusIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('addLead')}</span></Button>
                    {isAdmin && (
                        <Button variant="secondary" onClick={() => setIsAssignLeadModalOpen(true)} disabled={checkedLeadIds.size === 0} className="w-full sm:w-auto">{t('assignLead')}</Button>
                    )}
                </>
            }
        >
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto scrollbar-thin">
                {leadStatusFilters.map(status => {
                    const count = status === 'All' ? allLeads.length : allLeads.filter(l => l.status === status).length;
                    return (
                        <button 
                            key={status}
                            onClick={() => setActiveStatusFilter(status)}
                            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${activeStatusFilter === status ? 'border-b-2 border-primary text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                        >
                           {t(status.replace(' ', '').toLowerCase() as any) || status} <span className="hidden sm:inline">({count})</span>
                        </button>
                    )
                })}
            </div>
            <Card>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                        <div className="overflow-hidden">
                            <table className="w-full text-sm text-left rtl:text-right min-w-[1200px]">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th scope="col" className="p-2 sm:p-4"><input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={isAllSelected} className="rounded" /></th>
                                        <th scope="col" className="px-3 sm:px-6 py-3">{t('name')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3">{t('phone')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell">{t('type')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('priority')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell">{t('budget')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell">{t('assignedTo')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell">{t('communicationWay')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('status')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('lastFeedback')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell max-w-xs">{t('notes')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell">{t('createdAt')}</th>
                                        <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.map(lead => {
                                        const assignedUser = lead.assignedTo > 0 ? users.find(u => u.id === lead.assignedTo) : null;
                                        return (
                                            <tr key={lead.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="p-2 sm:p-4"><input type="checkbox" checked={checkedLeadIds.has(lead.id)} onChange={(e) => handleCheckChange(lead.id, e.target.checked)} className="rounded" /></td>
                                                <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{lead.name}</td>
                                                <td className="px-3 sm:px-6 py-4">
                                                    <div className="flex flex-col gap-2">
                                                        {lead.phoneNumbers && lead.phoneNumbers.length > 0 ? (
                                                            lead.phoneNumbers.map((pn) => (
                                                                <div key={pn.id} className="flex items-center gap-2">
                                                                    <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap text-sm">
                                                                        {pn.phone_number}
                                                                        {pn.is_primary && (
                                                                            <span className="ml-1 text-xs text-primary">({t('primary') || 'Primary'})</span>
                                                                        )}
                                                                    </span>
                                                                    <a 
                                                                        href={`https://wa.me/${pn.phone_number.replace(/[^0-9]/g, '')}`} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex-shrink-0"
                                                                        title={`${t('openWhatsApp') || 'Open WhatsApp'} - ${pn.phone_type}`}
                                                                    >
                                                                        <WhatsappIcon className="w-4 h-4"/>
                                                                        <span className="text-xs font-medium hidden sm:inline">{t('whatsapp') || 'WhatsApp'}</span>
                                                                    </a>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap">{lead.phone}</span>
                                                                {lead.phone && (
                                                                    <a 
                                                                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex-shrink-0"
                                                                        title={t('openWhatsApp') || 'Open WhatsApp'}
                                                                    >
                                                                        <WhatsappIcon className="w-4 h-4"/>
                                                                        <span className="text-xs font-medium hidden sm:inline">{t('whatsapp') || 'WhatsApp'}</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        lead.type === 'Fresh' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                        lead.type === 'Cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                    }`}>
                                                        {lead.type}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        lead.priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                        lead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                    }`}>
                                                        {lead.priority}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {lead.budget > 0 ? lead.budget.toLocaleString() : '-'}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {assignedUser ? assignedUser.name : '-'}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap">{lead.communicationWay || '-'}</td>
                                                <td className="px-3 sm:px-6 py-4 hidden md:table-cell">
                                                    {(() => {
                                                        // Find status from settings by name
                                                        const statusConfig = statuses.find(s => s.name === lead.status);
                                                        const statusColor = statusConfig?.color || '#808080';
                                                        
                                                        // Convert hex to RGB for background opacity
                                                        const hexToRgb = (hex: string) => {
                                                            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                                            return result ? {
                                                                r: parseInt(result[1], 16),
                                                                g: parseInt(result[2], 16),
                                                                b: parseInt(result[3], 16)
                                                            } : null;
                                                        };
                                                        
                                                        const rgb = hexToRgb(statusColor);
                                                        const bgColor = rgb 
                                                            ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
                                                            : 'bg-gray-100 dark:bg-gray-700';
                                                        const textColor = rgb
                                                            ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
                                                            : 'text-gray-800 dark:text-gray-200';
                                                        
                                                        return (
                                                            <span 
                                                                className={`px-2 py-1 rounded-full text-xs font-medium ${!rgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                                style={rgb ? {
                                                                    backgroundColor: bgColor,
                                                                    color: textColor,
                                                                } : {}}
                                                            >
                                                                {lead.status}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-gray-900 dark:text-gray-100 max-w-xs truncate">{lead.lastFeedback || '-'}</td>
                                                <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-gray-900 dark:text-gray-100 max-w-xs truncate">{lead.notes || '-'}</td>
                                                <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-gray-900 dark:text-gray-100 whitespace-nowrap">{lead.createdAt || '-'}</td>
                                                <td className="px-3 sm:px-6 py-4">
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <button 
                                                            className="p-1 h-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" 
                                                            onClick={() => handleViewLead(lead)}
                                                            title={t('view') || 'View'}
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        {canDeleteLead(lead) && (
                                                            <button 
                                                                className="p-1 h-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                                                onClick={() => handleDeleteLead(lead)}
                                                                title={t('delete') || 'Delete'}
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Card>
        </PageWrapper>
    );
};