import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Info,
  RefreshCcw,
  AlertCircle
} from "lucide-react";
import { fetchConceptKnowledge, ConceptKnowledgeResponse } from "../api/temporal";
import { cn } from "@/lib/utils";
import { MappingAbstractionsModal } from "./MappingAbstractionsModal";
import "./ConceptKnowledgeExplorer.css";

interface ConceptKnowledgeExplorerProps {
  initialConceptName?: string;
  className?: string;
}

export const ConceptKnowledgeExplorer: React.FC<ConceptKnowledgeExplorerProps> = ({
  initialConceptName = "Absolute_Contra_Indication_state",
  className
}) => {
  const [currentConcept, setCurrentConcept] = useState<string>(initialConceptName);
  const [data, setData] = useState<ConceptKnowledgeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (conceptName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchConceptKnowledge(conceptName);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load concept knowledge");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentConcept);
  }, [currentConcept, loadData]);

  const handleConceptClick = (conceptName: string) => {
    if (conceptName && conceptName !== currentConcept) {
      setCurrentConcept(conceptName);
    }
  };

  const renderList = (title: string, items: string[] | undefined, emptyMsg: string, icon: React.ReactNode) => {
    return (
      <div className="explorer-card">
        <div className="explorer-card-header flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2">
            {icon}
            {title}
          </span>
          {items && items.length > 0 && (
            <Badge variant="secondary" className="px-1.5 h-5 text-[10px]">
              {items.length}
            </Badge>
          )}
        </div>
        <div className="explorer-card-content">
          <ScrollArea className="flex-1 pr-3">
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items && items.length > 0 ? (
              <div className="concept-list p-1">
                {items.map((item) => (
                  <Button
                    key={item}
                    variant="ghost"
                    size="sm"
                    className="concept-pill justify-start text-left w-full"
                    onClick={() => handleConceptClick(item)}
                    title={`Explore ${item}`}
                  >
                    <span className="truncate">{item}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>{emptyMsg}</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div >
    );
  };

  const renderMetadata = (data: any) => {
    const xml = data?.xml;
    if (!xml) return null;

    // Helper to get formatted value with granularity
    const formatValue = (obj: any) => {
      if (!obj) return undefined;
      if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
      const val = obj["@value"];
      const gran = obj["@granularity"];
      if (val !== undefined && gran !== undefined) return `${val} ${gran}`;
      if (val !== undefined) return String(val);
      return undefined;
    };

    // Find allowed values container (can be ordinal, numeric, or trend)
    const allowedValues =
      xml["ordinal-allowed-values"] ||
      xml["numeric-allowed-values"] ||
      xml["trend-values"] ||
      xml["gradient-trend-allowed-values"];

    // Robust search for persistence components
    const persistence = xml.persistence || allowedValues?.persistence;
    const localP = xml["local-persistence"] || persistence?.["local-persistence"];
    const globalP = xml["global-persistence"] || persistence?.["global-persistence"];

    const fields = [
      {
        label: "Local Persistence",
        value: localP?.["@granularity"] || (localP ? "" : undefined)
      },
      {
        label: "Good Before",
        value: formatValue(localP?.["good-before"] || localP?.good_before),
        indent: true
      },
      {
        label: "Good After",
        value: formatValue(localP?.["good-after"] || localP?.good_after),
        indent: true
      },
      {
        label: "Global Persistence",
        value: globalP?.["@granularity"] || formatValue(globalP)
      },
    ];

    const type = data["@concept-type"] || data.concept_type;
    if (type === "state") {
      const mf = xml["mapping-function"];
      const criteria = mf?.["@rank-selection-criteria"];
      fields.push({ label: "Mapping Function", value: criteria ? `Rank: ${criteria}` : undefined });
    } else if (type === "trend") {
      const sigVar = xml["@significant-variation"] || xml["significant-variation"] || xml["significant_variation"];
      const timeSteady = xml["time-steady"] || xml["time_steady"];
      fields.push({ label: "Significant Variation", value: formatValue(sigVar) });
      fields.push({ label: "Time Steady", value: formatValue(timeSteady) });
    }

    const validFields = fields.filter(f => f.value !== undefined && f.value !== null);

    if (validFields.length === 0) return null;

    return (
      <div className="metadata-container">
        {validFields.map((field: any, idx) => (
          <div key={idx} className={cn("metadata-item", field.indent && "metadata-indent")}>
            <span className="metadata-label">{field.label}:</span>
            <span className="metadata-value">{String(field.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center space-y-4", className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Error Loading Data</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => loadData(currentConcept)} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const contextData = data?.context;
  const contextItems = Array.isArray(contextData)
    ? contextData
    : contextData && typeof contextData === 'object'
      ? Object.keys(contextData).map(key => `${key}: ${contextData[key]}`)
      : contextData ? [String(contextData)] : [];

  return (
    <div className={cn("explorer-container", className)}>
      <div className="explorer-grid">
        <div className="explorer-cell explorer-center">
          <Card className="explorer-card center-card">
            <div className="explorer-card-header flex items-center justify-between w-full">
              <span className="text-sm font-bold flex items-center gap-2 text-primary">
                <Info className="h-4 w-4" />
                Current Concept
              </span>
              <MappingAbstractionsModal 
                 conceptName={data?.["@name"] || currentConcept}
                 preloadedData={data?.mapping_abstractions}
                 conceptType={data?.["@concept-type"]}
              />
            </div>
            <div className="explorer-card-content p-0">
              <ScrollArea className="h-full">
                <div className="flex flex-col items-center p-4 min-h-full">
                  {loading ? (
                    <div className="w-full space-y-3">
                      <Skeleton className="h-6 w-3/4 mx-auto" />
                      <Skeleton className="h-4 w-1/2 mx-auto" />
                      <div className="flex gap-1 justify-center">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-center space-y-2 w-full">
                        <h2 className="text-xl font-bold tracking-tight text-foreground break-all">
                          {data?.["@name"]}
                        </h2>
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Badge variant="outline" className="capitalize">
                            {data?.["@concept-type"]}
                          </Badge>
                          {(() => {
                            const xml = data?.xml;
                            const allowedValues =
                              xml?.["ordinal-allowed-values"] ||
                              xml?.["numeric-allowed-values"] ||
                              xml?.["trend-values"] ||
                              xml?.["gradient-trend-allowed-values"];

                            // Prioritize explicit min/max from the response
                            const minVal = data?.min ||
                              data?.["min-value"] ||
                              allowedValues?.min ||
                              allowedValues?.["min-value"] ||
                              allowedValues?.["@min-value"] ||
                              xml?.min ||
                              xml?.["min-value"] ||
                              xml?.["@min-value"];

                            const maxVal = data?.max ||
                              data?.["max-value"] ||
                              allowedValues?.max ||
                              allowedValues?.["max-value"] ||
                              allowedValues?.["@max-value"] ||
                              xml?.max ||
                              xml?.["max-value"] ||
                              xml?.["@max-value"];

                            if (minVal !== undefined && maxVal !== undefined) {
                              return (
                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                  {minVal} - {maxVal}
                                </Badge>
                              );
                            }

                            if (!data?.values || data.values.length === 0) return null;
                            const numbers = data.values.map(v => parseFloat(v));
                            const allNumbers = numbers.length > 0 && numbers.every(n => !isNaN(n));

                            if (allNumbers) {
                              if (numbers.length > 1) {
                                const min = Math.min(...numbers);
                                const max = Math.max(...numbers);
                                return (
                                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                    {min} - {max}
                                  </Badge>
                                );
                              } else {
                                return (
                                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                    {data.values[0]}
                                  </Badge>
                                );
                              }
                            }

                            return data.values.map(v => (
                              <Badge key={v} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                {v}
                              </Badge>
                            ));
                          })()}
                        </div>
                      </div>
                      {data && renderMetadata(data)}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </Card>

          {/* Connectors (Desktop only) */}
          <div className="connector connector-vertical connector-top" />
          <div className="connector connector-vertical connector-bottom" />
          <div className="connector connector-horizontal connector-left" />
          <div className="connector connector-horizontal connector-right" />
        </div>

        {/* Top: Abstracted Into */}
        <div className="explorer-cell explorer-top">
          {renderList(
            "Abstracted Into",
            data?.derived_into,
            "No concepts derived into this",
            <ArrowUp className="h-4 w-4 text-orange-500" />
          )}
        </div>

        {/* Bottom: Abstracted From */}
        <div className="explorer-cell explorer-bottom">
          {renderList(
            "Abstracted From",
            data?.["derived_from"],
            "No concepts derived from this",
            <ArrowDown className="h-4 w-4 text-green-500" />
          )}
        </div>

        {/* Left: Siblings */}
        <div className="explorer-cell explorer-left">
          {renderList(
            "Siblings",
            data?.siblings,
            "No siblings found",
            <ArrowLeft className="h-4 w-4 text-blue-500" />
          )}
        </div>

        {/* Right: Context */}
        <div className="explorer-cell explorer-right">
          {renderList(
            "Context",
            contextItems.length > 0 ? (contextItems as string[]) : undefined,
            "No context found",
            <ArrowRight className="h-4 w-4 text-purple-500" />
          )}
        </div>

      </div>
    </div>
  );
};

export default ConceptKnowledgeExplorer;
