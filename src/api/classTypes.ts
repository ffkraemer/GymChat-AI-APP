import { apiRequest } from './client';

export interface ClassType {
  id: string;
  name: string;
  isActive: boolean;
}

export function listClassTypes(gymId: string): Promise<ClassType[]> {
  return apiRequest<ClassType[]>(`/api/class-types/${gymId}`);
}

export function createClassType(name: string, gymId?: string): Promise<ClassType> {
  return apiRequest<ClassType>('/api/class-types', { method: 'POST', body: { name, gymId } });
}

export function updateClassType(id: string, name: string): Promise<ClassType> {
  return apiRequest<ClassType>(`/api/class-types/${id}`, { method: 'PUT', body: { name } });
}

export function deactivateClassType(id: string): Promise<ClassType> {
  return apiRequest<ClassType>(`/api/class-types/${id}/deactivate`, { method: 'POST' });
}

export function activateClassType(id: string): Promise<ClassType> {
  return apiRequest<ClassType>(`/api/class-types/${id}/activate`, { method: 'POST' });
}
