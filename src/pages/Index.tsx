import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar, MenuItem } from "@/components/DashboardSidebar";
import { generateMockData } from "@/utils/chartData";
import { DataExploration } from "./DataExploration";
import { ManageGroups } from "./ManageGroups";
import { ManageConceptGroups } from "./ManageConceptGroups";

import { TimeRange } from "@/components/FilterBar";
import type { RelativeTimeConfig } from "@/components/RelativeTimeBar";
import { fetchAbstractionData, fetchRawData, fetchMultiplePatientsAbstraction, fetchMultiplePatientsNumericAbstraction, QueryParams, PatternQueryParams, NumericPatternQueryParams } from "@/api/temporal";
import { calculateDateRange } from "@/utils/dateUtils";
import { useToast } from "@/components/ui/use-toast";
import { useGeneratedDataMode } from "@/contexts/GeneratedDataContext";
import { GlobalToggle } from "@/components/GlobalToggle";
import { fetchGroups, Group } from "@/services/groupsApi";
import { useEffect } from "react";

interface ActiveChart extends MenuItem {
  externalData?: any[];
  conceptData?: any;
  isRaw?: boolean;
  currentInterval?: string; // Track current interval for Pattern charts (YE, ME, D)
  currentStart?: string;
  currentEnd?: string;
  originalStart?: string;
  originalEnd?: string;
  cutoffs?: number[];
  isBalanced?: boolean;
  patientIds?: string[];
  isRelative?: boolean; // Whether this chart was fetched in relative-time mode
  relativeEventName?: string; // The reference event name for display in the chart header
  viewType?: 'summary' | 'pure';
  relativeConfig?: RelativeTimeConfig;
  relativeConfigHistory?: RelativeTimeConfig[];
}

type TabValue = "exploration" | "manage-groups" | "manage-concept-groups" | string;

const calculateDefaultGranularity = (startDateStr: string, endDateStr: string): 'YE' | 'ME' | 'D' => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 365) return 'YE';
  if (start.getMonth() !== end.getMonth() || start.getFullYear() !== end.getFullYear() || diffDays >= 28) return 'ME';
  return 'D';
};

/**
 * Map relative time unit to the exact interval string expected by the backend validation schema.
 * Accepted values are 'D', 'ME', 'YE'.
 */
export const mapUnitToIntervalStr = (unit: 'd' | 'w' | 'm' | 'y'): 'D' | 'ME' | 'YE' => {
  switch (unit) {
    case 'y': return 'YE';
    case 'm': return 'ME';
    case 'w':
    case 'd':
    default: return 'D';
  }
};

const clampDateStr = (dateStr: string, minDateStr?: string, maxDateStr?: string) => {
  const dateMs = new Date(dateStr).getTime();
  const minMs = minDateStr ? new Date(minDateStr).getTime() : -Infinity;
  const maxMs = maxDateStr ? new Date(maxDateStr).getTime() : Infinity;

  if (dateMs < minMs && minDateStr) return minDateStr;
  if (dateMs > maxMs && maxDateStr) return maxDateStr;
  return dateStr;
};

