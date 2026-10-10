

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterButton, RefreshButton, PlusIcon, Dropdown, DropdownItem, Loader, EditIcon, TrashIcon, TableHorizontalScroll, hasActiveFilters, Pagination, IconButton } from '../components/index';
import { DEFAULT_UNIT_FILTERS } from '../components/drawers/UnitsFilterDrawer';
import { DEFAULT_PROJECT_FILTERS } from '../components/drawers/ProjectsFilterDrawer';
import { DEFAULT_DEVELOPER_FILTERS } from '../components/drawers/DevelopersFilterDrawer';
import { Developer, Project, Unit } from '../types';
import { useDevelopers, useProjects, useUnits, useDeleteDeveloper, useDeleteProject, useDeleteUnit } from '../hooks/useQueries';
import { normalizeRole } from '../utils/roles';
import { PAGE_TAB_ACTIVE, PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
import { withLatinDigits } from '../utils/dateUtils';
import { usePersistedPageSize } from '../hooks/usePersistedPageSize';
import { usePersistedTab } from '../hooks/usePersistedTab';

type Tab = 'units' | 'projects' | 'developers';
const PROPERTY_TABS = ['units', 'projects', 'developers'] as const;

/** Normalized for table display: related entity is always a label string. */
type DisplayProject = Omit<Project, 'developer'> & { developer: string };
type DisplayUnit = Omit<Unit, 'project'> & { project: string; projectId?: number | null };

const formatInventoryRef = (
    value: string | number | { id: number; name?: string } | null | undefined
): string => {
    if (value == null || value === '') return '-';
    if (typeof value === 'object') return value.name?.trim() || String(value.id);
    return String(value);
};

const DevelopersTable = ({ developers, onUpdate, onDelete, isAdmin }: { developers: Developer[]; onUpdate: (dev: Developer) => void; onDelete: (id: number) => void; isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0">
            <div className="min-w-full block">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[500px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('name')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {developers.length > 0 ? developers.map(dev => (
                                <tr key={dev.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm whitespace-nowrap text-center">{dev.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm whitespace-nowrap text-center">{dev.name}</td>
                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {isAdmin && (
                                                <IconButton icon={<EditIcon className="h-4 w-4" />} label={t('edit')} onClick={() => onUpdate(dev)} />
                                            )}
                                            {isAdmin && (
                                                <IconButton icon={<TrashIcon className="h-4 w-4" />} label={t('delete')} tone="danger" onClick={() => onDelete(dev.id)} />
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
        </TableHorizontalScroll>
    );
};

const ProjectsTable = ({ projects, onUpdate, onDelete, isAdmin }: { projects: DisplayProject[]; onUpdate: (proj: DisplayProject) => void; onDelete: (id: number) => void; isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0">
            <div className="min-w-full block">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[800px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('name')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell text-center">{t('developer')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell text-center">{t('type')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell text-center">{t('city')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell text-center">{t('paymentMethod')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.length > 0 ? projects.map(proj => (
                                <tr key={proj.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm whitespace-nowrap text-center">{proj.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm whitespace-nowrap text-center">{proj.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{formatInventoryRef(proj.developer)}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{proj.type || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{proj.city || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{proj.paymentMethod || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {isAdmin && (
                                                <IconButton icon={<EditIcon className="h-4 w-4" />} label={t('edit')} onClick={() => onUpdate(proj)} />
                                            )}
                                            {isAdmin && (
                                                <IconButton icon={<TrashIcon className="h-4 w-4" />} label={t('delete')} tone="danger" onClick={() => onDelete(proj.id)} />
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
        </TableHorizontalScroll>
    );
}

const UnitsTable = ({ units, onUpdate, onDelete, isAdmin }: { units: DisplayUnit[]; onUpdate: (unit: DisplayUnit) => void; onDelete: (id: number) => void; isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0">
            <div className="min-w-full block">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[1200px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('project')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell text-center">{t('bedrooms')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell text-center">{t('bathrooms')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('price')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell text-center">{t('type')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell text-center">{t('finishing')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell text-center">{t('city')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell text-center">{t('district')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden xl:table-cell text-center">{t('zone')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell text-center">{t('status')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {units.length > 0 ? units.map(unit => {
                                // Format price like budget: comma-separated with trailing zeros removed
                                const formattedPrice = (() => {
                                    const num = Number(unit.price);
                                    const formatted = num.toLocaleString('en-US', withLatinDigits({ 
                                        minimumFractionDigits: 0, 
                                        maximumFractionDigits: 2 
                                    }));
                                    return formatted.replace(/\.0+$/, '');
                                })();
                                
                                return (
                                    <tr key={`${unit.id}-${unit.project}`} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm whitespace-nowrap text-center">{unit.code}</td>
                                        <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm whitespace-nowrap text-center">{formatInventoryRef(unit.project)}</td>
                                        <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{unit.bedrooms}</td>
                                        <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{unit.bathrooms}</td>
                                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm whitespace-nowrap text-center">{formattedPrice}</td>
                                        <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{unit.type || '-'}</td>
                                        <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{unit.finishing || '-'}</td>
                                        <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{unit.city || '-'}</td>
                                        <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{unit.district || '-'}</td>
                                        <td className="px-3 sm:px-6 py-4 hidden xl:table-cell text-xs sm:text-sm whitespace-nowrap text-center">{unit.zone || '-'}</td>
                                        <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full ${unit.isSold ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                                {unit.isSold ? t('sold') || 'Sold' : t('available') || 'Available'}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {isAdmin && (
                                                    <IconButton icon={<EditIcon className="h-4 w-4" />} label={t('edit')} onClick={() => onUpdate(unit)} />
                                                )}
                                                {isAdmin && (
                                                    <IconButton icon={<TrashIcon className="h-4 w-4" />} label={t('delete')} tone="danger" onClick={() => onDelete(unit.id)} />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={12} className="text-center py-10 text-xs sm:text-sm">{t('noUnitsFound')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </TableHorizontalScroll>
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
        developerFilters,
        setDeveloperFilters,
        projectFilters,
        setProjectFilters,
        unitFilters,
        setUnitFilters,
        setEditingDeveloper,
        setIsEditDeveloperModalOpen,
        setDeletingDeveloper,
        setIsDeleteDeveloperModalOpen,
        setEditingProject,
        setIsEditProjectModalOpen,
        setEditingUnit,
        setIsEditUnitModalOpen,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        hasSupervisorPermission
    } = useAppContext();

    const [developersPageNumber, setDevelopersPageNumber] = useState(1);
    const [projectsPageNumber, setProjectsPageNumber] = useState(1);
    const [unitsPageNumber, setUnitsPageNumber] = useState(1);
    const [developersPageSize, setDevelopersPageSize] = usePersistedPageSize('properties:developers');
    const [projectsPageSize, setProjectsPageSize] = usePersistedPageSize('properties:projects');
    const [unitsPageSize, setUnitsPageSize] = usePersistedPageSize('properties:units');

    // Fetch data using React Query
    const { data: developersResponse, isLoading: developersLoading, isFetching: developersFetching, refetch: refetchDevelopers } = useDevelopers(developersPageNumber, undefined, developersPageSize);
    const developers: Developer[] = developersResponse?.results || [];

    const { data: projectsResponse, isLoading: projectsLoading, isFetching: projectsFetching, refetch: refetchProjects } = useProjects(projectsPageNumber, undefined, projectsPageSize);
    const projectsRaw = projectsResponse?.results || [];
    
    // Transform projects: convert developer from object/ID to string name, and normalize paymentMethod
    const projects = useMemo((): DisplayProject[] => {
        return projectsRaw.map((proj: any): DisplayProject => {
            let developerName = '';
            if (typeof proj.developer === 'object' && proj.developer?.name) {
                developerName = proj.developer.name;
            } else if (typeof proj.developer === 'number') {
                const dev = developers.find((d) => d.id === proj.developer);
                developerName = dev?.name || '';
            } else if (typeof proj.developer === 'string') {
                developerName = proj.developer;
            }
            
            // Handle paymentMethod: API might return payment_method (snake_case) or paymentMethod (camelCase)
            const paymentMethod = proj.paymentMethod || proj.payment_method || '';
            
            return {
                id: Number(proj.id),
                code: String(proj.code || ''),
                name: String(proj.name || ''),
                type: String(proj.type || ''),
                city: String(proj.city || ''),
                developer: developerName,
                paymentMethod: paymentMethod,
            };
        });
    }, [projectsRaw, developers]);

    const { data: unitsResponse, isLoading: unitsLoading, isFetching: unitsFetching, refetch: refetchUnits } = useUnits(unitFilters, unitsPageNumber, undefined, unitsPageSize);
    const unitsRaw = unitsResponse?.results || [];
    
    // Transform units: keep project name for display + projectId for filter matching
    const units = useMemo((): DisplayUnit[] => {
        return unitsRaw.map((unit: any): DisplayUnit => {
            let projectName = '';
            let projectId: number | null = null;
            if (typeof unit.project === 'object' && unit.project?.name) {
                projectName = unit.project.name;
                projectId = unit.project.id ?? null;
            } else if (typeof unit.project === 'number') {
                projectId = unit.project;
                const proj = projectsRaw.find((p: any) => p.id === unit.project);
                projectName = proj?.name || '';
            } else if (typeof unit.project === 'string') {
                projectName = unit.project;
                const proj = projectsRaw.find((p: any) => p.name === unit.project);
                projectId = proj?.id ?? null;
            }

            return {
                id: Number(unit.id),
                code: String(unit.code || ''),
                name: unit.name,
                project: projectName,
                projectId,
                bedrooms: Number(unit.bedrooms) || 0,
                bathrooms: Number(unit.bathrooms) || 0,
                price: Number(unit.price) || 0,
                type: String(unit.type || ''),
                finishing: String(unit.finishing || ''),
                city: String(unit.city || ''),
                district: String(unit.district || ''),
                zone: String(unit.zone || ''),
                lounge: unit.lounge,
                area: unit.area,
                isSold: Boolean(unit.is_sold ?? unit.isSold),
            };
        });
    }, [unitsRaw, projectsRaw]);

    // Delete mutations
    const deleteDeveloperMutation = useDeleteDeveloper();
    const deleteProjectMutation = useDeleteProject();
    const deleteUnitMutation = useDeleteUnit();

    const [activeTab, setActiveTab] = usePersistedTab<Tab>(
        'properties',
        PROPERTY_TABS,
        'units',
        ['propertiesActiveTab'],
    );
    useEffect(() => {
        setDevelopersPageNumber(1);
    }, [developerFilters.search]);
    useEffect(() => {
        setDevelopersPageNumber(1);
    }, [developersPageSize]);

    useEffect(() => {
        setProjectsPageNumber(1);
    }, [projectFilters.developer, projectFilters.type, projectFilters.city, projectFilters.paymentMethod, projectFilters.search]);
    useEffect(() => {
        setProjectsPageNumber(1);
    }, [projectsPageSize]);

    useEffect(() => {
        setUnitsPageNumber(1);
    }, [unitFilters]);
    useEffect(() => {
        setUnitsPageNumber(1);
    }, [unitsPageSize]);

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
    
    const currentRole = normalizeRole(currentUser?.role);
    const isAdmin = currentRole === 'Owner' || (currentRole === 'Supervisor' && hasSupervisorPermission('can_manage_real_estate'));
    
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
            <FilterButton
                onClick={handleFilterClick}
                hasActiveFilters={
                    activeTab === 'units'
                        ? hasActiveFilters(unitFilters, DEFAULT_UNIT_FILTERS)
                        : activeTab === 'projects'
                          ? hasActiveFilters(projectFilters, DEFAULT_PROJECT_FILTERS)
                          : hasActiveFilters(developerFilters, DEFAULT_DEVELOPER_FILTERS)
                }
            />
            <RefreshButton
                onClick={() => {
                    if (activeTab === 'units') void refetchUnits();
                    else if (activeTab === 'projects') void refetchProjects();
                    else void refetchDevelopers();
                }}
                loading={
                    activeTab === 'units'
                        ? unitsFetching && !unitsLoading
                        : activeTab === 'projects'
                          ? projectsFetching && !projectsLoading
                          : developersFetching && !developersLoading
                }
            />
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
                    try {
                        await deleteProjectMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting project:', error);
                        throw error;
                    }
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
                    try {
                        await deleteUnitMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting unit:', error);
                        throw error;
                    }
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
            filtered = filtered.filter(proj => {
                const developerName = proj.developer || '';
                return developerName === projectFilters.developer;
            });
        }
        if (projectFilters.type && projectFilters.type !== 'All') {
            filtered = filtered.filter(proj => {
                const type = proj.type || '';
                return type === projectFilters.type;
            });
        }
        if (projectFilters.city && projectFilters.city !== 'All') {
            filtered = filtered.filter(proj => {
                const city = proj.city || '';
                return city === projectFilters.city;
            });
        }
        if (projectFilters.paymentMethod && projectFilters.paymentMethod !== 'All') {
            filtered = filtered.filter(proj => {
                const paymentMethod = proj.paymentMethod || '';
                return paymentMethod === projectFilters.paymentMethod;
            });
        }
        if (projectFilters.search) {
            const searchLower = projectFilters.search.toLowerCase();
            filtered = filtered.filter(proj => 
                (proj.name || '').toLowerCase().includes(searchLower) || 
                (proj.code || '').toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [projects, projectFilters]);

    const filteredUnits = useMemo(() => {
        let filtered = units;
        if (unitFilters.project && unitFilters.project !== 'All') {
            filtered = filtered.filter((unit) => {
                // Prefer id match (drawer stores project id); fall back to name for legacy values
                if (unit.projectId != null && String(unit.projectId) === unitFilters.project) return true;
                return (unit.project || '') === unitFilters.project;
            });
        }
        if (unitFilters.type && unitFilters.type !== 'All') {
            filtered = filtered.filter(unit => {
                const type = unit.type || '';
                return type === unitFilters.type;
            });
        }
        if (unitFilters.finishing && unitFilters.finishing !== 'All') {
            filtered = filtered.filter(unit => {
                const finishing = unit.finishing || '';
                return finishing === unitFilters.finishing;
            });
        }
        if (unitFilters.city && unitFilters.city !== 'All') {
            filtered = filtered.filter(unit => {
                const city = unit.city || '';
                return city === unitFilters.city;
            });
        }
        if (unitFilters.district && unitFilters.district !== 'All') {
            filtered = filtered.filter(unit => {
                const district = unit.district || '';
                return district === unitFilters.district;
            });
        }
        if (unitFilters.zone && unitFilters.zone !== 'All') {
            filtered = filtered.filter(unit => {
                const zone = unit.zone || '';
                return zone === unitFilters.zone;
            });
        }
        if (unitFilters.isSold && unitFilters.isSold !== 'All') {
            filtered = filtered.filter(unit => unit.isSold === (unitFilters.isSold === 'true'));
        }
        if (unitFilters.bedrooms && unitFilters.bedrooms !== 'All') {
            const bedroomsFilter = parseInt(unitFilters.bedrooms);
            if (!isNaN(bedroomsFilter)) {
                filtered = filtered.filter(unit => unit.bedrooms === bedroomsFilter);
            }
        }
        if (unitFilters.bathrooms && unitFilters.bathrooms !== 'All') {
            const bathroomsFilter = parseInt(unitFilters.bathrooms);
            if (!isNaN(bathroomsFilter)) {
                filtered = filtered.filter(unit => unit.bathrooms === bathroomsFilter);
            }
        }
        if (unitFilters.priceMin) {
            const minPrice = parseFloat(unitFilters.priceMin);
            if (!isNaN(minPrice)) {
                filtered = filtered.filter(unit => (unit.price || 0) >= minPrice);
            }
        }
        if (unitFilters.priceMax) {
            const maxPrice = parseFloat(unitFilters.priceMax);
            if (!isNaN(maxPrice)) {
                filtered = filtered.filter(unit => (unit.price || 0) <= maxPrice);
            }
        }
        if (unitFilters.search) {
            const searchLower = unitFilters.search.toLowerCase();
            filtered = filtered.filter(unit => 
                (unit.code || '').toLowerCase().includes(searchLower) || 
                (unit.project || '').toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [units, unitFilters]);

    const renderContent = () => {
        const developersTotalPages = Math.max(1, Math.ceil((developersResponse?.count || 0) / developersPageSize));
        const projectsTotalPages = Math.max(1, Math.ceil((projectsResponse?.count || 0) / projectsPageSize));
        const unitsTotalPages = Math.max(1, Math.ceil((unitsResponse?.count || 0) / unitsPageSize));

        switch (activeTab) {
            case 'units':
                return (
                    <Card>
                        <UnitsTable units={filteredUnits} onUpdate={handleUpdateUnit} onDelete={handleDeleteUnit} isAdmin={isAdmin} />
                        <Pagination
                            page={unitsPageNumber}
                            totalPages={unitsTotalPages}
                            onPageChange={setUnitsPageNumber}
                            pageSize={unitsPageSize}
                            onPageSizeChange={setUnitsPageSize}
                            hasPrevious={Boolean(unitsResponse?.previous)}
                            hasNext={Boolean(unitsResponse?.next)}
                        />
                    </Card>
                );
            case 'projects':
                return (
                    <Card>
                        <ProjectsTable projects={filteredProjects} onUpdate={handleUpdateProject} onDelete={handleDeleteProject} isAdmin={isAdmin} />
                        <Pagination
                            page={projectsPageNumber}
                            totalPages={projectsTotalPages}
                            onPageChange={setProjectsPageNumber}
                            pageSize={projectsPageSize}
                            onPageSizeChange={setProjectsPageSize}
                            hasPrevious={Boolean(projectsResponse?.previous)}
                            hasNext={Boolean(projectsResponse?.next)}
                        />
                    </Card>
                );
            case 'developers':
                return (
                    <Card>
                        <DevelopersTable developers={filteredDevelopers} onUpdate={handleUpdateDeveloper} onDelete={handleDeleteDeveloper} isAdmin={isAdmin} />
                        <Pagination
                            page={developersPageNumber}
                            totalPages={developersTotalPages}
                            onPageChange={setDevelopersPageNumber}
                            pageSize={developersPageSize}
                            onPageSizeChange={setDevelopersPageSize}
                            hasPrevious={Boolean(developersResponse?.previous)}
                            hasNext={Boolean(developersResponse?.next)}
                        />
                    </Card>
                );
            default:
                return null;
        }
    };

    const isLoading = developersLoading || projectsLoading || unitsLoading;

    if (isLoading) {
        return (
            <PageWrapper title={t('properties')} actions={pageActions}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader size="lg" variant="primary"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper title={t('properties')} actions={pageActions}>
            <div className="mb-4 overflow-x-auto overflow-y-hidden border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex min-w-max space-x-4 rtl:space-x-reverse" aria-label="Tabs">
                    <button onClick={() => setActiveTab('units')} className={`whitespace-nowrap py-3 sm:py-4 px-1 text-xs sm:text-sm flex-shrink-0 transition-colors ${activeTab === 'units' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}>{t('units')}</button>
                    <button onClick={() => setActiveTab('projects')} className={`whitespace-nowrap py-3 sm:py-4 px-1 text-xs sm:text-sm flex-shrink-0 transition-colors ${activeTab === 'projects' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}>{t('projects')}</button>
                    <button onClick={() => setActiveTab('developers')} className={`whitespace-nowrap py-3 sm:py-4 px-1 text-xs sm:text-sm flex-shrink-0 transition-colors ${activeTab === 'developers' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}>{t('developers')}</button>
                </nav>
            </div>
            {renderContent()}
        </PageWrapper>
    );
};
