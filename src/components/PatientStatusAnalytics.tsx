import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TemporalRow } from '../types/temporal'; // Import the project type

// Helper functions to replace lodash
const groupBy = <T,>(array: T[], keyCallback: (item: T) => string) => {
    return array.reduce((acc, item) => {
        const key = keyCallback(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, T[]>);
};

const countBy = <T,>(array: T[], keyCallback: (item: T) => string) => {
    return array.reduce((acc, item) => {
        const key = keyCallback(item);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
};

const maxBy = <T,>(array: T[], valueCallback: (item: T) => number): T | undefined => {
    if (array.length === 0) return undefined;
    let maxItem = array[0];
    let maxValue = valueCallback(maxItem);

    for (let i = 1; i < array.length; i++) {
        const value = valueCallback(array[i]);
        if (value > maxValue) {
            maxItem = array[i];
            maxValue = value;
        }
    }
    return maxItem;
};

interface PatientStatusAnalyticsProps {
    data: TemporalRow[];
}

const CATEGORIES = ['High', 'Normal', 'Moderately_low'];

const processData = (rawData: TemporalRow[]) => {
    // Step A: Group data by PatientID and Month
    const patientMonthlyGroups = groupBy(rawData, (item) => {
        const month = item.StartTime.substring(0, 7); // 'YYYY-MM'
        return `${item.PatientID}_${month}`;
    });

    // Step B: For each Patient/Month bucket, find the most frequent Value (the Mode)
    const patientRepValues = Object.entries(patientMonthlyGroups).map(([key, logs]) => {
        const [_, month] = key.split('_');

        // Coerce Value to string to handle categorical values safely
        const counts = countBy(logs, (item) => String(item.Value));
        const keys = Object.keys(counts);

        // Find key with max count
        const representativeValue = maxBy(keys, (v) => counts[v]);
        return { month, representativeValue };
    });

    // Step C: Aggregate these modes to get total counts per month
    const chartDataMap = groupBy(patientRepValues, (item) => item.month);

    return Object.entries(chartDataMap).map(([month, records]) => {
        const counts = countBy(records, (item) => item.representativeValue || 'Unknown');
        return {
            month,
            Normal: counts['Normal'] || 0,
            Moderately_low: counts['Moderately_low'] || 0,
            High: counts['High'] || 0,
        };
    }).sort((a, b) => a.month.localeCompare(b.month)); // Sort by month
};

export function PatientStatusAnalytics({ data }: PatientStatusAnalyticsProps) {
    const chartData = useMemo(() => processData(data), [data]);

    // Define specific colors for each category
    const categoryColors: Record<string, string> = {
        'High': '#ef4444', // red-500
        'Normal': '#22c55e', // green-500
        'Moderately_low': '#f59e0b', // amber-500
    };

    return (
        <div className="w-full h-full flex flex-col space-y-4 p-4">
            {CATEGORIES.map((category, index) => {
                const isLast = index === CATEGORIES.length - 1;

                return (
                    <div key={category} className="flex-1 min-h-0 relative">
                        <h3 className="text-sm font-medium mb-1 text-center" style={{ color: categoryColors[category] }}>
                            {category.replace('_', ' ')}
                        </h3>
                        <div className="w-full h-[calc(100%-1.5rem)]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    syncId="patientStatus"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    {/* X-Axis only visible on the bottom-most chart */}
                                    <XAxis
                                        dataKey="month"
                                        hide={!isLast}
                                        tick={{ fontSize: 12 }}
                                        interval={0}
                                        height={30}
                                    />
                                    <YAxis allowDecimals={false} fontSize={12} />
                                    <Tooltip
                                        labelFormatter={(label) => `Month: ${label}`}
                                    />
                                    <Bar
                                        dataKey={category}
                                        fill={categoryColors[category] || "#8884d8"}
                                        name="Total Patients"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
