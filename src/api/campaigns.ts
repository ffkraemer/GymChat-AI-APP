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

export function linkWhatsAppTemplate(campaignId: string, templateId: string | null): Promise<Campaign> {
  return apiRequest<Campaign>(`/api/campaigns/${campaignId}/link-template`, {
    method: 'POST',
    body: { templateId },
  });
}
