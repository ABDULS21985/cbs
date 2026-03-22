import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfQuarter } from 'date-fns';
import { operationalReportApi } from '../api/operationalReportApi';

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function useOperationalReports() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfQuarter(new Date()),
    to: new Date(),
  });

  const params = {
    dateFrom: toDateString(dateRange.from),
    dateTo: toDateString(dateRange.to),
  };

  const statsQuery = useQuery({
    queryKey: ['operational-reports', 'stats', params],
    queryFn: () => operationalReportApi.getStats(params),
    staleTime: 5 * 60 * 1000,
  });

  const slaQuery = useQuery({
    queryKey: ['operational-reports', 'sla', params],
    queryFn: () => operationalReportApi.getSlaPerformance(params),
    staleTime: 5 * 60 * 1000,
  });

  const slaTrendQuery = useQuery({
    queryKey: ['operational-reports', 'sla-trend', params],
    queryFn: () => operationalReportApi.getSlaTrend(params),
    staleTime: 5 * 60 * 1000,
  });

  const queueQuery = useQuery({
    queryKey: ['operational-reports', 'queue', params],
    queryFn: () => operationalReportApi.getQueueAnalytics(params),
    staleTime: 5 * 60 * 1000,
  });

  const staffQuery = useQuery({
    queryKey: ['operational-reports', 'staff', params],
    queryFn: () => operationalReportApi.getStaffProductivity(params),
    staleTime: 5 * 60 * 1000,
  });

  const efficiencyQuery = useQuery({
    queryKey: ['operational-reports', 'efficiency'],
    queryFn: () => operationalReportApi.getEfficiencyTrend(),
    staleTime: 5 * 60 * 1000,
  });

  const uptimeQuery = useQuery({
    queryKey: ['operational-reports', 'uptime', params],
    queryFn: () => operationalReportApi.getSystemUptime(params),
    staleTime: 5 * 60 * 1000,
  });

  const incidentsQuery = useQuery({
    queryKey: ['operational-reports', 'incidents'],
    queryFn: () => operationalReportApi.getIncidentTrend(),
    staleTime: 5 * 60 * 1000,
  });

  const automationQuery = useQuery({
    queryKey: ['operational-reports', 'automation', params],
    queryFn: () => operationalReportApi.getAutomationStats(params),
    staleTime: 5 * 60 * 1000,
  });

  return {
    dateRange,
    setDateRange,

    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.isError,

    sla: slaQuery.data ?? [],
    slaLoading: slaQuery.isLoading,
    slaError: slaQuery.isError,

    slaTrend: slaTrendQuery.data ?? [],
    slaTrendLoading: slaTrendQuery.isLoading,
    slaTrendError: slaTrendQuery.isError,

    queue: queueQuery.data,
    queueLoading: queueQuery.isLoading,
    queueError: queueQuery.isError,

    staff: staffQuery.data ?? [],
    staffLoading: staffQuery.isLoading,
    staffError: staffQuery.isError,

    efficiency: efficiencyQuery.data ?? [],
    efficiencyLoading: efficiencyQuery.isLoading,
    efficiencyError: efficiencyQuery.isError,

    uptime: uptimeQuery.data ?? [],
    uptimeLoading: uptimeQuery.isLoading,
    uptimeError: uptimeQuery.isError,

    incidents: incidentsQuery.data ?? [],
    incidentsLoading: incidentsQuery.isLoading,
    incidentsError: incidentsQuery.isError,

    automation: automationQuery.data ?? [],
    automationLoading: automationQuery.isLoading,
    automationError: automationQuery.isError,

    hasLoadError:
      statsQuery.isError ||
      slaQuery.isError ||
      slaTrendQuery.isError ||
      queueQuery.isError ||
      staffQuery.isError ||
      efficiencyQuery.isError ||
      uptimeQuery.isError ||
      incidentsQuery.isError ||
      automationQuery.isError,
  };
}
