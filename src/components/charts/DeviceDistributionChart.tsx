import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  bank: string;
  warehouse: number;
  issued: number;
  installed: number;
  faulty: number;
}

interface DeviceDistributionChartProps {
  data: DataPoint[];
  loading?: boolean;
}

export function DeviceDistributionChart({ data, loading }: DeviceDistributionChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="bank"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Bar dataKey="warehouse" stackId="a" fill="#6b7280" name="Warehouse" />
        <Bar dataKey="issued" stackId="a" fill="#f59e0b" name="Issued" />
        <Bar dataKey="installed" stackId="a" fill="#10b981" name="Installed" />
        <Bar dataKey="faulty" stackId="a" fill="#ef4444" name="Faulty" />
      </BarChart>
    </ResponsiveContainer>
  );
}
