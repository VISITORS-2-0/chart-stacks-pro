import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useGeneratedDataMode } from '@/contexts/GeneratedDataContext';
import { Database } from 'lucide-react';

export const GlobalToggle = ({ labelClassName }: { labelClassName?: string }) => {
  const { useGeneratedData, setUseGeneratedData } = useGeneratedDataMode();

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Switch 
        id="generated-data-mode" 
        checked={useGeneratedData} 
        onCheckedChange={setUseGeneratedData} 
        className="data-[state=checked]:bg-primary h-4 w-8"
      />
      <Label 
        htmlFor="generated-data-mode" 
        className={`text-sm font-semibold cursor-pointer flex items-center gap-1.5 transition-colors whitespace-nowrap ${labelClassName || (useGeneratedData ? "text-foreground font-bold" : "text-muted-foreground")}`}
      >
        <Database className="h-3.5 w-3.5" />
        Use Generated Data
      </Label>
    </div>
  );
};
