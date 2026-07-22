import { apiRequest } from './client';

export interface ErrorCodeBreakdown {
  errorCode: string | null;
  count: number;
}

export interface ComplianceSnapshot {
  qualityRating: string;
  messagingLimit: string | null;
  nameStatus: string | null;
  errorCountLast24h: number;
  errorCountLast7d: number;
  topErrorCodes: ErrorCodeBreakdown[];
  riskFlags: string[];
}

export function getComplianceSnapshot(gymId: string): Promise<ComplianceSnapshot> {
  return apiRequest<ComplianceSnapshot>(`/api/compliance/${gymId}`);
}

export interface MetaDeliveryFailureItem {
  whatsAppMessageId: string;
  recipientPhoneNumber: string;
  errorCode: string | null;
  errorMessage: string;
  occurredAtUtc: string;
}

export interface ApiCallFailureItem {
  endpoint: string;
  httpStatusCode: number;
  errorCode: string | null;
  errorMessage: string;
  occurredAtUtc: string;
}

export interface AiFailureItem {
  conversationId: string;
  userMessage: string;
  attempts: number;
  lastError: string | null;
  status: string;
  lastAttemptAtUtc: string | null;
}

export interface FailuresSnapshot {
  metaDeliveryFailures: MetaDeliveryFailureItem[];
  apiCallFailures: ApiCallFailureItem[];
  aiFailures: AiFailureItem[];
}

export function getComplianceFailures(gymId: string): Promise<FailuresSnapshot> {
  return apiRequest<FailuresSnapshot>(`/api/compliance/${gymId}/failures`);
}
