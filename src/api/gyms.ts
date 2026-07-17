import { apiRequest } from './client';

export interface Gym {
  id: string;
  name: string;
  whatsAppPhoneNumberId: string;
  defaultLanguage: string;
}

export function listGyms(): Promise<Gym[]> {
  return apiRequest<Gym[]>('/api/gyms');
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
