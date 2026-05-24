import React from "react";
import { CircleHelp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConceptKnowledgeExplorer } from "./ConceptKnowledgeExplorer";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GraphContextModalProps {
  conceptName: string;
  className?: string;
  showLabel?: boolean;
}

export const GraphContextModal: React.FC<GraphContextModalProps> = ({
  conceptName,
  className,
  showLabel = false,
}) => {
  const triggerElement = showLabel ? (
    <button
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <CircleHelp className="h-3.5 w-3.5 shrink-0 text-primary/70 group-hover:text-white transition-colors" />
      <span>Knowledge Explorer</span>
    </button>
  ) : (
    <button
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <CircleHelp className="h-4 w-4 shrink-0" />
      <span className="sr-only">Knowledge Explorer for {conceptName}</span>
    </button>
  );

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            {triggerElement}
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Explore knowledge and relations for {conceptName}</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0">
        <DialogDescription className="sr-only">
          Explore knowledge and relations for {conceptName}
        </DialogDescription>
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Knowledge Explorer: {conceptName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ConceptKnowledgeExplorer 
            initialConceptName={conceptName} 
            className="h-full border-none shadow-none p-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GraphContextModal;
