import { useState, useMemo } from 'react';
import { SinglePatientAbstractionPanel, AbstractionInterval, ValueLevel, ReferenceEvent } from "@/components/SinglePatientAbstractionPanel";

export default function DemoAbstraction() {
    // 1. Define Levels
    const mockValueLevels: ValueLevel[] = [
        { label: "Very Low", order: 0, color: "#3b82f6" }, 
        { label: "Low", order: 1, color: "#60a5fa" },      
        { label: "Normal", order: 2, color: "#22c55e" },   
        { label: "High", order: 3, color: "#f59e0b" },     
        { label: "Very High", order: 4, color: "#ef4444" } 
    ];

    // 2. Data Generator
    const generateMoreData = () => {
        const intervals: AbstractionInterval[] = [];
        const base = new Date("1990-01-01").getTime();
        const oneDay = 86400000;
        
        let cursor = base;
        const totalDurationDays = 365 * 10; // 10 Years
        const endLimit = base + totalDurationDays * oneDay;

        let idCounter = 0;

        while (cursor < endLimit) {
            // Random duration 5 to 30 days
            const duration = Math.floor(Math.random() * 25 + 5) * oneDay;
            // Random gap 0 to 5 days
            const gap = Math.floor(Math.random() * 5) * oneDay;
            
            // Random value
            const level = mockValueLevels[Math.floor(Math.random() * mockValueLevels.length)];
            
            intervals.push({
                start: new Date(cursor),
                end: new Date(cursor + duration),
                valueLabel: level.label,
                valueOrderIndex: level.order,
                contextId: `generated_${idCounter++}`
            });
            
            cursor += duration + gap;
        }
        return intervals;
    };

    // Use Memo so it doesn't regenerate on every render
    const mockIntervals = useMemo(() => generateMoreData(), []);

    // Mock an event (Picking a date from the data, roughly middle of 1995)
    const mockEvents: ReferenceEvent[] = [
        { id: "evt1", type: "BMT", time: new Date("1995-01-01T00:00:00+02:00"), label: "BMT Event" }
    ];

    return (
        <div className="p-8 space-y-8 min-h-screen bg-background">
            <h1 className="text-2xl font-bold">Single Patient Abstraction Panel Demo</h1>
            <p className="text-muted-foreground">Generated {mockIntervals.length} intervals over 10 years (1990-2000). Click an interval to zoom.</p>
            
            <div className="max-w-4xl mx-auto">
                <SinglePatientAbstractionPanel
                    patientId="PT-GENERATED"
                    conceptId="WBC_STATE_BMT"
                    conceptDisplayName="WBC State BMT"
                    intervals={mockIntervals}
                    valueLevels={mockValueLevels}
                    referenceEvents={mockEvents}
                    onIntervalClick={(i) => console.log("Clicked", i)}
                    onOpenConcept={(id) => console.log("Open Concept", id)}
                    initialTimelineMode="absolute"
                />
            </div>
        </div>
    );
}
