import { apiRequest } from './client';

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isActive: boolean;
}

export function listFaqs(gymId: string): Promise<Faq[]> {
  return apiRequest<Faq[]>(`/api/faqs/${gymId}`);
}

export interface CreateFaqInput {
  question: string;
  answer: string;
  category?: string;
}

export function createFaq(input: CreateFaqInput): Promise<Faq> {
  return apiRequest<Faq>('/api/faqs', { method: 'POST', body: input });
}

export interface UpdateFaqInput {
  question: string;
  answer: string;
  category?: string;
}

export function updateFaq(id: string, input: UpdateFaqInput): Promise<Faq> {
  return apiRequest<Faq>(`/api/faqs/${id}`, { method: 'PUT', body: input });
}

export function deactivateFaq(id: string): Promise<Faq> {
  return apiRequest<Faq>(`/api/faqs/${id}/deactivate`, { method: 'POST' });
}

export function activateFaq(id: string): Promise<Faq> {
  return apiRequest<Faq>(`/api/faqs/${id}/activate`, { method: 'POST' });
}
