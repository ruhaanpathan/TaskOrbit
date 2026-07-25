"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface WeeklyActivityChartProps {
  data: { day: string; count: number }[]
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
          </linearGradient>
        </defs>
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
          cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '3 3' }}
          contentStyle={{ 
            borderRadius: '12px', 
            border: '1px solid var(--border)', 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
            backgroundColor: 'var(--card)',
            padding: '8px 12px'
          }}
          itemStyle={{ color: 'var(--foreground)', fontWeight: 600, fontSize: '13px' }}
          labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '2px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        />
        <Area 
          type="monotone"
          dataKey="count" 
          stroke="var(--primary)" 
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#chartGradient)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
