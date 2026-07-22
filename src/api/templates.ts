import { apiRequest } from './client';

export interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  bodyText: string;
  status: string;
  metaTemplateId: string | null;
  rejectionReason: string | null;
  variableNames: string[];
}

export function listTemplates(gymId: string): Promise<Template[]> {
  return apiRequest<Template[]>(`/api/templates/${gymId}`);
}

export interface CreateTemplateDraftInput {
  name: string;
  language: string;
  category: number;
  bodyText: string;
}

export function createTemplateDraft(input: CreateTemplateDraftInput): Promise<Template> {
  return apiRequest<Template>('/api/templates', { method: 'POST', body: input });
}

export function submitTemplate(id: string): Promise<Template> {
  return apiRequest<Template>(`/api/templates/${id}/submit`, { method: 'POST' });
}

export function refreshTemplateStatuses(gymId: string): Promise<Template[]> {
  return apiRequest<Template[]>(`/api/templates/${gymId}/refresh-statuses`, { method: 'POST' });
}
