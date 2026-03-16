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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-xl bg-card">
            <h3 className="text-lg font-semibold mb-2">Usage Example</h3>
            <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm">
{`import { ConceptKnowledgeExplorer } from "@/components/ConceptKnowledgeExplorer";

function App() {
  return (
    <ConceptKnowledgeExplorer 
      initialConceptName="Absolute_Contra_Indication_state" 
    />
  );
}`}
            </pre>
          </div>
          <div className="p-6 border rounded-xl bg-card">
            <h3 className="text-lg font-semibold mb-2">Key Features</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>3x3 Grid Layout (Desktop)</li>
              <li>Vertical Stack Layout (Mobile)</li>
              <li>Recursive exploration via re-centering</li>
              <li>Real-time data fetching with error handling</li>
              <li>Smooth fade-in animations</li>
              <li>Shadcn/UI components consistency</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorerDemo;
