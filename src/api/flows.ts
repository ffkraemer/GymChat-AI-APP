import { apiRequest } from './client';

export interface Flow {
  id: string;
  name: string;
  metaFlowId: string | null;
  status: string;
}

export function listFlows(gymId: string): Promise<Flow[]> {
  return apiRequest<Flow[]>(`/api/flows/${gymId}`);
}

export function createFlow(name: string): Promise<Flow> {
  return apiRequest<Flow>('/api/flows', { method: 'POST', body: { name } });
}

export function publishFlow(id: string): Promise<Flow> {
  return apiRequest<Flow>(`/api/flows/${id}/publish`, { method: 'POST' });
}

export function refreshFlowStatuses(gymId: string): Promise<Flow[]> {
  return apiRequest<Flow[]>(`/api/flows/${gymId}/refresh-statuses`, { method: 'POST' });
}

export function registerFlowEncryptionKey(gymId: string, publicKeyPem: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/flows/${gymId}/encryption-key`, {
    method: 'POST',
    body: { publicKeyPem },
  });
}

export interface TriggerFlowInput {
  recipientPhoneNumber: string;
  bodyText: string;
  flowCtaButtonText: string;
}

export function triggerFlow(id: string, input: TriggerFlowInput): Promise<{ whatsAppMessageId: string }> {
  return apiRequest<{ whatsAppMessageId: string }>(`/api/flows/${id}/trigger`, { method: 'POST', body: input });
}
