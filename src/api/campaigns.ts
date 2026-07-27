import { apiRequest } from './client';

export interface Campaign {
  id: string;
  name: string;
  type: string;
  messageTemplate: string;
  triggerDayOffset: number | null;
  isActive: boolean;
  whatsAppMessageTemplateId: string | null;
}

export function listCampaigns(gymId: string): Promise<Campaign[]> {
  return apiRequest<Campaign[]>(`/api/campaigns/gym/${gymId}`);
}

export interface CreateCampaignInput {
  name: string;
  type: number;
  messageTemplate: string;
  triggerDayOffset: number | null;
}

export function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return apiRequest<Campaign>('/api/campaigns', { method: 'POST', body: input });
}

export function activateCampaign(id: string): Promise<Campaign> {
  return apiRequest<Campaign>(`/api/campaigns/${id}/activate`, { method: 'POST' });
}

export function deactivateCampaign(id: string): Promise<Campaign> {
  return apiRequest<Campaign>(`/api/campaigns/${id}/deactivate`, { method: 'POST' });
}

export function linkWhatsAppTemplate(campaignId: string, templateId: string | null): Promise<Campaign> {
  return apiRequest<Campaign>(`/api/campaigns/${campaignId}/link-template`, {
    method: 'POST',
    body: { templateId },
  });
}

export function triggerManualCampaign(campaignId: string, memberIds: string[]): Promise<{ sentCount: number; requested: number }> {
  return apiRequest<{ sentCount: number; requested: number }>(`/api/campaigns/${campaignId}/trigger`, {
    method: 'POST',
    body: { memberIds },
  });
}
