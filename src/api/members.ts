import { apiRequest } from './client';

export interface Member {
  id: string;
  fullName: string;
  phoneNumber: string;
  status: string;
  birthDate: string | null;
}

export function listMembers(gymId: string): Promise<Member[]> {
  return apiRequest<Member[]>(`/api/members/gym/${gymId}`);
}
