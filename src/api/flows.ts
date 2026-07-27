import { apiRequest } from './client';

export interface Flow {
  id: string;
  name: string;
  metaFlowId: string | null;
  status: string;
  screenCount: number;
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

export function deleteFlow(id: string): Promise<void> {
  return apiRequest<void>(`/api/flows/${id}`, { method: 'DELETE' });
}

export function setFlowEndpoint(id: string, endpointUri: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/flows/${id}/endpoint`, { method: 'POST', body: { endpointUri } });
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

// ---- Flow Designer (screens/components) ----

export interface ComponentResponse {
  type: string;
  label: string;
  variableName: string | null;
  required: boolean;
  optionsSource: string | null;
  staticOptionsJson: string | null;
  footerAction: string | null;
  footerNextScreenId: string | null;
  footerButtonLabel: string | null;
}

export interface ScreenResponse {
  screenId: string;
  title: string;
  components: ComponentResponse[];
}

export function getFlowScreens(flowId: string): Promise<ScreenResponse[]> {
  return apiRequest<ScreenResponse[]>(`/api/flows/${flowId}/screens`);
}

export interface ComponentDefinitionInput {
  type: number;
  label: string;
  variableName?: string | null;
  required?: boolean;
  optionsSource?: number | null;
  staticOptionsJson?: string | null;
  footerAction?: number | null;
  footerNextScreenId?: string | null;
  footerButtonLabel?: string | null;
}

export interface ScreenDefinitionInput {
  screenId: string;
  title: string;
  components: ComponentDefinitionInput[];
}

export function saveFlowScreens(flowId: string, screens: ScreenDefinitionInput[]): Promise<{ validationErrors: { error: string | null; message: string | null }[] }> {
  return apiRequest(`/api/flows/${flowId}/screens`, { method: 'POST', body: { screens } });
}

// ---- Raw JSON editing (alternative to the structured Designer above) ----

export function getFlowJson(flowId: string): Promise<{ flowJson: string }> {
  return apiRequest(`/api/flows/${flowId}/json`);
}

export function updateFlowJson(flowId: string, flowJson: string): Promise<{ validationErrors: { error: string | null; message: string | null }[] }> {
  return apiRequest(`/api/flows/${flowId}/json`, { method: 'PUT', body: { flowJson } });
}
