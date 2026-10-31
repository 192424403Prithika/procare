"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TrendItem {
  month: string;
  inspections: number;
  anomalies: number;
  workOrders: number;
}

interface RiskDistributionItem {
  name: string;
  count: number;
  color: string;
}

interface DashboardChartsProps {
  trendData: TrendItem[];
  riskDistributionData: RiskDistributionItem[];
}

export function PortfolioInspectionTrendChart({ trendData }: { trendData: TrendItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorInspMgr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#79566F" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#79566F" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" stroke="#806C7B" fontSize={11} tickLine={false} />
        <YAxis stroke="#806C7B" fontSize={11} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#493344",
            borderColor: "#79566F",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "12px",
          }}
        />
        <Area
          type="monotone"
          dataKey="inspections"
          name="Inspections"
          stroke="#79566F"
          strokeWidth={2.5}
          fill="url(#colorInspMgr)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PortfolioRiskPieChart({
  riskDistributionData,
}: {
  riskDistributionData: RiskDistributionItem[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={riskDistributionData}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={60}
          paddingAngle={4}
        >
          {riskDistributionData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#493344",
            borderRadius: "10px",
            color: "#fff",
            fontSize: "11px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

