import React, { useState, useEffect } from "react";
import { GitBranch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { fetchConceptKnowledge, MappingAbstractions } from "../api/temporal";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface MappingAbstractionsModalProps {
  conceptName: string;
  preloadedData?: MappingAbstractions;
  className?: string;
  triggerButton?: React.ReactNode;
  conceptType?: string;
  showLabel?: boolean;
}

export const MappingAbstractionsModal: React.FC<MappingAbstractionsModalProps> = ({
  conceptName,
  preloadedData,
  className,
  triggerButton,
  conceptType,
  showLabel = false,
}) => {
  const [data, setData] = useState<MappingAbstractions | undefined>(preloadedData);
  const [loading, setLoading] = useState<boolean>(!preloadedData);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isDisabled = !!conceptType && conceptType.toLowerCase() !== "state";

  useEffect(() => {
    if (open && !preloadedData && !data && !isDisabled) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await fetchConceptKnowledge(conceptName);
          setData(result.mapping_abstractions);
        } catch (err: any) {
          setError(err.message || "Failed to load mapping abstractions");
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [open, conceptName, preloadedData, data, isDisabled]);

  useEffect(() => {
    if (preloadedData !== undefined) {
      setData(preloadedData);
      setLoading(false);
    }
  }, [preloadedData]);

  // Sort categories by order
  const sortedMappings = data?.category_mappings
    ? [...data.category_mappings].sort((a, b) => a.order - b.order)
    : [];

  const triggerElement = triggerButton ? (
    triggerButton
  ) : showLabel ? (
    <button
      disabled={isDisabled}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm",
        isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary/70" />
      <span>Mapping Function</span>
    </button>
  ) : (
    <button
      disabled={isDisabled}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      <GitBranch className="h-4 w-4 shrink-0" />
      <span className="sr-only">Mapping Abstractions for {conceptName}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {isDisabled ? (
              <span className="inline-block cursor-not-allowed" tabIndex={0}>
                {triggerElement}
              </span>
            ) : (
              <DialogTrigger asChild>{triggerElement}</DialogTrigger>
            )}
          </TooltipTrigger>
          <TooltipContent>
            {isDisabled ? (
              <p>Mapping Abstractions disabled: Concept is not a state</p>
            ) : (
              <p>View Mapping Abstractions for {conceptName}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogDescription className="sr-only">
          View Mapping Abstractions for {conceptName}
        </DialogDescription>
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Mapping Abstractions: {conceptName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-10 text-destructive">
              <AlertCircle className="h-10 w-10 mb-2" />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (!data || !data.category_mappings || data.category_mappings.length === 0) && (
            <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center h-full">
              <GitBranch className="h-12 w-12 mb-4 text-muted/50" />
              <p>No mapping abstractions found for this concept.</p>
            </div>
          )}

          {!loading && !error && sortedMappings.length > 0 && (
            <div className="space-y-4">
              {sortedMappings.map((mapping, index) => (
                <Card key={index} className="overflow-hidden border-border/50 shadow-sm">
                  <div className="bg-primary/5 border-b px-4 py-3 flex items-center">
                    <Badge className="px-3 py-1 text-sm bg-primary text-primary-foreground">
                      {mapping.category}
                    </Badge>
                  </div>
                  
                  <CardContent className="p-4 bg-background">
                    <div className="space-y-3">
                      {mapping.conditions.map((condition, cIndex) => (
                        <div key={cIndex} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-3 rounded-md bg-muted/30 border border-muted/50">
                          <div className="flex-1">
                            <div className="text-sm font-medium flex items-center gap-2">
                              <span className="text-muted-foreground">Source Concept:</span>
                              <span className="text-foreground">{condition.abstracted_from_concept}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Condition:</span>
                            <Badge variant="secondary" className="font-mono text-sm px-3 py-1 bg-amber-100/50 text-amber-900 border-amber-200">
                              {condition.values_accepted}
                            </Badge>
                          </div>
                          
                          {/* Logcial operator visualization if this is not the last condition */}
                          {cIndex < mapping.conditions.length - 1 && mapping.logical_operation && (
                            <div className="hidden md:flex absolute right-4 translate-y-[2.5rem] z-10 w-8 h-8 rounded-full bg-slate-200 items-center justify-center border-2 border-white text-xs font-bold uppercase shadow-sm">
                              {mapping.logical_operation}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Mobile logical operator visualization */}
                      {mapping.conditions.length > 1 && mapping.logical_operation && (
                        <div className="md:hidden flex justify-center -my-1 relative z-10">
                          <Badge variant="outline" className="bg-slate-100 uppercase text-[10px] tracking-wider px-2 shadow-sm font-bold border-slate-300">
                            {mapping.logical_operation}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MappingAbstractionsModal;
