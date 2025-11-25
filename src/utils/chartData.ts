export interface ChartDataPoint {
  date: string;
  value: number;
}

export function generateMockData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate realistic medical data with some variation
    const baseValue = 50 + Math.random() * 50;
    const trend = Math.sin(i / 5) * 10;
    const noise = (Math.random() - 0.5) * 15;
    
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round((baseValue + trend + noise) * 10) / 10,
    });
  }

  return data;
}
