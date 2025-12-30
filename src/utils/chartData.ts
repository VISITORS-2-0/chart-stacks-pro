export interface ChartDataPoint {
  date: string;
  value: number;
}

export function generateMockData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const today = new Date();

  // Generate ~5 years of data
  for (let i = 365 * 5; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate realistic medical data with some variation
    const baseValue = 50 + Math.random() * 50;
    // Add some seasonality (yearly and monthly)
    const yearlyTrend = Math.sin(i / 365 * 2 * Math.PI) * 10;
    const monthlyTrend = Math.sin(i / 30 * 2 * Math.PI) * 5;
    const noise = (Math.random() - 0.5) * 15;

    data.push({
      date: date.toISOString(), // Use ISO string for robust parsing
      value: Math.round((baseValue + yearlyTrend + monthlyTrend + noise) * 10) / 10,
    });
  }

  return data;
}
