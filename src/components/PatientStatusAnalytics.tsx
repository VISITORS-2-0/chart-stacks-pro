import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TemporalRow, PatientStatusProcessedRow } from '../types/temporal';

// NOTE: Since the data is now coming pre-processed (dummy data) from the API,
// we are removing the client-side processing logic for this component.
// If single patient data (TemporalRow[]) is passed, this component will currently NOT render correctly.
// To support both, we would need to check the data type and conditionally process.
// Assuming for this task we are fully switching to the pre-processed format.

interface PatientStatusAnalyticsProps {
    data: (TemporalRow | PatientStatusProcessedRow)[];
}

const CATEGORIES = ['High', 'Normal', 'Moderately_low'];

export function PatientStatusAnalytics({ data }: PatientStatusAnalyticsProps) {
    // Cast to processed type for rendering because we know it's coming from the mocked API
    // In a real dual-support scenario, we'd add a type guard.
    const chartData = data as PatientStatusProcessedRow[];
    console.log(chartData);

    // Define specific colors for each category
    const categoryColors: Record<string, string> = {
        'High': '#ef4444', // red-500
        'Normal': '#22c55e', // green-500
        'Moderately_low': '#f59e0b', // amber-500
    };

    // Custom Tooltip to show Count (and Percentage)
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const dataKey = payload[0].dataKey as string; // e.g., 'NormalPct'
            const category = dataKey.replace('Pct', ''); // 'Normal'
            const count = dataPoint[category];
            const pct = payload[0].value;
            const color = payload[0].fill;

            return (
                <div className="bg-background border border-border p-2 rounded shadow-md text-xs">
                    <p className="font-semibold mb-1">{`Month: ${label}`}</p>
                    <p style={{ color }}>
                        {`${category.replace('_', ' ')}: ${count} patients (${Number(pct).toFixed(1)}%)`}
                    </p>
                </div>
            );
        }
        return null;
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
                                    <XAxis
                                        dataKey="month"
                                        hide={!isLast}
                                        tick={{ fontSize: 12 }}
                                        interval={0}
                                        height={30}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={(value) => `${value}%`}
                                        fontSize={12}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey={`${category}Pct`}
                                        fill={categoryColors[category] || "#8884d8"}
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
