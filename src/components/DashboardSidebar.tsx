import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

export type ChartType = "scatter" | "bar" | "line";

export interface MenuItem {
  id: string;
  title: string;
  parent?: string;
  chartType: ChartType;
}

interface DashboardSidebarProps {
  onItemClick: (item: MenuItem) => void;
}

const menuStructure = [
  {
    parent: "Raw",
    chartType: "scatter" as ChartType,
    children: [
      { id: "albumin", title: "Albumin" },
      { id: "glucose", title: "Glucose Level" },
      { id: "hemoglobin", title: "Hemoglobin" },
    ],
  },
  {
    parent: "Stage",
    chartType: "bar" as ChartType,
    children: [
      { id: "kidney", title: "Kidney Function Score" },
      { id: "liver", title: "Liver Health Index" },
    ],
  },
  {
    parent: "Pattern",
    chartType: "line" as ChartType,
    children: [
      { id: "recovery", title: "Recovery Trend" },
      { id: "inflammation", title: "Inflammation Markers" },
    ],
  },
];

export function DashboardSidebar({ onItemClick }: DashboardSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["Raw", "Stage", "Pattern"]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const filteredMenu = menuStructure
    .map((section) => ({
      ...section,
      children: section.children.filter((child) =>
        child.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((section) => section.children.length > 0);

  return (
    <Sidebar className="w-64 border-r border-primary/20 bg-primary text-primary-foreground">
      <SidebarContent className="bg-primary">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-sm font-semibold text-primary-foreground">
            Medical Data Dashboard
          </SidebarGroupLabel>
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
                          className={`h-4 w-4 transition-transform duration-200 ${
                            openSections.includes(section.parent) ? "rotate-90" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                      <SidebarMenu>
                        {section.children.map((child) => (
                          <SidebarMenuItem key={child.id}>
                            <SidebarMenuButton
                              onClick={() =>
                                onItemClick({
                                  id: child.id,
                                  title: child.title,
                                  parent: section.parent,
                                  chartType: section.chartType,
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
