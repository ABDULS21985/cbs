import { useQuery } from '@tanstack/react-query';
import {
  getLoanPortfolioStats,
  getDpdBuckets,
  getDpdMatrix,
  getSectorExposure,
  getGeographicConcentration,
  getProductMix,
  getVintageData,
  getVintageMatrix,
  getNplTrend,
  getProvisionWaterfall,
  getTopObligors,
} from '../api/loanAnalyticsApi';

export function useLoanAnalytics() {
  const statsQuery = useQuery({
    queryKey: ['loan-analytics', 'stats'],
    queryFn: () => getLoanPortfolioStats(),
    staleTime: 5 * 60 * 1000,
  });

  const dpdBucketsQuery = useQuery({
    queryKey: ['loan-analytics', 'dpd-buckets'],
    queryFn: () => getDpdBuckets(),
    staleTime: 5 * 60 * 1000,
  });

  const dpdMatrixQuery = useQuery({
    queryKey: ['loan-analytics', 'dpd-matrix'],
    queryFn: () => getDpdMatrix(),
    staleTime: 5 * 60 * 1000,
  });

  const sectorExposureQuery = useQuery({
    queryKey: ['loan-analytics', 'sector-exposure'],
    queryFn: () => getSectorExposure(),
    staleTime: 5 * 60 * 1000,
  });

  const geographicConcentrationQuery = useQuery({
    queryKey: ['loan-analytics', 'geographic-concentration'],
    queryFn: () => getGeographicConcentration(),
    staleTime: 5 * 60 * 1000,
  });

  const productMixQuery = useQuery({
    queryKey: ['loan-analytics', 'product-mix'],
    queryFn: () => getProductMix(),
    staleTime: 5 * 60 * 1000,
  });

  const vintageQuery = useQuery({
    queryKey: ['loan-analytics', 'vintage'],
    queryFn: () => getVintageData(),
    staleTime: 5 * 60 * 1000,
  });

  const vintageMatrixQuery = useQuery({
    queryKey: ['loan-analytics', 'vintage-matrix'],
    queryFn: () => getVintageMatrix(),
    staleTime: 5 * 60 * 1000,
  });

  const nplTrendQuery = useQuery({
    queryKey: ['loan-analytics', 'npl-trend'],
    queryFn: () => getNplTrend(),
    staleTime: 5 * 60 * 1000,
  });

  const provisionWaterfallQuery = useQuery({
    queryKey: ['loan-analytics', 'provision-waterfall'],
    queryFn: () => getProvisionWaterfall(),
    staleTime: 5 * 60 * 1000,
  });

  const topObligorsQuery = useQuery({
    queryKey: ['loan-analytics', 'top-obligors'],
    queryFn: () => getTopObligors(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.isError,

    dpdBuckets: dpdBucketsQuery.data ?? [],
    dpdBucketsLoading: dpdBucketsQuery.isLoading,
    dpdBucketsError: dpdBucketsQuery.isError,

    dpdMatrix: dpdMatrixQuery.data ?? [],
    dpdMatrixLoading: dpdMatrixQuery.isLoading,
    dpdMatrixError: dpdMatrixQuery.isError,

    sectorExposure: sectorExposureQuery.data ?? [],
    sectorExposureLoading: sectorExposureQuery.isLoading,
    sectorExposureError: sectorExposureQuery.isError,

    geographicConcentration: geographicConcentrationQuery.data ?? [],
    geographicConcentrationLoading: geographicConcentrationQuery.isLoading,
    geographicConcentrationError: geographicConcentrationQuery.isError,

    productMix: productMixQuery.data ?? [],
    productMixLoading: productMixQuery.isLoading,
    productMixError: productMixQuery.isError,

    vintage: vintageQuery.data ?? [],
    vintageLoading: vintageQuery.isLoading,
    vintageError: vintageQuery.isError,

    vintageMatrix: vintageMatrixQuery.data ?? [],
    vintageMatrixLoading: vintageMatrixQuery.isLoading,
    vintageMatrixError: vintageMatrixQuery.isError,

    nplTrend: nplTrendQuery.data ?? [],
    nplTrendLoading: nplTrendQuery.isLoading,
    nplTrendError: nplTrendQuery.isError,

    provisionWaterfall: provisionWaterfallQuery.data ?? [],
    provisionWaterfallLoading: provisionWaterfallQuery.isLoading,
    provisionWaterfallError: provisionWaterfallQuery.isError,

    topObligors: topObligorsQuery.data ?? [],
    topObligorsLoading: topObligorsQuery.isLoading,
    topObligorsError: topObligorsQuery.isError,

    hasLoadError:
      statsQuery.isError ||
      dpdBucketsQuery.isError ||
      dpdMatrixQuery.isError ||
      sectorExposureQuery.isError ||
      geographicConcentrationQuery.isError ||
      productMixQuery.isError ||
      vintageQuery.isError ||
      vintageMatrixQuery.isError ||
      nplTrendQuery.isError ||
      provisionWaterfallQuery.isError ||
      topObligorsQuery.isError,
  };
}
