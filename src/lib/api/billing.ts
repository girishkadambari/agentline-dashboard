import { overview } from "./mock";
import { wrap } from "./client";

export const getBillingSummary = () => wrap({
  balance: overview.balance,
  mtdSpend: overview.mtdSpend,
  spendLimit: 1000,
  autoRecharge: false,
});
export const setSpendLimit = (limit: number) => wrap({ spendLimit: limit });
export const setAutoRecharge = (enabled: boolean) => wrap({ autoRecharge: enabled });