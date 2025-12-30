import React, { useMemo } from 'react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TemporalRow } from '../types/temporal';

interface PatientMultiLineChartProps {
    data: TemporalRow[];
}

export function PatientMultiLineChart({ data }: PatientMultiLineChartProps) {
    // Shared X-Axis logic: Use numeric timestamps to allow precise plotting
    // "Dots displayed in their relative time" -> Continuous time axis

    // 1. Prepare Scatter Data (All Points)
    const scatterData = useMemo(() => {
        return data.map(row => {
            const val = parseFloat(row.Value as any);
            const date = new Date(row.StartTime);
            if (isNaN(val) || isNaN(date.getTime())) return null;
            return {
                x: date.getTime(),
                y: val,
                date: date,
                patientId: row.PatientID
            };
        }).filter(Boolean) as any[];
    }, [data]);

    // 2. Prepare Monthly Max/Min Data
    const { maxLineData, minLineData } = useMemo(() => {
        const months = new Map<string, {
            maxPoint: { x: number, y: number, date: Date } | null;
            minPoint: { x: number, y: number, date: Date } | null;
        }>();

        scatterData.forEach(point => {
            // Key by YYYY-MM
            const key = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;

            if (!months.has(key)) {
                months.set(key, { maxPoint: point, minPoint: point });
            } else {
                const entry = months.get(key)!;
                if (point.y > entry.maxPoint!.y) {
                    entry.maxPoint = point;
                }
                if (point.y < entry.minPoint!.y) {
                    entry.minPoint = point;
                }
            }
        });

        // Convert to sorted arrays
        const sortedKeys = Array.from(months.keys()).sort();
        const maxData = sortedKeys.map(k => months.get(k)!.maxPoint).filter(Boolean);
        const minData = sortedKeys.map(k => months.get(k)!.minPoint).filter(Boolean);

        return { maxLineData: maxData, minLineData: minData };
    }, [scatterData]);

    return (
        <div className="w-full h-full p-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="x"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        scale="time"
                        allowDuplicatedCategory={false}
                    />
                    <YAxis dataKey="y" />
                    <Tooltip
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                        formatter={(value, name) => [value, name === 'y' ? 'Value' : name]}
                    />
                    <Legend />

                    {/* Max Line - Red */}
                    <Line
                        data={maxLineData}
                        dataKey="y"
                        stroke="#ff0000"
                        strokeWidth={2}
                        dot={true}
                        activeDot={{ r: 6 }}
                        name="Max (Monthly)"
                        connectNulls
                        isAnimationActive={false}
                    />

                    {/* Min Line - Blue */}
                    <Line
                        data={minLineData}
                        dataKey="y"
                        stroke="#0000ff"
                        strokeWidth={2}
                        dot={true}
                        activeDot={{ r: 6 }}
                        name="Min (Monthly)"
                        connectNulls
                        isAnimationActive={false}
                    />

                    {/* All Points - Gray */}
                    {/* Note: We pass data directly to Scatter. XAxis must be numeric for this to work with Lines */}
                    <Scatter
                        data={scatterData}
                        name="Patient Values"
                        fill="#888888"
                        shape="circle"
                        line={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
