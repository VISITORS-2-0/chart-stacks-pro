import { useState, useMemo } from "react";
import { Search, ChevronsLeft, ChevronsRight, Loader2, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { useTakMenu, TakItem } from "@/services/takApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ChartType = "scatter" | "bar" | "line";

export interface MenuItem {
  id: string;
  title: string;
  parent?: string;
  chartType: ChartType;
  originalItem: TakItem;
}

interface DashboardSidebarProps {
  onItemClick: (item: MenuItem, overridePatientIds?: string[]) => Promise<{success: boolean, errorMessage?: string}>;
  patientIds: string[];
  onCloseAll: () => void;
}

export function DashboardSidebar({ onItemClick, patientIds, onCloseAll }: DashboardSidebarProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>([]);
  const { open, setOpen } = useSidebar();
  const { data, loading, error } = useTakMenu();
  const [isTesting, setIsTesting] = useState(false);
  const [showTestOptions, setShowTestOptions] = useState(false);
  const [testResults, setTestResults] = useState<{
    name: string, count: number, status: 'success' | 'failed', errorMessage?: string, outputType?: string, durationType?: string, takType?: string
  }[] | null>(null);

  const downloadCsv = () => {
    if (!testResults) return;
    
    const headers = ["Concept Name", "Concept Type", "Patient Count", "Status", "Output Type", "Duration Type", "Error Message"];
    const rows = testResults.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${(r.takType || "").replace(/"/g, '""')}"`,
      r.count,
      r.status,
      `"${r.outputType || ""}"`,
      `"${r.durationType || ""}"`,
      `"${(r.errorMessage || "").replace(/"/g, '""')}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `test_results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const performTestLoop = async (
    count: number,
    resultsArray: {name: string, count: number, status: 'success' | 'failed', errorMessage?: string, outputType?: string, durationType?: string, takType?: string}[],
    testMode: 'full' | 'sample' | 'small_sample'
  ) => {
    const testIds = patientIds.length >= count 
      ? patientIds.slice(0, count) 
      : Array.from({ length: count }, (_, i) => (i + 1).toString());

    const allItems = menuStructure.flatMap(section => {
      let childrenToTest = section.children;
      if (testMode === 'sample') childrenToTest = section.children.slice(0, 5);
      if (testMode === 'small_sample') childrenToTest = section.children.slice(0, 1);
      
      return childrenToTest.map(child => ({ child, parentSection: section.parent }));
    });

    for (const { child, parentSection } of allItems) {
      const outputType = child.originalItem.output_type;
      const durationType = child.originalItem.duration_type;
      try {
        const result = await handleItemSelect(child, parentSection, testIds);
        if (result.success) {
          resultsArray.push({ name: child.title, count, status: 'success', outputType, durationType, takType: parentSection });
          await new Promise(r => setTimeout(r, 600)); // allow graph to visually render
          onCloseAll();
        } else {
          resultsArray.push({ name: child.title, count, status: 'failed', errorMessage: result.errorMessage, outputType, durationType, takType: parentSection });
        }
      } catch (err) {
        resultsArray.push({ name: child.title, count, status: 'failed', errorMessage: String(err), outputType, durationType, takType: parentSection });
      }
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const runTests = async (testMode: 'full' | 'sample' | 'small_sample') => {
    setIsTesting(true);
    setTestResults(null);
    const results: {name: string, count: number, status: 'success' | 'failed', errorMessage?: string, outputType?: string, durationType?: string, takType?: string}[] = [];

    await performTestLoop(1, results, testMode);
    await performTestLoop(5, results, testMode);

    setTestResults(results);
    setIsTesting(false);
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const menuStructure = useMemo(() => {
    if (!data) return [];

    const grouped = data.reduce<Record<string, TakItem[]>>((acc, item) => {
        const type = item.concept_type || "Unknown";
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
    }, {});

    return Object.entries(grouped).map(([conceptType, items]) => ({
        parent: conceptType,
        chartType: "scatter" as ChartType, // A placeholder, actual chart is determined dynamically on click
        children: items.map(item => ({
            id: item.id || item.name,
            title: item.name,
            originalItem: item
        }))
    }));
  }, [data]);

  const handleItemSelect = async (
    child: { id: string; title: string; originalItem: TakItem },
    parentSection: string,
    overridePatientIds?: string[]
  ): Promise<{success: boolean, errorMessage?: string}> => {
    const { output_type, duration_type } = child.originalItem;
    
    // 1. Under Development Checks
    if (
      (output_type === "categorial" && duration_type === "point") ||
      (output_type === "range" && duration_type === "interval")
    ) {
      toast({
        title: "Under Development",
        description: `This chart combination (${output_type} + ${duration_type}) is under development.`,
        variant: "default",
      });
      return { success: false, errorMessage: `Under Development (${output_type} + ${duration_type})` };
    }

    // 2. Resolve Chart Type
    let chartType: ChartType = "scatter"; // Default
    const count = overridePatientIds ? overridePatientIds.length : patientIds.length;
    if (output_type === "categorial" && duration_type === "interval") {
      chartType = count > 1 ? "line" : "bar";
    } else if (output_type === "range" && duration_type === "point") {
      chartType = "scatter";
    }

    return await onItemClick({
      id: child.id,
      title: child.title,
      parent: parentSection,
      chartType,
      originalItem: child.originalItem,
    }, overridePatientIds);
  };

  const filteredMenu = menuStructure
    .map((section) => ({
      ...section,
      children: section.children.filter((child) =>
        child.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((section) => section.children.length > 0);

  if (loading) {
    return (
      <Sidebar className="w-64 border-r border-primary/20 bg-primary text-primary-foreground">
        <SidebarContent className="bg-primary flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-foreground/60" />
        </SidebarContent>
      </Sidebar>
    );
  }

  if (error) {
    return (
      <Sidebar className="w-64 border-r border-primary/20 bg-primary text-primary-foreground">
        <SidebarContent className="bg-primary p-4">
          <div className="text-red-400">Error loading menu: {error}</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <>
      {isTesting && (
        <div className="fixed inset-0 z-[100] bg-background/80 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center border">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-bold">Running Tests...</h2>
            <p className="text-muted-foreground mt-2">Please wait until all concepts are tested.</p>
          </div>
        </div>
      )}
      <Dialog open={testResults !== null && !isTesting} onOpenChange={(open) => { if (!open) setTestResults(null); }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Results</DialogTitle>
          </DialogHeader>
          
          {testResults && (
            <div className="mb-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex gap-4">
                  <span className="text-green-500 font-bold">
                    Passed: {testResults.filter(r => r.status === 'success').length}
                  </span>
                  <span className="text-red-500 font-bold">
                    Failed: {testResults.filter(r => r.status === 'failed').length}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadCsv}>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>
              
              <div className="mt-4 space-y-2">
                {testResults.filter(r => r.status === 'failed').map((res, i) => (
                  <div key={i} className="flex flex-col p-3 rounded border border-red-200 bg-red-50/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold">{res.name} (Pts: {res.count})</span>
                      <span className="font-bold text-red-500">FAILED</span>
                    </div>
                    <span className="text-xs text-muted-foreground block mb-1">
                      Type: {res.takType || 'N/A'} | Output: {res.outputType || 'N/A'} | Duration: {res.durationType || 'N/A'}
                    </span>
                    {res.errorMessage && (
                      <span className="text-sm text-red-600 break-all">
                        {res.errorMessage}
                      </span>
                    )}
                  </div>
                ))}
                {testResults.filter(r => r.status === 'failed').length === 0 && (
                  <div className="text-center p-4 text-green-600 font-semibold">
                    All tests passed!
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setTestResults(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Sidebar className="w-64 border-r border-primary/20 bg-primary text-primary-foreground">
        <SidebarContent className="bg-primary">
        <SidebarGroup>
          <div className="px-4 py-3 border-b border-primary-foreground/10 flex justify-between items-center">
            <SidebarGroupLabel className="text-xl font-bold text-primary-foreground tracking-wider p-0">
              VISITORS
            </SidebarGroupLabel>
            {import.meta.env.VITE_APP_ENV === 'test' && (
              <Button size="sm" variant="secondary" onClick={() => setShowTestOptions(true)} disabled={isTesting}>
                Run Tests
              </Button>
            )}
          </div>
          <SidebarGroupContent className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-primary-foreground/60" />
              <Input
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenu.map((section) => (
                <Collapsible
                  key={section.parent}
                  open={openSections.includes(section.parent)}
                  onOpenChange={() => toggleSection(section.parent)}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between font-medium text-primary-foreground hover:bg-primary-foreground/10">
                        <span>{section.parent}</span>
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200 ${openSections.includes(section.parent) ? "rotate-90" : ""
                            }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 max-h-[300px] overflow-y-auto pr-2">
                      <SidebarMenu>
                        {section.children.map((child, index) => (
                          <SidebarMenuItem key={`${section.parent}-${child.id}-${index}`}>
                            <SidebarMenuButton
                                onClick={() => handleItemSelect(child, section.parent)}
                              className="text-primary-foreground hover:bg-primary-foreground/10"
                            >
                              {child.title}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    
    <Dialog open={showTestOptions} onOpenChange={setShowTestOptions}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Test Mode</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <Button onClick={() => { setShowTestOptions(false); runTests('full'); }}>
            Full Test (All Concepts)
          </Button>
          <Button variant="secondary" onClick={() => { setShowTestOptions(false); runTests('sample'); }}>
            Sample Test (First 5 per type)
          </Button>
          <Button variant="outline" onClick={() => { setShowTestOptions(false); runTests('small_sample'); }}>
            Small Sample Test (First 1 per type)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
