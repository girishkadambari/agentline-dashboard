import { numbers } from "./mock";
import { wrap, wrapList } from "./client";
import type { PhoneNumber } from "./types";

export const listNumbers = () => wrapList<PhoneNumber>(numbers);
export const getNumber = (id: string) => {
  const n = numbers.find((x) => x.id === id);
  return n ? wrap(n) : { data: null as PhoneNumber | null, error: { code: "not_found", message: id } };
};
export const provisionNumber = (input: { country: string; areaCode: string; capabilities: string[]; provider: PhoneNumber["provider"]; agentId?: string }) =>
  wrap<PhoneNumber>({
    id: `pn_${Math.random().toString(36).slice(2, 6)}`,
    number: `+1 ${input.areaCode} 555 0${Math.floor(100 + Math.random() * 899)}`,
    country: input.country,
    areaCode: input.areaCode,
    capabilities: input.capabilities,
    provider: input.provider,
    agentId: input.agentId,
    status: "pending",
    monthlyCost: 1.15,
  });
export const attachNumber = (numberId: string, agentId: string) => wrap({ numberId, agentId });
export const detachNumber = (numberId: string) => wrap({ numberId });
export const releaseNumber = (numberId: string) => wrap({ numberId, status: "released" as const });