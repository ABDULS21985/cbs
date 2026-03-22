import { useQuery } from '@tanstack/react-query';
import { almReportApi } from '../api/almReportApi';

export function useTreasuryReports() {
  const gapQuery = useQuery({
    queryKey: ['treasury-reports', 'gap'],
    queryFn: () => almReportApi.getGapAnalysis(),
    staleTime: 5 * 60 * 1000,
  });

  const durationQuery = useQuery({
    queryKey: ['treasury-reports', 'duration'],
    queryFn: () => almReportApi.getDurationAnalysis(),
    staleTime: 5 * 60 * 1000,
  });

  const niiSensitivityQuery = useQuery({
    queryKey: ['treasury-reports', 'nii-sensitivity'],
    queryFn: () => almReportApi.getNiiSensitivity(),
    staleTime: 5 * 60 * 1000,
  });

  const fxExposureQuery = useQuery({
    queryKey: ['treasury-reports', 'fx-exposure'],
    queryFn: () => almReportApi.getFxExposure(),
    staleTime: 5 * 60 * 1000,
  });

  const liquidityQuery = useQuery({
    queryKey: ['treasury-reports', 'liquidity'],
    queryFn: () => almReportApi.getLiquidityRatios(),
    staleTime: 5 * 60 * 1000,
  });

  const rateOutlookQuery = useQuery({
    queryKey: ['treasury-reports', 'rate-outlook'],
    queryFn: () => almReportApi.getRateOutlook(),
    staleTime: 5 * 60 * 1000,
  });

  const durationTrendQuery = useQuery({
    queryKey: ['treasury-reports', 'duration-trend'],
    queryFn: () => almReportApi.getDurationTrend(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    gap: gapQuery.data ?? [],
    gapLoading: gapQuery.isLoading,
    gapError: gapQuery.isError,

    duration: durationQuery.data,
    durationLoading: durationQuery.isLoading,
    durationError: durationQuery.isError,

    niiSensitivity: niiSensitivityQuery.data ?? [],
    niiSensitivityLoading: niiSensitivityQuery.isLoading,
    niiSensitivityError: niiSensitivityQuery.isError,

    fxExposure: fxExposureQuery.data ?? [],
    fxExposureLoading: fxExposureQuery.isLoading,
    fxExposureError: fxExposureQuery.isError,

    liquidity: liquidityQuery.data ?? [],
    liquidityLoading: liquidityQuery.isLoading,
    liquidityError: liquidityQuery.isError,

    rateOutlook: rateOutlookQuery.data ?? [],
    rateOutlookLoading: rateOutlookQuery.isLoading,
    rateOutlookError: rateOutlookQuery.isError,

    durationTrend: durationTrendQuery.data ?? [],
    durationTrendLoading: durationTrendQuery.isLoading,
    durationTrendError: durationTrendQuery.isError,

    hasLoadError:
      gapQuery.isError ||
      durationQuery.isError ||
      niiSensitivityQuery.isError ||
      fxExposureQuery.isError ||
      liquidityQuery.isError ||
      rateOutlookQuery.isError ||
      durationTrendQuery.isError,
  };
}
