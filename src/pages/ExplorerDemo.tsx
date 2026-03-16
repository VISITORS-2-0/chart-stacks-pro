import React from "react";
import { ConceptKnowledgeExplorer } from "../components/ConceptKnowledgeExplorer";

const ExplorerDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Concept Knowledge Explorer Demo</h1>
          <p className="text-muted-foreground">
            A visual explorer for concept relationships. Click on any related concept to re-center.
          </p>
        </div>
        
        <div className="border rounded-xl bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <ConceptKnowledgeExplorer initialConceptName="Absolute_Contra_Indication_state" />
        </div>
      </div>
    </div>
  );
};

export default ExplorerDemo;
