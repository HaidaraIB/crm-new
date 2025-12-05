/**
 * Utility functions for date/time handling
 * Converts UTC dates from API to local timezone for display
 */

/**
 * Converts a UTC date string (ISO format) to local date string (YYYY-MM-DD)
 * @param utcDateString - ISO date string from API (e.g., "2024-01-15T10:30:00Z")
 * @returns Local date string in YYYY-MM-DD format
 */
export const formatDateToLocal = (utcDateString: string | null | undefined): string => {
    if (!utcDateString) {
        return new Date().toISOString().split('T')[0];
    }
    
    try {
        const date = new Date(utcDateString);
        if (isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0];
        }
        
        // Get local date components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return new Date().toISOString().split('T')[0];
    }
};

/**
 * Converts a UTC date string to local date string with time (YYYY-MM-DD HH:MM:SS)
 * @param utcDateString - ISO date string from API
 * @returns Local date string with time
 */
export const formatDateTimeToLocal = (utcDateString: string | null | undefined): string => {
    if (!utcDateString) {
        return new Date().toLocaleString();
    }
    
    try {
        const date = new Date(utcDateString);
        if (isNaN(date.getTime())) {
            return new Date().toLocaleString();
        }
        
        return date.toLocaleString();
    } catch (error) {
        console.error('Error formatting date time:', error);
        return new Date().toLocaleString();
    }
};

/**
 * Converts a UTC date string to local date string with custom format
 * @param utcDateString - ISO date string from API
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted local date string
 */
export const formatDateToLocalCustom = (
    utcDateString: string | null | undefined,
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string => {
    if (!utcDateString) {
        return new Date().toLocaleDateString(undefined, options);
    }
    
    try {
        const date = new Date(utcDateString);
        if (isNaN(date.getTime())) {
            return new Date().toLocaleDateString(undefined, options);
        }
        
        return date.toLocaleDateString(undefined, options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return new Date().toLocaleDateString(undefined, options);
    }
};

/**
 * Converts a UTC date string to local time string
 * @param utcDateString - ISO date string from API
 * @returns Local time string (HH:MM:SS)
 */
export const formatTimeToLocal = (utcDateString: string | null | undefined): string => {
    if (!utcDateString) {
        return new Date().toLocaleTimeString();
    }
    
    try {
        const date = new Date(utcDateString);
        if (isNaN(date.getTime())) {
            return new Date().toLocaleTimeString();
        }
        
        return date.toLocaleTimeString();
    } catch (error) {
        console.error('Error formatting time:', error);
        return new Date().toLocaleTimeString();
    }
};

/**
 * Creates a Date object from UTC string, ensuring it's treated as UTC
 * @param utcDateString - ISO date string from API
 * @returns Date object in local timezone
 */
export const parseUTCDate = (utcDateString: string | null | undefined): Date => {
    if (!utcDateString) {
        return new Date();
    }
    
    try {
        const date = new Date(utcDateString);
        if (isNaN(date.getTime())) {
            return new Date();
        }
        
        return date;
    } catch (error) {
        console.error('Error parsing UTC date:', error);
        return new Date();
    }
};

/**
 * Checks if a date is today (in local timezone)
 * @param utcDateString - ISO date string from API
 * @returns true if the date is today
 */
export const isToday = (utcDateString: string | null | undefined): boolean => {
    if (!utcDateString) return false;
    
    try {
        const date = parseUTCDate(utcDateString);
        const today = new Date();
        
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    } catch (error) {
        console.error('Error checking if date is today:', error);
        return false;
    }
};

/**
 * Checks if two dates are the same day (in local timezone)
 * @param utcDateString1 - First ISO date string
 * @param utcDateString2 - Second ISO date string or Date object
 * @returns true if both dates are the same day
 */
export const isSameDay = (
    utcDateString1: string | null | undefined,
    utcDateString2: string | Date | null | undefined
): boolean => {
    if (!utcDateString1 || !utcDateString2) return false;
    
    try {
        const date1 = parseUTCDate(utcDateString1);
        const date2 = utcDateString2 instanceof Date ? utcDateString2 : parseUTCDate(utcDateString2);
        
        return (
            date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear()
        );
    } catch (error) {
        console.error('Error checking if dates are same day:', error);
        return false;
    }
};

