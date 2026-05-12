import { apiRequest } from "./client";

export interface BackendNumber {
  id: string;
  workspaceId: string;
  projectId: string;
  agentId?: string | null;
  phoneNumber: string;
  country: string;
  areaCode?: string | null;
  capabilities: string[];
  status: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface NumberListItem {
  id: string;
  agentId?: string;
  number: string;
  country: string;
  areaCode: string;
  capabilities: string[];
  provider: string;
  status: string;
  monthlyCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionNumberInput {
  agentId?: string;
  country?: string;
  areaCode?: string;
  capabilities?: string[];
}

export interface ImportNumberInput {
  agentId?: string;
  phoneNumber: string;
  country?: string;
  areaCode?: string;
  capabilities?: string[];
}

export interface UpdateNumberInput {
  agentId?: string | null;
}

function mapBackendNumber(number: BackendNumber): NumberListItem {
  return {
    id: number.id,
    agentId: number.agentId ?? undefined,
    number: number.phoneNumber,
    country: number.country,
    areaCode: number.areaCode ?? "",
    capabilities: number.capabilities,
    provider: number.provider,
    status: number.status,
    monthlyCost: 1.15,
    createdAt: number.createdAt,
    updatedAt: number.updatedAt,
  };
}

export async function listBackendNumbers() {
  const response = await apiRequest<{ data: BackendNumber[]; pagination: { limit: number; nextCursor: string | null } }>("/numbers");

  return {
    data: response.data.map(mapBackendNumber),
    pagination: response.pagination,
  };
}

export async function getBackendNumber(id: string) {
  const response = await apiRequest<{ data: BackendNumber }>(`/numbers/${id}`);

  return { data: mapBackendNumber(response.data) };
}

export async function provisionBackendNumber(input: ProvisionNumberInput) {
  const response = await apiRequest<{ data: BackendNumber }>("/numbers", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return { data: mapBackendNumber(response.data) };
}

export async function importBackendNumber(input: ImportNumberInput) {
  const response = await apiRequest<{ data: BackendNumber }>("/numbers/import", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return { data: mapBackendNumber(response.data) };
}

export async function updateBackendNumber(id: string, input: UpdateNumberInput) {
  const response = await apiRequest<{ data: BackendNumber }>(`/numbers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return { data: mapBackendNumber(response.data) };
}

export async function releaseBackendNumber(id: string) {
  const response = await apiRequest<{ data: BackendNumber }>(`/numbers/${id}`, {
    method: "DELETE",
  });

  return { data: mapBackendNumber(response.data) };
}

export const listNumbers = listBackendNumbers;
export const getNumber = getBackendNumber;
export const provisionNumber = provisionBackendNumber;
export const importNumber = importBackendNumber;
export const attachNumber = (numberId: string, agentId: string) =>
  updateBackendNumber(numberId, { agentId });
export const detachNumber = (numberId: string) => updateBackendNumber(numberId, { agentId: null });
export const releaseNumber = releaseBackendNumber;
