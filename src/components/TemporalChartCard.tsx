import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnePatientRaw, useMultiPatientRaw } from "../hooks/useTemporalData";
import { PatientStatusAnalytics } from "./PatientStatusAnalytics";

interface TemporalChartCardProps {
    id: string;
    title: string;
    onRemove: (id: string) => void;
    isMultiPatient?: boolean;
}

export function TemporalChartCard({
    id,
    title,
    onRemove,
    isMultiPatient = false,
}: TemporalChartCardProps) {
    const singlePatient = useOnePatientRaw();
    const multiPatient = useMultiPatientRaw();
    const { data, loading, error } = isMultiPatient ? multiPatient : singlePatient;

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
                    <PatientStatusAnalytics data={data} />
                )}
            </CardContent>
        </Card>
    );
}
