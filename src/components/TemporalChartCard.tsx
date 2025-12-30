import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnePatientRaw, useMultiPatientRaw } from "../hooks/useTemporalData";
import {
    LineChart,
    Line,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { useMemo } from "react";
import { TemporalRow } from "../types/temporal";

interface TemporalChartCardProps {
    id: string;
    title: string;
    onRemove: (id: string) => void;
    isMultiPatient?: boolean;
}

// Helper to colors for multi-patient lines
const COLORS = [
    "#2563eb", // blue-600
    "#dc2626", // red-600
    "#16a34a", // green-600
    "#d97706", // amber-600
    "#9333ea", // purple-600
    "#0891b2", // cyan-600
    "#be185d", // pink-700
];

export function TemporalChartCard({
    id,
    title,
    onRemove,
    isMultiPatient = false,
}: TemporalChartCardProps) {
    const singlePatient = useOnePatientRaw();
    const multiPatient = useMultiPatientRaw();
    const { data, loading, error } = isMultiPatient ? multiPatient : singlePatient;

    // Process data for charts
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Convert to timestamp for numeric axis
        return data.map(d => ({
            ...d,
            timestamp: new Date(d.StartTime).getTime(),
        })).sort((a, b) => a.timestamp - b.timestamp);
    }, [data]);

    // For multi-patient, identify unique patients
    const uniquePatients = useMemo(() => {
        if (!isMultiPatient) return [];
        const ids = new Set(data.map(d => d.PatientID));
        return Array.from(ids);
    }, [data, isMultiPatient]);

    // Custom tool tip to show date nicely
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // label is timestamp (number)
            return (
                <div className="bg-background border border-border p-2 rounded shadow-md text-xs">
                    <p className="font-semibold">{new Date(label).toLocaleString()}</p>
                    {payload.map((p: any, idx: number) => (
                        <p key={idx} style={{ color: p.color }}>
                            {p.name}: {Number(p.value).toFixed(2)}
                        </p>
                    ))}
                    {!isMultiPatient && (
                        <p className="text-muted-foreground">{payload[0].payload.ConceptName}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="border border-border shadow-sm animate-in fade-in-50 duration-300 w-full h-[500px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {loading ? "Loading..." : `${data.length} data points`}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(id)}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                >
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {loading && <div className="h-full flex items-center justify-center text-blue-600">Loading temporal data...</div>}
                {error && <div className="h-full flex items-center justify-center text-red-600">Error: {error.message}</div>}

                {!loading && !error && data.length === 0 && (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
                )}

                {!loading && !error && data.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                        {isMultiPatient ? (
                            // Multi-Patient: Line Chart (Spaghetti Plot)
                            <LineChart data={processedData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="timestamp"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    tickFormatter={(time) => new Date(time).toLocaleDateString()}
                                    scale="time"
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                    fontSize={10}
                                />
                                <YAxis fontSize={10} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                {uniquePatients.map((pid, idx) => (
                                    <Line
                                        key={pid}
                                        dataKey={(row: any) => row.PatientID === pid ? row.Value : null}
                                        name={`Patient ${pid}`}
                                        stroke={COLORS[idx % COLORS.length]}
                                        dot={false}
                                        connectNulls // Essential for sparse/spaghetti data in a single array
                                        strokeWidth={2}
                                        type="monotone"
                                    />
                                ))}
                            </LineChart>
                        ) : (
                            // Single Patient: Scatter Chart
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="timestamp"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    tickFormatter={(time) => new Date(time).toLocaleDateString()}
                                    name="Time"
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                    fontSize={10}
                                />
                                <YAxis dataKey="Value" name="Value" fontSize={10} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                <Scatter
                                    name="Values"
                                    data={processedData}
                                    fill="#8884d8"
                                    line
                                    lineType="monotone"
                                />
                            </ScatterChart>
                        )}
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
