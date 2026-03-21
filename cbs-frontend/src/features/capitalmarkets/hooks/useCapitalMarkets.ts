import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { capitalMarketsApi } from '../api/capitalMarketsApi';
import type {
  CreateDealInput,
  InvestorInput,
  CreatePlacementInput,
  FundingInput,
  CreatePortfolioInput,
  AddHoldingInput,
  CreateFundInput,
  NavUpdateInput,
  FundType,
} from '../api/capitalMarketsApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const keys = {
  pipeline: ['capital-markets', 'pipeline'] as const,
  deal: (code: string) => ['capital-markets', 'deal', code] as const,
  investorBook: (dealId: number) => ['capital-markets', 'investors', dealId] as const,
  placements: ['private-placements', 'active'] as const,
  placement: (code: string) => ['private-placements', code] as const,
  portfolios: (customerId?: number) => ['investment-portfolios', customerId ?? 'all'] as const,
  portfolio: (code: string) => ['investment-portfolios', 'detail', code] as const,
  holdings: (code: string) => ['investment-portfolios', code, 'holdings'] as const,
  funds: (type?: FundType) => ['funds', type ?? 'all'] as const,
  fundsByAum: ['funds', 'by-aum'] as const,
  shariaFunds: ['funds', 'sharia'] as const,
};

// ─── Capital Markets Deal Hooks ───────────────────────────────────────────────

export function useCapitalMarketsPipeline() {
  return useQuery({
    queryKey: keys.pipeline,
    queryFn: () => capitalMarketsApi.getPipeline(),
    staleTime: 30_000,
  });
}

export function useCapitalMarketsDeal(code: string) {
  return useQuery({
    queryKey: keys.deal(code),
    queryFn: () => capitalMarketsApi.getDeal(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => capitalMarketsApi.createDeal(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.pipeline });
    },
  });
}

export function usePriceDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, price }: { code: string; price: number }) =>
      capitalMarketsApi.priceDeal(code, price),
    onSuccess: (_data, { code }) => {
      qc.invalidateQueries({ queryKey: keys.pipeline });
      qc.invalidateQueries({ queryKey: keys.deal(code) });
    },
  });
}

export function useAllotDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, method }: { code: string; method?: string }) =>
      capitalMarketsApi.allotDeal(code, method),
    onSuccess: (_data, { code }) => {
      qc.invalidateQueries({ queryKey: keys.pipeline });
      qc.invalidateQueries({ queryKey: keys.deal(code) });
    },
  });
}

export function useSettleDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => capitalMarketsApi.settleDeal(code),
    onSuccess: (_data, code) => {
      qc.invalidateQueries({ queryKey: keys.pipeline });
      qc.invalidateQueries({ queryKey: keys.deal(code) });
    },
  });
}

export function useInvestorBook(dealId: number) {
  return useQuery({
    queryKey: keys.investorBook(dealId),
    queryFn: () => capitalMarketsApi.getInvestorBook(dealId),
    enabled: !!dealId,
    staleTime: 15_000,
  });
}

export function useAddInvestor(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvestorInput) => capitalMarketsApi.addInvestor(dealId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.investorBook(dealId) });
    },
  });
}

// ─── Private Placement Hooks ──────────────────────────────────────────────────

export function usePrivatePlacements() {
  return useQuery({
    queryKey: keys.placements,
    queryFn: () => capitalMarketsApi.getActivePlacements(),
    staleTime: 30_000,
  });
}

export function usePlacementDetail(code: string) {
  return useQuery({
    queryKey: keys.placement(code),
    queryFn: () => capitalMarketsApi.getPlacement(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useCreatePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlacementInput) => capitalMarketsApi.createPlacement(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.placements });
    },
  });
}

export function useClosePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => capitalMarketsApi.closePlacement(code),
    onSuccess: (_data, code) => {
      qc.invalidateQueries({ queryKey: keys.placements });
      qc.invalidateQueries({ queryKey: keys.placement(code) });
    },
  });
}

export function useRecordFunding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      investorId,
      input,
    }: {
      code: string;
      investorId: number;
      input: FundingInput;
    }) => capitalMarketsApi.recordFunding(code, investorId, input),
    onSuccess: (_data, { code }) => {
      qc.invalidateQueries({ queryKey: keys.placement(code) });
    },
  });
}

// ─── Investment Portfolio Hooks ───────────────────────────────────────────────

export function useInvestmentPortfolios(customerId?: number) {
  return useQuery({
    queryKey: keys.portfolios(customerId),
    queryFn: () =>
      customerId
        ? capitalMarketsApi.getPortfoliosByCustomer(customerId)
        : capitalMarketsApi.getPortfoliosByCustomer(0),
    enabled: customerId !== undefined ? !!customerId : true,
    staleTime: 30_000,
  });
}

export function usePortfolioDetail(code: string) {
  return useQuery({
    queryKey: keys.portfolio(code),
    queryFn: () => capitalMarketsApi.getPortfolio(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function usePortfolioHoldings(code: string) {
  return useQuery({
    queryKey: keys.holdings(code),
    queryFn: () => capitalMarketsApi.getHoldings(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePortfolioInput) => capitalMarketsApi.createPortfolio(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investment-portfolios'] });
    },
  });
}

export function useAddHolding(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddHoldingInput) => capitalMarketsApi.addHolding(code, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.holdings(code) });
      qc.invalidateQueries({ queryKey: keys.portfolio(code) });
    },
  });
}

export function useValuatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => capitalMarketsApi.valuate(code),
    onSuccess: (_data, code) => {
      qc.invalidateQueries({ queryKey: keys.portfolio(code) });
      qc.invalidateQueries({ queryKey: keys.holdings(code) });
    },
  });
}

// ─── Fund Hooks ───────────────────────────────────────────────────────────────

export function useFunds(type?: FundType) {
  return useQuery({
    queryKey: keys.funds(type),
    queryFn: () =>
      type ? capitalMarketsApi.getFundsByType(type) : capitalMarketsApi.getFundsByAum(),
    staleTime: 60_000,
  });
}

export function useFundsByAum() {
  return useQuery({
    queryKey: keys.fundsByAum,
    queryFn: () => capitalMarketsApi.getFundsByAum(),
    staleTime: 60_000,
  });
}

export function useShariaFunds() {
  return useQuery({
    queryKey: keys.shariaFunds,
    queryFn: () => capitalMarketsApi.getSharia(),
    staleTime: 60_000,
  });
}

export function useCreateFund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFundInput) => capitalMarketsApi.createFund(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funds'] });
    },
  });
}

export function useUpdateNav() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: NavUpdateInput }) =>
      capitalMarketsApi.updateNav(code, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funds'] });
    },
  });
}
