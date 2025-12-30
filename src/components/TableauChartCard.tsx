import { useRef, useEffect } from "react";
import { TableauViz } from "@tableau/embedding-api-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TableauChartCardProps {
    id: string;
    title: string;
    onRemove: (id: string) => void;
    patientId?: string; // To be passed as parameter
    vizUrl?: string; // Optional override, defaults to placeholder if not provided
}

// Placeholder - User needs to replace this with their actual Tableau View URL
const DEFAULT_VIZ_URL = "https://public.tableau.com/views/RegionalSampleWorkbook/Storms";

export function TableauChartCard({
    id,
    title,
    onRemove,
    patientId = "12345", // Default ID
    vizUrl = DEFAULT_VIZ_URL,
}: TableauChartCardProps) {
    const vizRef = useRef<any>(null);

    // Example of how to add event listeners if needed
    useEffect(() => {
        // If you need to access the viz object:
        // const viz = vizRef.current;
    }, []);

    return (
        <Card className="border border-border shadow-sm animate-in fade-in-50 duration-300 w-full h-[600px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-lg font-semibold">{title} (Tableau)</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        PatientID: {patientId} (Parameter)
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
            <CardContent className="flex-1 min-h-0 bg-gray-50 flex flex-col">
                {/*
            TableauViz component from @tableau/embedding-api-react
            Handles the lifecycle of the embedded viz.
        */}
                <div className="flex-1 w-full relative">
                    <TableauViz
                        key={id}
                        ref={vizRef}
                        src={vizUrl}
                        width="100%"
                        height="100%"
                        hide-tabs={true}
                        toolbar="bottom"
                    />
                    {vizUrl === DEFAULT_VIZ_URL && (
                        <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-xs p-1 text-center opacity-80 pointer-events-none">
                            Using Demo URL. Edit TableauChartCard.tsx to set your View URL.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
