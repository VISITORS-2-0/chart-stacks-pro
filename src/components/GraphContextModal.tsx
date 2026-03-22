import React from "react";
import { CircleHelp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConceptKnowledgeExplorer } from "./ConceptKnowledgeExplorer";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GraphContextModalProps {
  conceptName: string;
  className?: string;
}

export const GraphContextModal: React.FC<GraphContextModalProps> = ({
  conceptName,
  className,
}) => {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
              )}
              // title={`View info for ${conceptName}`} // Removed as tooltip provides this
            >
              <CircleHelp className="h-4 w-4 shrink-0" />
              <span className="sr-only">Help for {conceptName}</span>
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Explore context and relations for {conceptName}</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Context Explorer: {conceptName}
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
