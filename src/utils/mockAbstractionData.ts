import { AbstractionInterval, ValueLevel } from "@/components/SinglePatientAbstractionPanel";

export const MOCK_VALUE_LEVELS: ValueLevel[] = [
    { label: "Very Low", order: 0, color: "#3b82f6" }, 
    { label: "Low", order: 1, color: "#60a5fa" },      
    { label: "Normal", order: 2, color: "#22c55e" },   
    { label: "High", order: 3, color: "#f59e0b" },     
    { label: "Very High", order: 4, color: "#ef4444" } 
];

export const generateMockIntervals = (): AbstractionInterval[] => {
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
        const level = MOCK_VALUE_LEVELS[Math.floor(Math.random() * MOCK_VALUE_LEVELS.length)];
        
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
