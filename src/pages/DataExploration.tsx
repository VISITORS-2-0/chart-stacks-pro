import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subDays, subHours, subMinutes } from "date-fns";

import { TemporalChartCard } from "@/components/TemporalChartCard";
import { SinglePatientAbstractionPanel, AbstractionInterval } from "@/components/SinglePatientAbstractionPanel";
import { FilterBar, TimeRange } from "@/components/FilterBar";
import { generateMockData } from "@/utils/chartData";
import { MOCK_VALUE_LEVELS } from "@/utils/mockAbstractionData";
import { fetchAbstractionData } from "@/services/abstractionService";
import type { MenuItem } from "@/components/DashboardSidebar";
import { useToast } from "@/hooks/use-toast";

interface ActiveChart extends MenuItem {
  data: Array<{ date: string; value: number }>;
  isRaw?: boolean;
  // State specific
  abstractionIntervals?: any[];
}

interface DataExplorationProps {
  activeCharts: ActiveChart[];
  onAddChart: (item: MenuItem) => void;
  onRemoveChart: (id: string) => void;
  onCloseAll: () => void;
  onCreateAssociation: () => void;
}

export function DataExploration({ activeCharts, onAddChart, onRemoveChart, onCloseAll, onCreateAssociation }: DataExplorationProps) {
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});
  const [patientIds, setPatientIds] = useState<string[]>([]); // Assuming single patient for now for abstraction panel
  const [timeRange, setTimeRange] = useState<TimeRange>({ type: "relative", relative: "30d" });
  const [patientCount] = useState(10000);
  const { toast } = useToast();

  // State to store real API data
  const [apiDataMap, setApiDataMap] = useState<Record<string, AbstractionInterval[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Helper to calculate date range
  const calculateDateRange = useCallback(() => {
    const end = new Date();
    let start = subDays(end, 30); // Default

    if (timeRange.type === "absolute" && timeRange.startDate && timeRange.endDate) {
        return { start: timeRange.startDate, end: timeRange.endDate };
    }
    
    if (timeRange.type === "relative" && timeRange.relative) {
        const val = parseInt(timeRange.relative); // e.g. "30d" -> 30
        if (timeRange.relative.endsWith("d")) start = subDays(end, val);
        else if (timeRange.relative.endsWith("h")) start = subHours(end, val);
        else if (timeRange.relative.endsWith("m")) start = subMinutes(end, val);
    }
    return { start, end };
  }, [timeRange]);


  // Fetch Data Effect
  useEffect(() => {
    const fetchForChart = async (chart: ActiveChart) => {
        // Only fetch for State charts
        if (chart.parent !== "State") return;
        
        // Skip if no patient selected (Abstraction panel needs a patient)
        if (patientIds.length === 0) return;

        // Use the first selected patient ID
        const currentPatientId = patientIds[0];
        
        // Key to prevent re-fetching if nothing changed (simplified)
        // ideally we check if data already exists for this config
        
        setLoadingMap(prev => ({ ...prev, [chart.id]: true }));
        
        try {
            const dates = calculateDateRange();
            const data = await fetchAbstractionData({
                patients_list: [currentPatientId],
                concept_name: chart.title, 
                start_date: format(dates.start, "yyyy-MM-dd'T'HH:mm:ss"),
                end_date: format(dates.end, "yyyy-MM-dd'T'HH:mm:ss")
            });
            
            setApiDataMap(prev => ({ ...prev, [chart.id]: data }));
        } catch (err) {
            console.error("Fetch failed", err);
            toast({ 
                title: "Error fetching abstraction data", 
                description: "Could not load data for " + chart.title,
                variant: "destructive"
            });
        } finally {
             setLoadingMap(prev => ({ ...prev, [chart.id]: false }));
        }
    };

    activeCharts.forEach(chart => {
        // Re-fetch logic or check if data exists
        // simplified: fetch whenever dependencies change
        fetchForChart(chart);
    });

  }, [activeCharts, patientIds, timeRange, calculateDateRange, toast]);


  useEffect(() => {
    // Synchronize horizontal scrolling across all chart containers
    const scrollContainers = document.querySelectorAll('[id^="chart-scroll-"]');

    const handleScroll = (e: Event) => {
      const scrollLeft = (e.target as HTMLElement).scrollLeft;
      scrollContainers.forEach((container) => {
        if (container !== e.target) {
          (container as HTMLElement).scrollLeft = scrollLeft;
        }
      });
    };

    scrollContainers.forEach((container) => {
      container.addEventListener('scroll', handleScroll);
    });

    return () => {
      scrollContainers.forEach((container) => {
        container.removeEventListener('scroll', handleScroll);
      });
    };
  }, [activeCharts]);

  const handleBrushChange = (startIndex: number, endIndex: number) => {
    setBrushRange({ startIndex, endIndex });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FilterBar
        patientIds={patientIds}
        onPatientIdsChange={setPatientIds}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        patientCount={patientCount}
        onCloseAll={onCloseAll}
        hasCharts={activeCharts.length > 0}
        onCreateAssociation={onCreateAssociation}
      />

      <div className="flex-1 overflow-auto">
        <div className="container max-w-7xl p-6">
          {activeCharts.length === 0 ? (
            <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Welcome to Medical Data Dashboard
                </h2>
                <p className="text-muted-foreground">
                  Select a metric from the sidebar to view its data visualization
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activeCharts.map((chart) => {
                if (chart.parent === "State") {
                    const isLoading = loadingMap[chart.id];
                    const data = apiDataMap[chart.id] || [];

                    return (
                        <div key={chart.id} className="relative">
                            {isLoading && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                        <span className="text-sm text-muted-foreground">Loading data...</span>
                                    </div>
                                </div>
                            )}

                            {patientIds.length === 0 ? (
                                <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground">
                                    Please select a patient to view abstraction data.
                                    <button
                                        onClick={() => onRemoveChart(chart.id)}
                                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground z-10"
                                        aria-label="Remove chart"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <SinglePatientAbstractionPanel
                                        patientId={patientIds[0]}
                                        conceptId={chart.id}
                                        conceptDisplayName={chart.title}
                                        intervals={data}
                                        valueLevels={MOCK_VALUE_LEVELS} // We can update this when API returns metadata
                                        className="w-full"
                                    />
                                    <button
                                        onClick={() => onRemoveChart(chart.id)}
                                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground z-10"
                                        aria-label="Remove chart"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    );
                }
                
                return (
                    <TemporalChartCard
                    key={chart.id}
                    id={chart.id}
                    title={chart.title}
                    onRemove={onRemoveChart}
                    isMultiPatient={chart.chartType === 'line' || chart.chartType === 'scatter'} 
                    isRaw={chart.isRaw}
                    />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
