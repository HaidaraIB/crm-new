/**
 * Utility functions for TaskStage - now consistent with API
 * Since we're using the same field name (stage) and enum values, 
 * we only need helper functions for display formatting
 */

import { TaskStage } from '../types';

/**
 * Format stage name for display (convert snake_case to Title Case)
 */
export function formatStageName(stage: TaskStage | string): string {
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get display label for stage (for UI display)
 * @param stage - The stage value
 * @param t - Optional translation function
 */
export function getStageDisplayLabel(stage: TaskStage | string, t?: (key: string) => string): string {
  // If translation function is provided, use it
  if (t) {
    const translationMap: Record<string, string> = {
      'following': 'following',
      'meeting': 'meeting',
      'done_meeting': 'doneMeeting',
      'follow_after_meeting': 'followAfterMeeting',
      'reschedule_meeting': 'rescheduleMeeting',
      'cancellation': 'cancellation',
      'no_answer': 'noAnswer',
      'out_of_service': 'outOfService',
      'not_interested': 'notInterested',
      'whatsapp_pending': 'whatsappPending',
      'hold': 'hold',
      'broker': 'broker',
      'resale': 'resale',
    };
    
    const translationKey = translationMap[stage];
    if (translationKey) {
      return t(translationKey);
    }
  }
  
  // Fallback to English labels
  const stageMap: Record<string, string> = {
    'following': 'Following',
    'meeting': 'Meeting',
    'done_meeting': 'Done Meeting',
    'follow_after_meeting': 'Follow After Meeting',
    'reschedule_meeting': 'Reschedule Meeting',
    'cancellation': 'Cancellation',
    'no_answer': 'No Answer',
    'out_of_service': 'Out of Service',
    'not_interested': 'Not Interested',
    'whatsapp_pending': 'WhatsApp Pending',
    'hold': 'Hold',
    'broker': 'Broker',
    'resale': 'Resale',
  };
  
  return stageMap[stage] || formatStageName(stage);
}

/**
 * Get stage category for grouping (Meeting, Call, WhatsApp, etc.)
 */
export function getStageCategory(stage: TaskStage | string): 'Meeting' | 'Call' | 'WhatsApp' | 'Other' {
  const normalizedStage = stage.toLowerCase();
  
  if (normalizedStage === 'meeting' || 
      normalizedStage === 'done_meeting' || 
      normalizedStage === 'follow_after_meeting' || 
      normalizedStage === 'reschedule_meeting') {
    return 'Meeting';
  }
  
  if (normalizedStage === 'whatsapp_pending') {
    return 'WhatsApp';
  }
  
  if (normalizedStage === 'following' || 
      normalizedStage === 'no_answer' || 
      normalizedStage === 'out_of_service' ||
      normalizedStage === 'cancellation' ||
      normalizedStage === 'not_interested' ||
      normalizedStage === 'hold' ||
      normalizedStage === 'broker' ||
      normalizedStage === 'resale') {
    return 'Call';
  }
  
  return 'Other';
}