const Index = () => {
  const [activeCharts, setActiveCharts] = useState<ActiveChart[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>("exploration");
  const { useGeneratedData } = useGeneratedDataMode();

  // Lifted State
  const [patientIds, setPatientIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: "absolute",
    startDate: new Date(2015, 0, 1),
    endDate: new Date(2025, 0, 1)
  });
  const [patientCount] = useState(10000);
  const { toast } = useToast();

  // Relative Time global state
  const [isRelativeMode, setIsRelativeMode] = useState(false);
  const [isPureIntervalsMode, setIsPureIntervalsMode] = useState(false);
  const [relativeConfig, setRelativeConfig] = useState<RelativeTimeConfig>({
    reference_concepts: [],
    occurrence_index: -1,
    start_delta: 0,
    end_delta: 35,
    unit: "d",
  });

  const loadGroupsFromApi = () => {
    fetchGroups().then((res) => {
      setGroups(res);
      setPatientIds([]);
    }).catch(err => console.error('Failed to load groups', err));
  };

  useEffect(() => {
    loadGroupsFromApi();
  }, []);

  const resolvePatientIds = (selectedIds: string[]) => {
    const individualIds = selectedIds.filter(id => !id.startsWith('group:'));
    const groupNames = selectedIds.filter(id => id.startsWith('group:')).map(id => id.substring(6));

    const groupPatientIds = groups
      .filter(g => groupNames.includes(g.name))
      .flatMap(g => g.patientIds);

    return Array.from(new Set([...individualIds, ...groupPatientIds]));
  };

  const buildRanges = (cutoffs?: number[], conceptData?: any) => {
    if (!cutoffs || cutoffs.length === 0) return undefined;
    const minValue = conceptData?.min ?? conceptData?.['min-value'] ?? 0;
    const maxValue = conceptData?.max ?? conceptData?.['max-value'] ?? 100;
    const ranges = [];
    let prev = minValue;
    for (const cut of cutoffs) {
      ranges.push({ min: prev, max: cut });
      prev = cut;
    }
    ranges.push({ min: prev, max: maxValue });
    return ranges;
  };

  const handleApplyCutoffs = async (chartId: string, cutoffs: number[], isBalanced: boolean) => {
    const chartIndex = activeCharts.findIndex(c => c.id === chartId);
    if (chartIndex === -1) return;

    const chart = activeCharts[chartIndex];
    if (!chart.originalItem) return;

    const chartIsRelative = chart.isRelative ?? false;
    const chartRelativeConfig = chart.relativeConfig;

    try {
      let fetchInterval: string;
      let reqStart: string | null;
      let reqEnd: string | null;

      const hasRelativeConcepts = chartIsRelative && chartRelativeConfig && chartRelativeConfig.reference_concepts?.length > 0;
      if (hasRelativeConcepts) {
        fetchInterval = chart.currentInterval || mapUnitToIntervalStr(chartRelativeConfig.unit);
        reqStart = null;
        reqEnd = null;
      } else {
        const { start_date, end_date } = calculateDateRange(timeRange);
        reqStart = chart.currentStart || start_date;
        reqEnd = chart.currentEnd || end_date;
        fetchInterval = chart.currentInterval || calculateDefaultGranularity(reqStart!, reqEnd!);
      }

      const chartPatientIds = chart.patientIds || patientIds;
      const resolvedIds = resolvePatientIds(chartPatientIds);

      const patternParams: NumericPatternQueryParams = {
        patients_list: resolvedIds,
        concept_name: chart.title,
        start_date: reqStart,
        end_date: reqEnd,
        interval_str: fetchInterval,
        method: 'most_time_spent',
        ranges: buildRanges(cutoffs, chart.conceptData),
        use_generated_data: useGeneratedData,
        ...(hasRelativeConcepts && chartRelativeConfig ? {
          relative_time: {
            reference_concepts: chartRelativeConfig.reference_concepts,
            occurrence_index: chartRelativeConfig.occurrence_index,
            start_delta: chartRelativeConfig.start_delta,
            end_delta: chartRelativeConfig.end_delta
          },
          interval_str: mapUnitToIntervalStr(chartRelativeConfig.unit)
        } : {}),
      };

      const response = await fetchMultiplePatientsNumericAbstraction(patternParams);

      const updatedCharts = [...activeCharts];
      updatedCharts[chartIndex] = {
        ...chart,
        externalData: processPatternResult(response.result, fetchInterval, resolvedIds.length, chart.isRelative),
        conceptData: response.concept_data,
        cutoffs,
        isBalanced
      };
      setActiveCharts(updatedCharts);
    } catch (error) {
      console.error("Failed to apply cutoffs", error);
      toast({ title: "Error applying cutoffs", description: String(error), variant: "destructive" });
    }
  };



  const handleItemClick = async (item: MenuItem, overridePatientIds?: string[]): Promise<{ success: boolean, errorMessage?: string }> => {
    // 1. Validation
    const currentPatientIds = overridePatientIds || patientIds;
    const resolvedIds = resolvePatientIds(currentPatientIds);

    if (resolvedIds.length === 0) {
      toast({
        title: "No Patient Selected",
        description: "Please select at least one patient before adding a chart.",
        variant: "destructive"
      });
      return { success: false, errorMessage: "No Patient Selected" };
    }

    // 2. Prepare Params — switch between absolute and relative modes
    const useRelative = isRelativeMode && relativeConfig.reference_concepts && relativeConfig.reference_concepts.length > 0;

    // For duplicate-chart check, use a stable key that incorporates mode
    const { start_date: absStart, end_date: absEnd } = calculateDateRange(timeRange);
    const conceptsStr = useRelative
      ? relativeConfig.reference_concepts.map(rc => `${rc.concept_name}${rc.concept_value ? '=' + rc.concept_value : ''}`).join(',')
      : '';
    const dedupStart = useRelative ? `rel:${conceptsStr}:${relativeConfig.occurrence_index}:${relativeConfig.start_delta}${relativeConfig.unit}` : absStart;
    const dedupEnd = useRelative ? `${relativeConfig.end_delta}${relativeConfig.unit}` : absEnd;

    const exists = activeCharts.some((chart) => {
      const sameConcept = (chart.originalItem?.id !== undefined && chart.originalItem?.id === item.originalItem?.id) || chart.title === item.title;
      const samePatients =
        chart.patientIds?.length === resolvedIds.length &&
        chart.patientIds.every(id => resolvedIds.includes(id));
      const sameTimeRange = chart.currentStart === dedupStart && chart.currentEnd === dedupEnd;
      const sameMode = (chart.isRelative ?? false) === useRelative;
      return sameConcept && samePatients && sameTimeRange && sameMode;
    });

    if (exists) return { success: true };

    // Build the base query params
    const params: QueryParams = {
      patients_list: resolvedIds,
      concept_name: item.title,
      start_date: useRelative ? null : absStart,
      end_date: useRelative ? null : absEnd,
      use_generated_data: useGeneratedData,
      ...(useRelative ? {
        relative_time: {
          reference_concepts: relativeConfig.reference_concepts,
          occurrence_index: relativeConfig.occurrence_index,
          start_delta: relativeConfig.start_delta,
          end_delta: relativeConfig.end_delta
        },
        interval_str: mapUnitToIntervalStr(relativeConfig.unit)
      } : {}),
    };

    // Default interval
    const defaultInterval = useRelative
      ? mapUnitToIntervalStr(relativeConfig.unit)
      : calculateDefaultGranularity(absStart, absEnd);

    try {
      let resultData;
      let conceptData;

      // 3. Call API based on type
      const parentSection = item.parent as string;
      const isContinuousPattern = item.originalItem?.output_type === "range" && item.originalItem?.duration_type === "interval";
      let isRawType = parentSection.toLowerCase() === 'raw-numeric' || isContinuousPattern;

      if (resolvedIds.length === 1) {
        if (isRawType) {
          const response = await fetchRawData(params);
          resultData = response.result;
          conceptData = response.concept_data;
        } else {
          const response = await fetchAbstractionData(params);
          resultData = response.result;
          conceptData = response.concept_data;
        }
      } else {
        if (isContinuousPattern) {
          const patternParams: NumericPatternQueryParams = {
            ...params,
            interval_str: defaultInterval,
            method: 'most_time_spent'
          };
          const response = await fetchMultiplePatientsNumericAbstraction(patternParams);
          conceptData = response.concept_data;
          resultData = processPatternResult(response.result, defaultInterval, resolvedIds.length, useRelative);
          isRawType = false;
        } else if (isRawType) {
          const response = await fetchRawData(params);
          resultData = response.result;
          conceptData = response.concept_data;
        } else {
          if (isPureIntervalsMode) {
            const response = await fetchAbstractionData(params);
            conceptData = response.concept_data;
            resultData = response.result;
          } else {
            const patternParams: PatternQueryParams = {
              ...params,
              interval_str: defaultInterval,
              method: 'most_time_spent'
            };
            const response = await fetchMultiplePatientsAbstraction(patternParams);
            conceptData = response.concept_data;
            resultData = processPatternResult(response.result, defaultInterval, resolvedIds.length, useRelative);
          }
        }
      }

      if (!resultData || resultData.length === 0) {
        toast({
          title: "No Data Available",
          description: `There is no data for concept "${item.title}" for the selected patient(s).`,
          variant: "destructive"
        });
        return { success: false, errorMessage: "No data available" };
      }

      const newChart: ActiveChart = {
        ...item,
        id: `${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        externalData: resultData,
        conceptData: conceptData,
        isRaw: isRawType,
        // In relative mode, always store the interval so all chart types know the granularity.
        // In absolute mode, only store for multi-patient pattern charts.
        currentInterval: useRelative
          ? defaultInterval
          : ((!isRawType && resolvedIds.length > 1) ? defaultInterval : undefined),
        // Store dedup keys as currentStart/End so equality checks work for both modes
        currentStart: dedupStart,
        currentEnd: dedupEnd,
        originalStart: useRelative ? undefined : absStart,
        originalEnd: useRelative ? undefined : absEnd,
        patientIds: resolvedIds,
        isRelative: useRelative,
        relativeConfig: useRelative ? { ...relativeConfig } : undefined,
        relativeEventName: useRelative
          ? (relativeConfig.selected_group_name
              ? `Group: ${relativeConfig.selected_group_name}`
              : relativeConfig.reference_concepts.map(rc => `${rc.concept_name}${rc.concept_value ? ` (${rc.concept_value})` : ''}`).join(', '))
          : undefined,
        viewType: (!isRawType && resolvedIds.length > 1) ? (isPureIntervalsMode ? 'pure' : 'summary') : undefined,
      };

      setActiveCharts((prev) => [...prev, newChart]);
      return { success: true };

    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: "Error fetching data",
        description: String(error),
        variant: "destructive"
      });
      return { success: false, errorMessage: String(error) };
    }
  };

  const processPatternResult = (result: any[], intervalStr: string, totalPatients: number, isRelative?: boolean) => {
    const transformed = result.map(item => {
      const startMs = new Date(item.StartTime).getTime();
      const endMs = new Date(item.EndTime).getTime();
      const d = new Date((startMs + endMs) / 2);

      const yStr = (isRelative ? d.getUTCFullYear() : d.getFullYear()).toString();
      const mStr = String((isRelative ? d.getUTCMonth() : d.getMonth()) + 1).padStart(2, '0');
      const dStr = String(isRelative ? d.getUTCDate() : d.getDate()).padStart(2, '0');

      // For key, if YE -> YYYY. If ME -> YYYY-MM. If D -> YYYY-MM-DD.
      let key = yStr;
      if (intervalStr === 'ME') key = `${yStr}-${mStr}`;
      else if (intervalStr === 'D') key = `${yStr}-${mStr}-${dStr}`;

      const row: any = {
        month: key, // Using 'month' as common x-axis key for now
      };

      if (item.Value_Dict) {
        Object.entries(item.Value_Dict).forEach(([k, v]: [string, any]) => {
          row[k] = v;
          row[`${k}Pct`] = totalPatients > 0 ? (v / totalPatients) * 100 : 0;
        });
      }
      return row;
    });
    return transformed.sort((a: any, b: any) => a.month.localeCompare(b.month));
  };

  const handleChartDrillDown = async (chartId: string, date: Date, currentZoomLevel: string) => {
    const chartIndex = activeCharts.findIndex(c => c.id === chartId);
    if (chartIndex === -1) return;

    const chart = activeCharts[chartIndex];
    const currentChartPatientIds = chart.patientIds || patientIds;
    const chartIsRelative = chart.isRelative ?? false;
    const chartRelativeConfig = chart.relativeConfig;

    // Server-side drill-down only applies to multi-patient pattern charts.
    // Single-patient and raw charts zoom client-side via TemporalChartCard's local zoomLevel.
    const resolvedIds = resolvePatientIds(currentChartPatientIds);
    if (resolvedIds.length <= 1 || chart.isRaw || chart.viewType === 'pure') return;

    // Set loading state
    setActiveCharts(prev => prev.map(c => c.id === chartId ? { ...c, loading: true } : c));

    const currentInterval = chart.currentInterval || (chartIsRelative && chartRelativeConfig ? mapUnitToIntervalStr(chartRelativeConfig.unit) : 'YE');
    let nextInterval = '';

    if (currentInterval === 'YE') {
      nextInterval = 'ME';
    } else if (currentInterval === 'ME') {
      nextInterval = 'D';
    } else {
      // Already at 'D', no further drill down
      return;
    }

    // In relative mode: compute new start_delta, end_delta and unit in updatedRelativeConfig
    // In absolute mode: compute date range from the clicked date
    let startDateStr: string | null = '';
    let endDateStr: string | null = '';
    let updatedRelativeConfig = chartRelativeConfig;
    let nextHistory = chart.relativeConfigHistory ? [...chart.relativeConfigHistory] : [];

    if (chartIsRelative) {
      startDateStr = null;
      endDateStr = null;
      if (chartRelativeConfig) {
        nextHistory.push(chartRelativeConfig);

        let nextStartDelta = chartRelativeConfig.start_delta;
        let nextEndDelta = chartRelativeConfig.end_delta;
        let nextUnit: 'd' | 'm' | 'y' = chartRelativeConfig.unit;

        if (currentInterval === 'YE') {
          const clickedYear = date.getUTCFullYear();
          const yOffset = clickedYear - 1970;
          nextStartDelta = yOffset * 12;
          nextEndDelta = (yOffset + 1) * 12;
          nextUnit = 'm';
        } else if (currentInterval === 'ME') {
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          const anchor = new Date(Date.UTC(1970, 0, 1));
          const startOfMonth = new Date(Date.UTC(year, month, 1));
          const startOfNextMonth = new Date(Date.UTC(year, month + 1, 1));
          
          nextStartDelta = Math.round((startOfMonth.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
          nextEndDelta = Math.round((startOfNextMonth.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
          nextUnit = 'd';
        }

        updatedRelativeConfig = {
          ...chartRelativeConfig,
          start_delta: nextStartDelta,
          end_delta: nextEndDelta,
          unit: nextUnit,
        };
      }
    } else {
      if (currentInterval === 'YE') {
        const y = date.getFullYear();
        startDateStr = `${y}-01-01T00:00:00`;
        endDateStr = `${y}-12-31T23:59:59`;
      } else if (currentInterval === 'ME') {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        startDateStr = `${y}-${m.toString().padStart(2, '0')}-01T00:00:00`;
        const lastDay = new Date(y, m, 0).getDate();
        endDateStr = `${y}-${m.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}T23:59:59`;
      }
      startDateStr = clampDateStr(startDateStr!, chart.originalStart, chart.originalEnd);
      endDateStr = clampDateStr(endDateStr!, chart.originalStart, chart.originalEnd);
    }

    try {
      const isContinuous = chart.originalItem?.output_type === "range" && chart.originalItem?.duration_type === "interval";
      let response;

      if (isContinuous) {
        const params: NumericPatternQueryParams = {
          patients_list: resolvedIds,
          concept_name: chart.title,
          start_date: startDateStr,
          end_date: endDateStr,
          interval_str: nextInterval,
          method: 'most_time_spent',
          ranges: buildRanges(chart.cutoffs, chart.conceptData),
          use_generated_data: useGeneratedData,
          ...(chartIsRelative && updatedRelativeConfig && updatedRelativeConfig.reference_concepts?.length ? {
            relative_time: {
              reference_concepts: updatedRelativeConfig.reference_concepts,
              occurrence_index: updatedRelativeConfig.occurrence_index,
              start_delta: updatedRelativeConfig.start_delta,
              end_delta: updatedRelativeConfig.end_delta
            }
          } : {}),
        };
        response = await fetchMultiplePatientsNumericAbstraction(params);
      } else {
        const params: PatternQueryParams = {
          patients_list: resolvedIds,
          concept_name: chart.title,
          start_date: startDateStr,
          end_date: endDateStr,
          interval_str: nextInterval,
          method: 'most_time_spent',
          use_generated_data: useGeneratedData,
          ...(chartIsRelative && updatedRelativeConfig && updatedRelativeConfig.reference_concepts?.length ? {
            relative_time: {
              reference_concepts: updatedRelativeConfig.reference_concepts,
              occurrence_index: updatedRelativeConfig.occurrence_index,
              start_delta: updatedRelativeConfig.start_delta,
              end_delta: updatedRelativeConfig.end_delta
            }
          } : {}),
        };
        response = await fetchMultiplePatientsAbstraction(params);
      }

      setActiveCharts(prev => {
        const index = prev.findIndex(c => c.id === chartId);
        if (index === -1) return prev;
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          externalData: processPatternResult(response.result, nextInterval, resolvedIds.length, chartIsRelative),
          currentInterval: nextInterval,
          ...(chartIsRelative ? { relativeConfig: updatedRelativeConfig, relativeConfigHistory: nextHistory } : { currentStart: startDateStr!, currentEnd: endDateStr! }),
          conceptData: response.concept_data,
          loading: false,
        };
        return copy;
      });

    } catch (error) {
      console.error("Failed to drill down", error);
      toast({ title: "Error drilling down", description: String(error), variant: "destructive" });
      setActiveCharts(prev => prev.map(c => c.id === chartId ? { ...c, loading: false } : c));
    }
  };

  const handleChartZoomOut = async (chartId: string) => {
    const chartIndex = activeCharts.findIndex(c => c.id === chartId);
    if (chartIndex === -1) {
      return;
    }

    const chart = activeCharts[chartIndex];
    const currentChartPatientIds = chart.patientIds || patientIds;
    const chartIsRelative = chart.isRelative ?? false;
    const chartRelativeConfig = chart.relativeConfig;

    const resolvedIds = resolvePatientIds(currentChartPatientIds);
    if (resolvedIds.length <= 1 || chart.isRaw || !chart.currentInterval || chart.viewType === 'pure') return;

    // Set loading state
    setActiveCharts(prev => prev.map(c => c.id === chartId ? { ...c, loading: true } : c));

    const currentInterval = chart.currentInterval || (chartIsRelative && chartRelativeConfig ? mapUnitToIntervalStr(chartRelativeConfig.unit) : 'YE');
    let prevInterval = '';
    let startDateStr: string | null = '';
    let endDateStr: string | null = '';
    let updatedRelativeConfig = chartRelativeConfig;
    let nextHistory = chart.relativeConfigHistory ? [...chart.relativeConfigHistory] : [];

    if (currentInterval === 'D') {
      prevInterval = 'ME';
    } else if (currentInterval === 'ME') {
      prevInterval = 'YE';
    } else {
      // Already at YE, no further zoom out
      return;
    }

    if (chartIsRelative) {
      startDateStr = null;
      endDateStr = null;
      if (nextHistory.length > 0) {
        updatedRelativeConfig = nextHistory.pop()!;
      } else if (chartRelativeConfig) {
        let prevStartDelta = chartRelativeConfig.start_delta;
        let prevEndDelta = chartRelativeConfig.end_delta;
        let prevUnit: 'd' | 'm' | 'y' = chartRelativeConfig.unit;

        if (currentInterval === 'D') {
          const anchor = new Date(Date.UTC(1970, 0, 1));
          const startDate = new Date(anchor.getTime() + chartRelativeConfig.start_delta * 24 * 60 * 60 * 1000);
          const endDate = new Date(anchor.getTime() + (chartRelativeConfig.end_delta - 0.1) * 24 * 60 * 60 * 1000);

          prevStartDelta = (startDate.getUTCFullYear() - 1970) * 12 + startDate.getUTCMonth();
          prevEndDelta = (endDate.getUTCFullYear() - 1970) * 12 + endDate.getUTCMonth() + 1;
          prevUnit = 'm';
        } else if (currentInterval === 'ME') {
          prevStartDelta = Math.floor(chartRelativeConfig.start_delta / 12);
          prevEndDelta = Math.ceil(chartRelativeConfig.end_delta / 12);
          prevUnit = 'y';
        }

        updatedRelativeConfig = {
          ...chartRelativeConfig,
          start_delta: prevStartDelta,
          end_delta: prevEndDelta,
          unit: prevUnit,
        };
      }
    } else {
      if (currentInterval === 'D') {
        if (chart.currentStart) {
          const date = new Date(chart.currentStart);
          const y = date.getFullYear();
          startDateStr = `${y}-01-01T00:00:00`;
          endDateStr = `${y}-12-31T23:59:59`;
        }
      } else if (currentInterval === 'ME') {
        startDateStr = chart.originalStart || '';
        endDateStr = chart.originalEnd || '';
      }

      if (prevInterval !== 'YE') {
        startDateStr = clampDateStr(startDateStr!, chart.originalStart, chart.originalEnd);
        endDateStr = clampDateStr(endDateStr!, chart.originalStart, chart.originalEnd);
      }
    }

    try {
      const isContinuous = chart.originalItem?.output_type === "range" && chart.originalItem?.duration_type === "interval";
      let response;
      if (isContinuous) {
        const params: NumericPatternQueryParams = {
          patients_list: resolvedIds,
          concept_name: chart.title,
          start_date: startDateStr,
          end_date: endDateStr,
          interval_str: prevInterval,
          method: 'most_time_spent',
          ranges: buildRanges(chart.cutoffs, chart.conceptData),
          use_generated_data: useGeneratedData,
          ...(chartIsRelative && updatedRelativeConfig && updatedRelativeConfig.reference_concepts?.length ? {
            relative_time: {
              reference_concepts: updatedRelativeConfig.reference_concepts,
              occurrence_index: updatedRelativeConfig.occurrence_index,
              start_delta: updatedRelativeConfig.start_delta,
              end_delta: updatedRelativeConfig.end_delta
            }
          } : {}),
        };
        response = await fetchMultiplePatientsNumericAbstraction(params);
      } else {
        const params: PatternQueryParams = {
          patients_list: resolvedIds,
          concept_name: chart.title,
          start_date: startDateStr,
          end_date: endDateStr,
          interval_str: prevInterval,
          method: 'most_time_spent',
          use_generated_data: useGeneratedData,
          ...(chartIsRelative && updatedRelativeConfig && updatedRelativeConfig.reference_concepts?.length ? {
            relative_time: {
              reference_concepts: updatedRelativeConfig.reference_concepts,
              occurrence_index: updatedRelativeConfig.occurrence_index,
              start_delta: updatedRelativeConfig.start_delta,
              end_delta: updatedRelativeConfig.end_delta
            }
          } : {}),
        };
        response = await fetchMultiplePatientsAbstraction(params);
      }

      setActiveCharts(prev => {
        const index = prev.findIndex(c => c.id === chartId);
        if (index === -1) return prev;
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          externalData: processPatternResult(response.result, prevInterval, resolvedIds.length, chartIsRelative),
          currentInterval: prevInterval,
          ...(chartIsRelative ? { relativeConfig: updatedRelativeConfig, relativeConfigHistory: nextHistory } : { currentStart: startDateStr!, currentEnd: endDateStr! }),
          conceptData: response.concept_data,
          loading: false,
        };
        return copy;
      });

    } catch (error) {
      console.error("Failed to zoom out", error);
      toast({ title: "Error zooming out", description: String(error), variant: "destructive" });
      setActiveCharts(prev => prev.map(c => c.id === chartId ? { ...c, loading: false } : c));
    }
  };

  const handleChartNavigate = async (chartId: string, direction: 'next' | 'prev', currentZoom: string, focusDate: Date | null) => {
    if (!focusDate) return;
    const chartIndex = activeCharts.findIndex(c => c.id === chartId);
    if (chartIndex === -1) return;

    const chart = activeCharts[chartIndex];
    const currentChartPatientIds = chart.patientIds || patientIds;
    const resolvedIds = resolvePatientIds(currentChartPatientIds);
    // Navigation is not meaningful in relative mode or pure intervals mode
    if (resolvedIds.length <= 1 || chart.isRaw || chart.isRelative || chart.viewType === 'pure') return;

    let startDateStr = '';
    let endDateStr = '';
    let fetchInterval = chart.currentInterval || 'ME';

    const y = focusDate.getFullYear();
    const m = focusDate.getMonth();

    if (currentZoom === 'months') {
      // TemporalChartCard already adjusted focusDate to the correct target date
      const targetYear = y;
      startDateStr = `${targetYear}-01-01T00:00:00`;
      endDateStr = `${targetYear}-12-31T23:59:59`;
      fetchInterval = 'ME';
    } else if (currentZoom === 'days') {
      const targetYear = y;
      const targetMonth = m; // Already adjusted by TemporalChartCard

      // Start is 1st of target month
      // End is last day of target month
      const startD = new Date(targetYear, targetMonth, 1);
      const endD = new Date(targetYear, targetMonth + 1, 0); // 0 gets last day of previous month

      startDateStr = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;
      endDateStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}T23:59:59`;
      fetchInterval = 'D';
    } else {
      return;
    }

    startDateStr = clampDateStr(startDateStr, chart.originalStart, chart.originalEnd);
    endDateStr = clampDateStr(endDateStr, chart.originalStart, chart.originalEnd);

    try {
      const isContinuous = chart.originalItem?.output_type === "range" && chart.originalItem?.duration_type === "interval";
      let response;
      if (isContinuous) {
        const params: NumericPatternQueryParams = {
          patients_list: resolvedIds,
          concept_name: chart.title,
          start_date: startDateStr,
          end_date: endDateStr,
          interval_str: fetchInterval,
          method: 'most_time_spent',
          ranges: buildRanges(chart.cutoffs, chart.conceptData),
          use_generated_data: useGeneratedData
        };
        response = await fetchMultiplePatientsNumericAbstraction(params);
      } else {
        const params: PatternQueryParams = {
          patients_list: resolvedIds,
          concept_name: chart.title,
          start_date: startDateStr,
          end_date: endDateStr,
          interval_str: fetchInterval,
          method: 'most_time_spent',
          use_generated_data: useGeneratedData
        };
        response = await fetchMultiplePatientsAbstraction(params);
      }

      const updatedCharts = [...activeCharts];
      updatedCharts[chartIndex] = {
        ...chart,
        externalData: processPatternResult(response.result, fetchInterval, resolvedIds.length, chart.isRelative),
        currentInterval: fetchInterval,
        currentStart: startDateStr,
        currentEnd: endDateStr,
        conceptData: response.concept_data, // usually stable but good to update
      };
      setActiveCharts(updatedCharts);

    } catch (error) {
      console.error("Failed to navigate chart data", error);
      toast({ title: "Error navigating data", description: String(error), variant: "destructive" });
    }
  };

  const handleRemoveChart = (id: string) => {
    setActiveCharts((prev) => prev.filter((chart) => chart.id !== id));
  };

  const handleCloseAll = () => {
    setActiveCharts([]);
  };

  const renderActiveScreen = () => {
    if (activeTab === "exploration") {
      return (
        <DataExploration
          activeCharts={activeCharts}
          onAddChart={handleItemClick}
          onRemoveChart={handleRemoveChart}
          onCloseAll={handleCloseAll}
          // Absolute time props
          patientIds={patientIds}
          setPatientIds={setPatientIds}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          patientCount={patientCount}
          onChartDrillDown={handleChartDrillDown}
          onChartZoomOut={handleChartZoomOut}
          onChartNavigate={handleChartNavigate}
          onApplyCutoffs={handleApplyCutoffs}
          // Relative time props
          isRelativeMode={isRelativeMode}
          setIsRelativeMode={setIsRelativeMode}
          relativeConfig={relativeConfig}
          setRelativeConfig={setRelativeConfig}
          groups={groups}
          isPureIntervalsMode={isPureIntervalsMode}
          onPureIntervalsModeChange={setIsPureIntervalsMode}
        />
      );
    }

    if (activeTab === "manage-groups") {
      return <ManageGroups onGroupsChange={loadGroupsFromApi} />;
    }

    if (activeTab === "manage-concept-groups") {
      return <ManageConceptGroups />;
    }

    return null;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardSidebar
          onItemClick={handleItemClick}
          patientIds={resolvePatientIds(patientIds)}
          onCloseAll={handleCloseAll}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="w-full border-b bg-background px-6 h-12 flex items-center flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab("exploration")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === "exploration"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Data Exploration
              {activeTab === "exploration" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("manage-groups")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === "manage-groups"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Manage User Groups
              {activeTab === "manage-groups" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("manage-concept-groups")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === "manage-concept-groups"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Manage Concept Values Groups
              {activeTab === "manage-concept-groups" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <div className="flex-1" />
            <GlobalToggle />
          </div>

          {/* Active Screen */}
          {renderActiveScreen()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
