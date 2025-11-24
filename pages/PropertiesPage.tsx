

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterIcon, PlusIcon, Dropdown, DropdownItem, Loader, EditIcon, TrashIcon } from '../components/index';
import { Developer, Project, Unit } from '../types';
import { DevelopersFilterDrawer } from '../components/drawers/DevelopersFilterDrawer';
import { ProjectsFilterDrawer } from '../components/drawers/ProjectsFilterDrawer';
import { UnitsFilterDrawer } from '../components/drawers/UnitsFilterDrawer';

type Tab = 'units' | 'projects' | 'developers';

const DevelopersTable = ({ developers, onUpdate, onDelete, isAdmin }: { developers: Developer[], onUpdate: (dev: Developer) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[500px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('name')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {developers.length > 0 ? developers.map(dev => (
                                <tr key={dev.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{dev.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{dev.name}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(dev)}>
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(dev.id)}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="text-center py-10 text-xs sm:text-sm">{t('noDevelopersFound') || 'No developers found'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ProjectsTable = ({ projects, onUpdate, onDelete, isAdmin }: { projects: Project[], onUpdate: (proj: Project) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[800px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('name')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('developer')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('type')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('city')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('paymentMethod')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.length > 0 ? projects.map(proj => (
                                <tr key={proj.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{proj.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{proj.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{proj.developer}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{proj.type}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{proj.city}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{proj.paymentMethod}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(proj)}>
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(proj.id)}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-xs sm:text-sm">{t('noProjectsFound') || 'No projects found'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const UnitsTable = ({ units, onUpdate, onDelete, isAdmin }: { units: Unit[], onUpdate: (unit: Unit) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[1200px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('project')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('bedrooms')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('bathrooms')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('price')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('type')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('finishing')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('city')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell">{t('district')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell">{t('zone')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('status')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {units.length > 0 ? units.map(unit => (
                                <tr key={`${unit.id}-${unit.project}`} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{unit.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{unit.project}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{unit.bedrooms}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{unit.bathrooms}</td>
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{unit.price.toLocaleString()}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{unit.type || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{unit.finishing || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{unit.city || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-xs sm:text-sm">{unit.district || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-xs sm:text-sm">{unit.zone || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">
                                        <span className={`px-2 py-1 text-xs rounded-full ${unit.isSold ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                            {unit.isSold ? t('sold') || 'Sold' : t('available') || 'Available'}
                                        </span>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(unit)}>
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(unit.id)}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={12} className="text-center py-10 text-xs sm:text-sm">{t('noUnitsFound')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export const PropertiesPage = () => {
    const { 
        t,
        currentUser,
        setIsUnitsFilterDrawerOpen,
        setIsDeveloperFilterDrawerOpen,
        setIsProjectFilterDrawerOpen,
        setIsAddDeveloperModalOpen,
        setIsAddProjectModalOpen,
        setIsAddUnitModalOpen,
        units,
        projects,
        developers,
        developerFilters,
        setDeveloperFilters,
        projectFilters,
        setProjectFilters,
        unitFilters,
        setUnitFilters,
        deleteDeveloper,
        setEditingDeveloper,
        setIsEditDeveloperModalOpen,
        setDeletingDeveloper,
        setIsDeleteDeveloperModalOpen,
        deleteProject,
        setEditingProject,
        setIsEditProjectModalOpen,
        updateUnit,
        deleteUnit,
        setEditingUnit,
        setIsEditUnitModalOpen,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen
    } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('units');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: استدعي APIs لتحميل البيانات عند فتح الصفحة (لشركات العقارات فقط)
        // مثال:
        // const loadData = async () => {
        //   try {
        //     const [developersData, projectsData, unitsData] = await Promise.all([
        //       getDevelopersAPI(),
        //       getProjectsAPI(),
        //       getUnitsAPI()
        //     ]);
        //     // TODO: استخدم setDevelopers, setProjects, setUnits من AppContext
        //   } catch (error) {
        //     console.error('Error loading data:', error);
        //   } finally {
        //     setLoading(false);
        //   }
        // };
        // if (isRealEstate) loadData();
        
        // الكود الحالي (للاختبار فقط):
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Check if user's company specialization is real_estate
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';

    // If not real estate, show message or redirect
    if (!isRealEstate) {
        return (
            <PageWrapper title={t('properties')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">{t('realEstateOnly') || 'This page is only available for Real Estate companies.'}</p>
                    </div>
                </Card>
            </PageWrapper>
        );
    }
    
    const isAdmin = currentUser?.role === 'Owner';
    
    const handleFilterClick = () => {
        switch (activeTab) {
            case 'units':
                setIsUnitsFilterDrawerOpen(true);
                break;
            case 'projects':
                setIsProjectFilterDrawerOpen(true);
                break;
            case 'developers':
                setIsDeveloperFilterDrawerOpen(true);
                break;
        }
    };

    const getAddButtonLabel = () => {
        switch (activeTab) {
            case 'units': return t('addUnit');
            case 'projects': return t('addProject');
            case 'developers': return t('addDeveloper');
            default: return t('createNew');
        }
    };

    const handleAddClick = () => {
        switch (activeTab) {
            case 'units':
                setIsAddUnitModalOpen(true);
                break;
            case 'projects':
                setIsAddProjectModalOpen(true);
                break;
            case 'developers':
                setIsAddDeveloperModalOpen(true);
                break;
        }
    };
    
    const pageActions = (
        <>
            <Button variant="secondary" onClick={handleFilterClick}>
                <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
            </Button>
            {isAdmin && (
                <Button onClick={handleAddClick}>
                    <PlusIcon className="w-4 h-4"/> {getAddButtonLabel()}
                </Button>
            )}
        </>
    );

    const handleDeleteDeveloper = (id: number) => {
        const developer = developers.find(d => d.id === id);
        if (developer) {
            setDeletingDeveloper(developer);
            setIsDeleteDeveloperModalOpen(true);
        }
    };

    const handleUpdateDeveloper = (dev: Developer) => {
        setEditingDeveloper(dev);
        setIsEditDeveloperModalOpen(true);
    };
    
    const handleDeleteProject = (id: number) => {
        const project = projects.find(p => p.id === id);
        if (project) {
            setConfirmDeleteConfig({
                title: t('deleteProject') || 'Delete Project',
                message: t('confirmDeleteProject') || 'Are you sure you want to delete',
                itemName: project.name,
                onConfirm: async () => {
                    await deleteProject(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdateProject = (proj: Project) => {
        setEditingProject(proj);
        setIsEditProjectModalOpen(true);
    };

    const handleUpdateUnit = (unit: Unit) => {
        setEditingUnit(unit);
        setIsEditUnitModalOpen(true);
    };

    const handleDeleteUnit = (id: number) => {
        const unit = units.find(u => u.id === id);
        if (unit) {
            setConfirmDeleteConfig({
                title: t('deleteUnit') || 'Delete Unit',
                message: t('confirmDeleteUnit') || 'Are you sure you want to delete',
                itemName: unit.code,
                onConfirm: async () => {
                    await deleteUnit(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    // Filter data based on filters
    const filteredDevelopers = useMemo(() => {
        let filtered = developers;
        if (developerFilters.search) {
            const searchLower = developerFilters.search.toLowerCase();
            filtered = filtered.filter(dev => 
                dev.name.toLowerCase().includes(searchLower) || 
                dev.code.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [developers, developerFilters]);

    const filteredProjects = useMemo(() => {
        let filtered = projects;
        if (projectFilters.developer && projectFilters.developer !== 'All') {
            filtered = filtered.filter(proj => proj.developer === projectFilters.developer);
        }
        if (projectFilters.type && projectFilters.type !== 'All') {
            filtered = filtered.filter(proj => proj.type === projectFilters.type);
        }
        if (projectFilters.city && projectFilters.city !== 'All') {
            filtered = filtered.filter(proj => proj.city === projectFilters.city);
        }
        if (projectFilters.paymentMethod && projectFilters.paymentMethod !== 'All') {
            filtered = filtered.filter(proj => proj.paymentMethod === projectFilters.paymentMethod);
        }
        if (projectFilters.search) {
            const searchLower = projectFilters.search.toLowerCase();
            filtered = filtered.filter(proj => 
                proj.name.toLowerCase().includes(searchLower) || 
                proj.code.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [projects, projectFilters]);

    const filteredUnits = useMemo(() => {
        let filtered = units;
        if (unitFilters.project && unitFilters.project !== 'All') {
            filtered = filtered.filter(unit => unit.project === unitFilters.project);
        }
        if (unitFilters.type && unitFilters.type !== 'All') {
            filtered = filtered.filter(unit => unit.type === unitFilters.type);
        }
        if (unitFilters.finishing && unitFilters.finishing !== 'All') {
            filtered = filtered.filter(unit => unit.finishing === unitFilters.finishing);
        }
        if (unitFilters.city && unitFilters.city !== 'All') {
            filtered = filtered.filter(unit => unit.city === unitFilters.city);
        }
        if (unitFilters.district && unitFilters.district !== 'All') {
            filtered = filtered.filter(unit => unit.district === unitFilters.district);
        }
        if (unitFilters.zone && unitFilters.zone !== 'All') {
            filtered = filtered.filter(unit => unit.zone === unitFilters.zone);
        }
        if (unitFilters.isSold && unitFilters.isSold !== 'All') {
            filtered = filtered.filter(unit => unit.isSold === (unitFilters.isSold === 'true'));
        }
        if (unitFilters.bedrooms && unitFilters.bedrooms !== 'All') {
            filtered = filtered.filter(unit => unit.bedrooms === parseInt(unitFilters.bedrooms));
        }
        if (unitFilters.bathrooms && unitFilters.bathrooms !== 'All') {
            filtered = filtered.filter(unit => unit.bathrooms === parseInt(unitFilters.bathrooms));
        }
        if (unitFilters.priceMin) {
            const minPrice = parseFloat(unitFilters.priceMin);
            if (!isNaN(minPrice)) {
                filtered = filtered.filter(unit => unit.price >= minPrice);
            }
        }
        if (unitFilters.priceMax) {
            const maxPrice = parseFloat(unitFilters.priceMax);
            if (!isNaN(maxPrice)) {
                filtered = filtered.filter(unit => unit.price <= maxPrice);
            }
        }
        if (unitFilters.search) {
            const searchLower = unitFilters.search.toLowerCase();
            filtered = filtered.filter(unit => 
                unit.code.toLowerCase().includes(searchLower) || 
                unit.project.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [units, unitFilters]);

    const renderContent = () => {
        switch (activeTab) {
            case 'units':
                return (
                    <Card>
                        <UnitsTable units={filteredUnits} onUpdate={handleUpdateUnit} onDelete={handleDeleteUnit} isAdmin={isAdmin} />
                    </Card>
                );
            case 'projects':
                return (
                    <Card>
                        <ProjectsTable projects={filteredProjects} onUpdate={handleUpdateProject} onDelete={handleDeleteProject} isAdmin={isAdmin} />
                    </Card>
                );
            case 'developers':
                return (
                    <Card>
                        <DevelopersTable developers={filteredDevelopers} onUpdate={handleUpdateDeveloper} onDelete={handleDeleteDeveloper} isAdmin={isAdmin} />
                    </Card>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <PageWrapper title={t('properties')} actions={pageActions}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper title={t('properties')} actions={pageActions}>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                <nav className="-mb-px flex space-x-4 rtl:space-x-reverse min-w-max" aria-label="Tabs">
                    <button onClick={() => setActiveTab('units')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'units' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('units')}</button>
                    <button onClick={() => setActiveTab('projects')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('projects')}</button>
                    <button onClick={() => setActiveTab('developers')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'developers' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('developers')}</button>
                </nav>
            </div>
            {renderContent()}
            <DevelopersFilterDrawer />
            <ProjectsFilterDrawer />
            <UnitsFilterDrawer />
        </PageWrapper>
    );
};
