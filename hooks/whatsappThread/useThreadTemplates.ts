import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMessageTemplatesAPI, type MessageTemplateType } from '../../services/api';
import type { WhatsAppThreadAdapter } from './types';

export function useThreadTemplates(adapter: WhatsAppThreadAdapter) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: getMessageTemplatesAPI,
  });

  const approvedTemplates = useMemo(
    () => adapter.approvedTemplatesFilter(templates as MessageTemplateType[]),
    [templates, adapter]
  );

  return { approvedTemplates, templatesLoading: isLoading };
}
