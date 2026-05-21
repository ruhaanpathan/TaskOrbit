"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface WeeklyActivityChartProps {
  data: { day: string; count: number }[]
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis 
          dataKey="day" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} 
          dy={10}
        />
        <YAxis 
          allowDecimals={false}
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} 
        />
        <Tooltip 
          cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
          contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--card)' }}
          itemStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
          labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}
        />
        <Bar 
          dataKey="count" 
          fill="var(--color-primary)" 
          radius={[4, 4, 0, 0]} 
          barSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
