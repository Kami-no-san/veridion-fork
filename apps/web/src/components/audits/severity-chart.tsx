"use client";

import { Cell, Legend,Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface SeverityChartProps {
  counts: Record<string, number>;
}

const severityConfig: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: "Critical", color: "#ef4444" },
  HIGH: { label: "High", color: "#f97316" },
  MEDIUM: { label: "Medium", color: "#eab308" },
  LOW: { label: "Low", color: "#22c55e" },
  GAS: { label: "Gas", color: "#3b82f6" },
  INFORMATIONAL: { label: "Info", color: "#6b7280" },
};

const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "GAS", "INFORMATIONAL"];

export function SeverityChart({ counts }: SeverityChartProps) {
  const data = severityOrder
    .filter((s) => counts[s] && counts[s] > 0)
    .map((s) => ({
      name: severityConfig[s]?.label ?? s,
      value: counts[s] ?? 0,
      color: severityConfig[s]?.color ?? "#6b7280",
    }));

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h3 className="text-sm font-semibold">Severity Distribution</h3>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          No findings to display
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <h3 className="text-sm font-semibold">Severity Distribution</h3>
      <div className="mt-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-xs">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
