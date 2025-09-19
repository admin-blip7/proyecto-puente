
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


interface HeatmapProps {
    data: any[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const day = data.dataKey;
    const hour = label;
    const value = data.value;
    
    return (
      <div className="bg-background/80 backdrop-blur-sm border p-2 rounded-md shadow-lg text-foreground">
        <p className="font-bold">{`${day} a las ${hour}`}</p>
        <p>Ingresos: {formatCurrency(value)}</p>
      </div>
    );
  }
  return null;
};

const getColor = (value: number, max: number) => {
    if (value === 0) return 'hsl(var(--muted))';
    const intensity = Math.min(value / (max * 0.8), 1); // Cap intensity to make high values more visible
    // Interpolate from muted to primary
    const h = 232 + (308 - 232) * intensity;
    const s = 30 + (100 - 30) * intensity;
    const l = 15 + (47 - 15) * intensity;
    return `hsl(${h}, ${s}%, ${l}%)`;
};


export default function PeakHoursHeatmap({ data }: HeatmapProps) {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Calculate max value for color scaling
  const maxValue = Math.max(...data.flatMap(d => days.map(day => d[day] || 0)));

  return (
    <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
            <BarChart
                data={data}
                margin={{ top: 5, right: 0, left: -20, bottom: 5 }}
                layout="vertical"
            >
                <XAxis type="number" hide />
                <YAxis 
                    type="category" 
                    dataKey="hour" 
                    tickLine={false} 
                    axisLine={false} 
                    interval={2}
                    tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                
                {days.map((day, index) => (
                    <Bar key={day} dataKey={day} stackId="a" barSize={40}>
                         {data.map((entry, entryIndex) => (
                            <Cell key={`cell-${index}-${entryIndex}`} fill={getColor(entry[day], maxValue)} />
                        ))}
                    </Bar>
                ))}
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
}

    