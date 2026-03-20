// Treasury feature — cross-feature barrel export
// Import treasury functionality in other features via: import { useTreasuryDealsSummary } from '@/features/treasury'

export { useTreasuryDealsSummary, useFxRateLive } from './hooks/useTreasury';
export type { TreasuryDeal, DealType, DealStatus } from './api/tradingApi';
