import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar, MenuItem } from "@/components/DashboardSidebar";
import { generateMockData } from "@/utils/chartData";
import { DataExploration } from "./DataExploration";
import { PopulationQuery } from "./PopulationQuery";
import { PatternExplorer } from "./PatternExplorer";
import { DataExport } from "./DataExport";

import { TimeRange } from "@/components/FilterBar";
import { fetchAbstractionData, fetchRawData, fetchMultiplePatientsAbstraction, QueryParams, PatternQueryParams } from "@/api/temporal";
import { calculateDateRange } from "@/utils/dateUtils";
import { useToast } from "@/components/ui/use-toast";

interface ActiveChart extends MenuItem {
  // data: Array<{ date: string; value: number }>;
  externalData?: any[];
  conceptData?: any;
  isRaw?: boolean;
  currentInterval?: string; // Track current interval for Pattern charts (YE, ME, D)
  currentStart?: string;
  currentEnd?: string;
}

type TabValue = "exploration" | "population" | "pattern" | "export" | string;

const Index = () => {
  const [activeCharts, setActiveCharts] = useState<ActiveChart[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>("exploration");

  // Lifted State
  const [patientIds, setPatientIds] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>({ type: "relative", relative: "5y" });
  const [patientCount] = useState(10000);
  const { toast } = useToast();

  const handleItemClick = async (item: MenuItem) => {
    // Check if chart already exists
    const exists = activeCharts.some((chart) => chart.id === item.id);
    if (exists) return;

    // 1. Validation
    if (patientIds.length === 0) {
      toast({
        title: "No Patient Selected",
        description: "Please select at least one patient before adding a chart.",
        variant: "destructive"
      });
      return;
    }

    // 2. Prepare Params
    const { start_date, end_date } = calculateDateRange(timeRange);
    const params: QueryParams = {
      patients_list: patientIds,
      concept_name: item.title,
      start_date,
      end_date
    };

    try {
      let resultData;
      let conceptData;

      // 3. Call API based on type
      const parentSection = item.parent as string;

      if (parentSection === "State" || parentSection === "Pattern" || parentSection === "Context") {
        if (parentSection === "State") {
          const response = await fetchAbstractionData(params);
          resultData = response.result;
          conceptData = response.concept_data;
        } else if (parentSection === "Pattern") {
          const patternParams: PatternQueryParams = {
            ...params,
            interval_str: 'YE',
            method: 'most_time_spent'
          };
          const response = await fetchMultiplePatientsAbstraction(patternParams);
          conceptData = response.concept_data;

          // Transform Pattern Result to PatientStatusProcessedRow format
          resultData = response.result.map(item => {
            const d = new Date(item.StartTime);
            const yStr = d.getFullYear().toString();

            const row: any = {
              month: yStr, // Using YYYY as key as we default to 'YE'
              // Also add a "year" property or similar if needed, but "month" is what PatientStatusAnalytics expects for x-axis key currently
            };

            // Flatted Value_Dict
            if (item.Value_Dict) {
              Object.entries(item.Value_Dict).forEach(([key, val]) => {
                row[key] = val;
                // Calculate percentage
                row[`${key}Pct`] = item.TotalPatientsWithData > 0 ? (val / item.TotalPatientsWithData) * 100 : 0;
              });
            }
            return row;
          });

          // Sort by time
          resultData.sort((a: any, b: any) => a.month.localeCompare(b.month));

        } else {
          // Fallback to abstract (Context)
          const response = await fetchAbstractionData(params);
          resultData = response.result;
          conceptData = response.concept_data;
        }
      } else if (parentSection === "Raw") {
        console.log("Sending Raw Data Request with params:", JSON.stringify(params, null, 2));
        const response = await fetchRawData(params);
        console.log("Received Raw Data Response:", JSON.stringify(response, null, 2));

        resultData = response.result;
        conceptData = response.concept_data;

      } else {
        const response = await fetchAbstractionData(params);
        resultData = response.result;
        conceptData = response.concept_data;
      }

      // Generate new chart with REAL data
      const newChart: ActiveChart = {
        ...item,
        externalData: resultData,
        conceptData: conceptData,
        isRaw: item.parent === 'Raw',
        currentInterval: item.parent === 'Pattern' ? 'YE' : undefined,
        currentStart: params.start_date,
        currentEnd: params.end_date,
      };

      setActiveCharts((prev) => [...prev, newChart]);

    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: "Error fetching data",
        description: String(error),
        variant: "destructive"
      });
    }
  };

  const processPatternResult = (result: any[], intervalStr: string) => {
    const transformed = result.map(item => {
      const d = new Date(item.StartTime);
      const yStr = d.getFullYear().toString();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');

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
          row[`${k}Pct`] = item.TotalPatientsWithData > 0 ? (v / item.TotalPatientsWithData) * 100 : 0;
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
    // Only for Pattern charts for now
    if (chart.parent !== 'Pattern') return;

    const currentInterval = chart.currentInterval || 'YE';
    let nextInterval = 'YE';
    let startDateStr = '';
    let endDateStr = '';

    if (currentInterval === 'YE') {
      nextInterval = 'ME';
      // Start of selected year
      const y = date.getFullYear();
      startDateStr = `${y}-01-01`;
      endDateStr = `${y}-12-31`;
    } else if (currentInterval === 'ME') {
      nextInterval = 'D';
      // Start of selected month
      const y = date.getFullYear();
      const m = date.getMonth() + 1; // getMonth() is 0-indexed
      startDateStr = `${y}-${m.toString().padStart(2, '0')}-01`;
      // End of selected month
      const lastDay = new Date(y, m, 0).getDate();
      endDateStr = `${y}-${m.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    } else {
      // Already at 'D', no further drill down
      return;
    }

    try {
      const params: PatternQueryParams = {
        patients_list: patientIds,
        concept_name: chart.title,
        start_date: startDateStr,
        end_date: endDateStr,
        interval_str: nextInterval,
        method: 'most_time_spent'
      };

      const response = await fetchMultiplePatientsAbstraction(params);

      // Update Chart
      const updatedCharts = [...activeCharts];
      updatedCharts[chartIndex] = {
        ...chart,
        externalData: processPatternResult(response.result, nextInterval),
        currentInterval: nextInterval,
        currentStart: startDateStr,
        currentEnd: endDateStr,
        conceptData: response.concept_data,
      };
      setActiveCharts(updatedCharts);

    } catch (error) {
      console.error("Failed to drill down", error);
      toast({ title: "Error drilling down", description: String(error), variant: "destructive" });
    }
  };

  const handleChartZoomOut = async (chartId: string) => {
    const chartIndex = activeCharts.findIndex(c => c.id === chartId);
    if (chartIndex === -1) {
      return;
    }

    const chart = activeCharts[chartIndex];
    if (chart.parent !== 'Pattern' || !chart.currentInterval) return;

    let prevInterval = '';
    let startDateStr = '';
    let endDateStr = '';

    if (chart.currentInterval === 'D') {
      prevInterval = 'ME';
      // Extract year from currentStart (e.g., "2023-01-15")
      if (chart.currentStart) {
        const date = new Date(chart.currentStart);
        const y = date.getFullYear();
        startDateStr = `${y}-01-01`;
        endDateStr = `${y}-12-31`;
      }
    } else if (chart.currentInterval === 'ME') {
      prevInterval = 'YE';
      // Revert to global time range
      const { start_date, end_date } = calculateDateRange(timeRange);
      startDateStr = start_date;
      endDateStr = end_date;
    } else {
      // Already at YE, no further zoom out
      return;
    }

    try {
      const params: PatternQueryParams = {
        patients_list: patientIds,
        concept_name: chart.title,
        start_date: startDateStr,
        end_date: endDateStr,
        interval_str: prevInterval,
        method: 'most_time_spent'
      };

      const response = await fetchMultiplePatientsAbstraction(params);

      const updatedCharts = [...activeCharts];
      updatedCharts[chartIndex] = {
        ...chart,
        externalData: processPatternResult(response.result, prevInterval),
        currentInterval: prevInterval,
        currentStart: startDateStr,
        currentEnd: endDateStr,
        conceptData: response.concept_data,
      };
      setActiveCharts(updatedCharts);

    } catch (error) {
      console.error("Failed to zoom out", error);
      toast({ title: "Error zooming out", description: String(error), variant: "destructive" });
    }
  };

  const handleChartNavigate = async (chartId: string, direction: 'next' | 'prev', currentZoom: string, focusDate: Date | null) => {
    if (!focusDate) return;
    const chartIndex = activeCharts.findIndex(c => c.id === chartId);
    if (chartIndex === -1) return;

    const chart = activeCharts[chartIndex];
    if (chart.parent !== 'Pattern') return; // Only abstractions for now

    let startDateStr = '';
    let endDateStr = '';
    let fetchInterval = chart.currentInterval || 'ME';

    const y = focusDate.getFullYear();
    const m = focusDate.getMonth();

    if (currentZoom === 'months') {
      // We are looking at a full year, broken into months
      // Next -> next year, Prev -> previous year
      const targetYear = y + (direction === 'next' ? 1 : -1);
      startDateStr = `${targetYear}-01-01`;
      endDateStr = `${targetYear}-12-31`;
      fetchInterval = 'ME';
    } else if (currentZoom === 'days') {
      // We are looking at a full month, broken into days
      // Next -> next month, Prev -> previous month
      let targetYear = y;
      let targetMonth = m + (direction === 'next' ? 1 : -1);

      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
      } else if (targetMonth < 0) {
        targetMonth = 11;
        targetYear--;
      }

      // Start is 1st of target month
      // End is last day of target month
      const startD = new Date(targetYear, targetMonth, 1);
      const endD = new Date(targetYear, targetMonth + 1, 0); // 0 gets last day of previous month

      startDateStr = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-01`;
      endDateStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
      fetchInterval = 'D';

      // Important: We need to update the focusDate in TemporalChartCard so the calendar math holds up.
      // But since focusDate is internal state there, we can either pass it back down,
      // OR let the TemporalChartCard manage its own onNavigate local state change,
      // BUT we already shift data so filtering would clash if TemporalChartCard doesn't update focusDate.
      // Easiest is to let TemporalChartCard handle its local state jump and we just fetch the data window.
    } else {
      return;
    }

    try {
      const params: PatternQueryParams = {
        patients_list: patientIds,
        concept_name: chart.title,
        start_date: startDateStr,
        end_date: endDateStr,
        interval_str: fetchInterval,
        method: 'most_time_spent'
      };

      const response = await fetchMultiplePatientsAbstraction(params);

      const updatedCharts = [...activeCharts];
      updatedCharts[chartIndex] = {
        ...chart,
        externalData: processPatternResult(response.result, fetchInterval),
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
          onAddChart={handleItemClick} // This prop might be unused if sidebar handles clicks directly, check Usage
          onRemoveChart={handleRemoveChart}
          onCloseAll={handleCloseAll}
          // New Props
          patientIds={patientIds}
          setPatientIds={setPatientIds}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          patientCount={patientCount}
          onChartDrillDown={handleChartDrillDown}
          onChartZoomOut={handleChartZoomOut}
          onChartNavigate={handleChartNavigate}
        />
      );
    }

    if (activeTab === "population") {
      return <PopulationQuery />;
    }

    if (activeTab === "pattern") {
      return <PatternExplorer />;
    }

    if (activeTab === "export") {
      return <DataExport />;
    }

    return null;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardSidebar onItemClick={handleItemClick} />

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
              onClick={() => setActiveTab("population")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === "population"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Population Query
              {activeTab === "population" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("pattern")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === "pattern"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Pattern Explorer
              {activeTab === "pattern" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === "export"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Data Export
              {activeTab === "export" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Active Screen */}
          {renderActiveScreen()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
