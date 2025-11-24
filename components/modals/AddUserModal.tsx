
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { EyeIcon, EyeOffIcon } from '../icons';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
        {children}
    </select>
);

export const AddUserModal = () => {
    const { isAddUserModalOpen, setIsAddUserModalOpen, addUser, t, currentUser } = useAppContext();
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        role: 'Employee',
    });
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.name.trim()) newErrors.name = t('nameRequired') || 'Name is required';
        if (!formData.username.trim()) newErrors.username = t('usernameRequired') || 'Username is required';
        if (!formData.email.trim()) newErrors.email = t('emailRequired') || 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('invalidEmail') || 'Invalid email format';
        if (!formData.password.trim()) newErrors.password = t('passwordRequired') || 'Password is required';
        else if (formData.password.length < 6) newErrors.password = t('passwordMinLength') || 'Password must be at least 6 characters';
        if (!formData.phone.trim()) newErrors.phone = t('phoneRequired') || 'Phone is required';
        if (!formData.role) newErrors.role = t('roleRequired') || 'Role is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        addUser({
            name: formData.name,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            role: formData.role,
        });

        // Reset form
        setFormData({
            name: '',
            username: '',
            email: '',
            password: '',
            phone: '',
            role: 'Employee',
        });
        setErrors({});
        setIsAddUserModalOpen(false);
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <Modal isOpen={isAddUserModalOpen} onClose={() => {
            setIsAddUserModalOpen(false);
            setFormData({
                name: '',
                username: '',
                email: '',
                password: '',
                phone: '',
                role: 'Employee',
            });
            setErrors({});
        }} title={t('createUser')}>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="add-user-name">{t('name')} *</Label>
                    <Input 
                        id="add-user-name" 
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-username">{t('username')} *</Label>
                    <Input 
                        id="add-user-username" 
                        value={formData.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                    />
                    {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-email">{t('email')} *</Label>
                    <Input 
                        id="add-user-email" 
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-password">{t('password')} *</Label>
                    <div className="relative">
                        <Input 
                            id="add-user-password" 
                            type={passwordVisible ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="pr-10"
                        />
                        <button 
                            type="button"
                            className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400"
                            onClick={() => setPasswordVisible(!passwordVisible)}
                        >
                            {passwordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                        </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-phone">{t('phone')} *</Label>
                    <Input 
                        id="add-user-phone" 
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                    <Label htmlFor="add-user-role">{t('role')} *</Label>
                    <Select 
                        id="add-user-role" 
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                    >
                        <option value="Employee">{t('employee')}</option>
                    </Select>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={() => {
                        setIsAddUserModalOpen(false);
                        setFormData({
                            name: '',
                            username: '',
                            email: '',
                            password: '',
                            phone: '',
                            role: 'Employee',
                        });
                        setErrors({});
                    }}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit}>{t('createUser')}</Button>
                </div>
            </div>
        </Modal>
    );
};

