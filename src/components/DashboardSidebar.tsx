import { useState, useMemo } from "react";
import { Search, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
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

export type ChartType = "scatter" | "bar" | "line";

export interface MenuItem {
  id: string;
  title: string;
  parent?: string;
  chartType: ChartType;
  originalItem: TakItem;
}

interface DashboardSidebarProps {
  onItemClick: (item: MenuItem) => void;
  patientCount: number;
}

export function DashboardSidebar({ onItemClick, patientCount }: DashboardSidebarProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>([]);
  const { open, setOpen } = useSidebar();
  const { data, loading, error } = useTakMenu();

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

  const handleItemSelect = (
    child: { id: string; title: string; originalItem: TakItem },
    parentSection: string
  ) => {
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
      return;
    }

    // 2. Resolve Chart Type
    let chartType: ChartType = "scatter"; // Default
    if (output_type === "categorial" && duration_type === "interval") {
      chartType = patientCount > 1 ? "line" : "bar";
    } else if (output_type === "range" && duration_type === "point") {
      chartType = "scatter";
    }

    onItemClick({
      id: child.id,
      title: child.title,
      parent: parentSection,
      chartType,
      originalItem: child.originalItem,
    });
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
    <Sidebar className="w-64 border-r border-primary/20 bg-primary text-primary-foreground">
      <SidebarContent className="bg-primary">
        <SidebarGroup>
          <div className="px-4 py-3 border-b border-primary-foreground/10">
            <SidebarGroupLabel className="text-xl font-bold text-primary-foreground tracking-wider">
              VISITORS
            </SidebarGroupLabel>
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
  );
}
