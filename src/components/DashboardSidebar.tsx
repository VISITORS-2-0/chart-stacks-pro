import { useState, useMemo } from "react";
import { Search, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
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
}

export function DashboardSidebar({ onItemClick }: DashboardSidebarProps) {
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

    const { TakEntity } = data;
    const sections = [];

    // Raw
    if (TakEntity.Concept?.RawConcept?.length > 0) {
      sections.push({
        parent: "Raw",
        chartType: "scatter" as ChartType,
        children: TakEntity.Concept.RawConcept.map(item => ({
          id: item.id,
          title: item.name,
          originalItem: item
        }))
      });
    }

    // Context
    if (TakEntity.Context?.length > 0) {
      sections.push({
        parent: "Context",
        chartType: "line" as ChartType,
        children: TakEntity.Context.map(item => ({
          id: item.id,
          title: item.name,
          originalItem: item
        }))
      });
    }

    // State
    const stateItems = TakEntity.Concept?.AbstractConcept?.filter(item => item.type === 'state') || [];
    if (stateItems.length > 0) {
      sections.push({
        parent: "State",
        chartType: "bar" as ChartType,
        children: stateItems.map(item => ({
          id: item.id,
          title: item.name,
          originalItem: item
        }))
      });
    }

    // Pattern
    const patternItems = TakEntity.Concept?.AbstractConcept?.filter(item => item.type === 'pattern') || [];
    if (patternItems.length > 0) {
      sections.push({
        parent: "Pattern",
        chartType: "line" as ChartType,
        children: patternItems.map(item => ({
          id: item.id,
          title: item.name,
          originalItem: item
        }))
      });
    }

    // Event
    if (TakEntity.Event?.length > 0) {
      sections.push({
        parent: "Event",
        chartType: "scatter" as ChartType,
        children: TakEntity.Event.map(item => ({
          id: item.id,
          title: item.name,
          originalItem: item
        }))
      });
    }

    return sections;
  }, [data]);

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
                    <CollapsibleContent className="pl-4">
                      <SidebarMenu>
                        {section.children.map((child, index) => (
                          <SidebarMenuItem key={`${section.parent}-${child.id}-${index}`}>
                            <SidebarMenuButton
                              onClick={() =>
                                onItemClick({
                                  id: child.id,
                                  title: child.title,
                                  parent: section.parent,
                                  chartType: section.chartType,
                                  originalItem: child.originalItem,
                                })
                              }
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
