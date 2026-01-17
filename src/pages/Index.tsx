import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar, MenuItem } from "@/components/DashboardSidebar";
import { generateMockData } from "@/utils/chartData";
import { DataExploration } from "./DataExploration";
import { PopulationQuery } from "./PopulationQuery";
import { PatternExplorer } from "./PatternExplorer";
import { DataExport } from "./DataExport";
import { Association } from "./Association";

import { TimeRange } from "@/components/FilterBar";
import { fetchAbstractionData, fetchRawData, QueryParams } from "@/api/temporal";
import { calculateDateRange } from "@/utils/dateUtils";
import { useToast } from "@/components/ui/use-toast";

interface ActiveChart extends MenuItem {
  // data: Array<{ date: string; value: number }>;
  externalData?: any[];
  conceptData?: any;
  isRaw?: boolean;
}

interface AssociationTab {
  id: string;
  name: string;
}

type TabValue = "exploration" | "population" | "pattern" | "export" | string;

const Index = () => {
  const [activeCharts, setActiveCharts] = useState<ActiveChart[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>("exploration");
  const [associationTabs, setAssociationTabs] = useState<AssociationTab[]>([]);
  const [associationCounter, setAssociationCounter] = useState(1);

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
        } else {
          // Fallback to abstract (Pattern/Context)
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

  const handleRemoveChart = (id: string) => {
    setActiveCharts((prev) => prev.filter((chart) => chart.id !== id));
  };

  const handleCloseAll = () => {
    setActiveCharts([]);
  };

  const handleCreateAssociation = () => {
    const newTab: AssociationTab = {
      id: `association-${associationCounter}`,
      name: `Association ${associationCounter}`,
    };
    setAssociationTabs((prev) => [...prev, newTab]);
    setActiveTab(newTab.id);
    setAssociationCounter((prev) => prev + 1);
  };

  const renderActiveScreen = () => {
    if (activeTab === "exploration") {
      return (
        <DataExploration
          activeCharts={activeCharts}
          onAddChart={handleItemClick} // This prop might be unused if sidebar handles clicks directly, check Usage
          onRemoveChart={handleRemoveChart}
          onCloseAll={handleCloseAll}
          onCreateAssociation={handleCreateAssociation}
          // New Props
          patientIds={patientIds}
          setPatientIds={setPatientIds}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          patientCount={patientCount}
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

    // Check if it's an association tab
    const associationTab = associationTabs.find(tab => tab.id === activeTab);
    if (associationTab) {
      return <Association name={associationTab.name} />;
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

            {/* Dynamic Association Tabs */}
            {associationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab.name}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Active Screen */}
          {renderActiveScreen()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
