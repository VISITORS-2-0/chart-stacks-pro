import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useGeneratedDataMode } from '@/contexts/GeneratedDataContext';

export const GlobalToggle = () => {
  const { useGeneratedData, setUseGeneratedData } = useGeneratedDataMode();

  return (
    <div className="flex items-center space-x-2">
      <Switch 
        id="generated-data-mode" 
        checked={useGeneratedData} 
        onCheckedChange={setUseGeneratedData} 
      />
      <Label htmlFor="generated-data-mode" className="text-sm font-medium whitespace-nowrap text-foreground">
        Use Generated Data
      </Label>
    </div>
  );
};
