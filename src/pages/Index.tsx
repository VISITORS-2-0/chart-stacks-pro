import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar, MenuItem } from "@/components/DashboardSidebar";
import { generateMockData } from "@/utils/chartData";
import { DataExploration } from "./DataExploration";
import { PopulationQuery } from "./PopulationQuery";
import { PatternExplorer } from "./PatternExplorer";
import { DataExport } from "./DataExport";
import { Association } from "./Association";

interface ActiveChart extends MenuItem {
  data: Array<{ date: string; value: number }>;
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

  const handleItemClick = (item: MenuItem) => {
    // Check if chart already exists
    const exists = activeCharts.some((chart) => chart.id === item.id);
    if (exists) return;

    // Generate new chart with mock data
    const newChart: ActiveChart = {
      ...item,
      data: generateMockData(),
    };

    setActiveCharts((prev) => [...prev, newChart]);
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
          onAddChart={handleItemClick}
          onRemoveChart={handleRemoveChart}
          onCloseAll={handleCloseAll}
          onCreateAssociation={handleCreateAssociation}
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
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === "exploration"
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
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === "population"
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
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === "pattern"
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
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === "export"
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
                className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
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
