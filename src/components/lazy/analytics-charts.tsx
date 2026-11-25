import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
};

export function RevenueTrendChart({
  data,
  fmt,
}: {
  data: { date: string; revenue: number }[];
  fmt: (n: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
        <YAxis fontSize={11} stroke="var(--muted-foreground)" />
        <Tooltip formatter={(value: number) => fmt(value)} contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TopProductsChart({ data }: { data: { name: string; quantity: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" fontSize={11} stroke="var(--muted-foreground)" />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          fontSize={11}
          stroke="var(--muted-foreground)"
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="quantity" fill="var(--primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
