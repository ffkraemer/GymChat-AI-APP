import { apiRequest } from "./client";

export interface OptionItem {
  value: string;
  label: string;
  order: number;
}

export interface OptionList {
  id: string;
  gymId: string | null;
  name: string;
  key: string;
  isSystem: boolean;
  isActive: boolean;
  isGlobal: boolean;
  items: OptionItem[];
}

// Lists visible to a gym: its own + all globals. includeInactive brings back deactivated ones too (for the management page).
export function listOptionLists(gymId: string, includeInactive = true): Promise<OptionList[]> {
  return apiRequest<OptionList[]>(`/api/option-lists/${gymId}?includeInactive=${includeInactive}`);
}

// Global lists only - PlatformAdmin view.
export function listGlobalOptionLists(includeInactive = true): Promise<OptionList[]> {
  return apiRequest<OptionList[]>(`/api/option-lists/global?includeInactive=${includeInactive}`);
}

export interface CreateOptionListInput {
  name: string;
  items: OptionItem[];
  global?: boolean;
  gymId?: string | null;
}

export function createOptionList(input: CreateOptionListInput): Promise<OptionList> {
  return apiRequest<OptionList>("/api/option-lists", { method: "POST", body: input });
}

export function updateOptionList(id: string, name: string, items: OptionItem[]): Promise<OptionList> {
  return apiRequest<OptionList>(`/api/option-lists/${id}`, { method: "PUT", body: { name, items } });
}

export function setOptionListActive(id: string, active: boolean): Promise<void> {
  return apiRequest<void>(`/api/option-lists/${id}/active`, { method: "POST", body: { active } });
}

export function deleteOptionList(id: string): Promise<void> {
  return apiRequest<void>(`/api/option-lists/${id}`, { method: "DELETE" });
}
