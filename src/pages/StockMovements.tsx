import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Download, ArrowRightLeft } from 'lucide-react';
import type { Database } from '../lib/database.types';

type StockMovement = Database['public']['Tables']['stock_movements']['Row'] & {
  device?: { serial_number: string; model: string };
  from_eng?: { full_name: string };
  to_eng?: { full_name: string };
  actor?: { full_name: string };
};

export function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7');

  useEffect(() => {
    loadMovements();

    const channel = supabase
      .channel('stock-movements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, loadMovements)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [dateFilter]);

  const loadMovements = async () => {
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          device:device_id(serial_number, model),
          from_eng:from_engineer(full_name),
          to_eng:to_engineer(full_name),
          actor:actor_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovements(data as StockMovement[]);
    } catch (error) {
      console.error('Error loading stock movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.device?.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.device?.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || movement.movement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const exportToCSV = () => {
    const rows = [
      ['Date', 'Device Serial', 'Movement Type', 'From Status', 'To Status', 'From', 'To', 'Actor', 'Reason'].join(',')
    ];

    filteredMovements.forEach(movement => {
      rows.push([
        new Date(movement.created_at).toLocaleString(),
        movement.device?.serial_number || '',
        movement.movement_type,
        movement.from_status,
        movement.to_status,
        movement.from_eng?.full_name || movement.from_location || '',
        movement.to_eng?.full_name || movement.to_location || '',
        movement.actor?.full_name || '',
        `"${movement.reason}"`
      ].join(','));
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_movements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const movementTypeColors: Record<string, string> = {
    status_change: 'bg-gray-100 text-gray-800',
    assignment: 'bg-blue-100 text-blue-800',
    transfer: 'bg-purple-100 text-purple-800',
    return: 'bg-green-100 text-green-800',
    issuance: 'bg-yellow-100 text-yellow-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-gray-600 mt-2">Complete audit trail of all device movements</p>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download className="w-5 h-5 mr-2" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by device, model, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Types</option>
              <option value="status_change">Status Change</option>
              <option value="assignment">Assignment</option>
              <option value="transfer">Transfer</option>
              <option value="return">Return</option>
              <option value="issuance">Issuance</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status Change
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  From → To
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No movements found</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(movement.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {movement.device?.serial_number || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">{movement.device?.model}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${movementTypeColors[movement.movement_type] || 'bg-gray-100 text-gray-800'}`}>
                        {movement.movement_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-gray-600">{movement.from_status}</span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="text-gray-900 font-medium">{movement.to_status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">{movement.from_eng?.full_name || movement.from_location || '-'}</span>
                        <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-900">{movement.to_eng?.full_name || movement.to_location || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {movement.actor?.full_name || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {movement.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredMovements.length} of {movements.length} movements
        </p>
      </div>
    </div>
  );
}
