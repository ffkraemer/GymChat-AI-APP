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
