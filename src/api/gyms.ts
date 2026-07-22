import { apiRequest } from './client';

export interface Gym {
  id: string;
  name: string;
  whatsAppPhoneNumberId: string;
  whatsAppBusinessAccountId: string | null;
  defaultLanguage: string;
}

export function listGyms(): Promise<Gym[]> {
  return apiRequest<Gym[]>('/api/gyms');
}

export function getGymById(gymId: string): Promise<Gym> {
  return apiRequest<Gym>(`/api/gyms/by-id/${gymId}`);
}

export interface SetWhatsAppBusinessAccountResult {
  gym: Gym;
  webhookSubscriptionSucceeded: boolean;
}

export function setWhatsAppBusinessAccount(gymId: string, whatsAppBusinessAccountId: string): Promise<SetWhatsAppBusinessAccountResult> {
  return apiRequest<SetWhatsAppBusinessAccountResult>(`/api/gyms/${gymId}/whatsapp-business-account`, {
    method: 'POST',
    body: { whatsAppBusinessAccountId },
  });
}

export function resubscribeWebhook(gymId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/gyms/${gymId}/resubscribe-webhook`, { method: 'POST' });
}

export interface CreateGymInput {
  name: string;
  whatsAppPhoneNumberId: string;
  whatsAppDisplayPhoneNumber: string;
}

export function createGym(input: CreateGymInput): Promise<Gym> {
  return apiRequest<Gym>('/api/gyms', { method: 'POST', body: input });
}

export interface RegisterOperatorInput {
  email: string;
  password: string;
  fullName: string;
  gymId: string;
}

export interface RegisterOperatorResult {
  id: string;
  email: string;
  fullName: string;
  gymId: string;
}

export function registerOperator(input: RegisterOperatorInput): Promise<RegisterOperatorResult> {
  return apiRequest<RegisterOperatorResult>('/api/auth/register-operator', { method: 'POST', body: input });
}
