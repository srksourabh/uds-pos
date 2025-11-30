import { useState } from 'react';
import { useReconciliationExport } from '../lib/api-hooks';
import { supabase } from '../lib/supabase';
import { Download, Calendar, FileText, Filter, Loader } from 'lucide-react';

export function Reports() {
  const { exportReconciliation, loading } = useReconciliationExport();
  const [banks, setBanks] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    bankId: '',
    startDate: '',
    endDate: '',
    includeMovements: false,
  });

  const [exportResult, setExportResult] = useState<any>(null);

  useState(() => {
    supabase.from('banks').select('*').then(({ data }) => setBanks(data || []));
  });

  const handleExport = async () => {
    try {
      const params: any = {};
      if (filters.bankId) params.bankId = filters.bankId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.includeMovements) params.includeMovements = true;

      const result = await exportReconciliation(params);
      setExportResult(result);
    } catch (error: any) {
      alert(`Export failed: ${error.error || error.message}`);
    }
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Reconciliation</h1>
          <p className="text-gray-600 mt-1">Generate inventory and stock movement reports</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation Export</h2>
          <p className="text-sm text-gray-600 mb-6">
            Export device inventory and stock movements for reconciliation and auditing purposes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter by Bank
            </label>
            <select
              value={filters.bankId}
              onChange={(e) => setFilters({ ...filters, bankId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Banks</option>
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.bank_name} ({bank.bank_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="End Date"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeMovements"
            checked={filters.includeMovements}
            onChange={(e) => setFilters({ ...filters, includeMovements: e.target.checked })}
            className="rounded border-gray-300"
          />
          <label htmlFor="includeMovements" className="text-sm text-gray-700">
            Include stock movements history (up to 10,000 records)
          </label>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {exportResult && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Export Complete</h2>
            <p className="text-sm text-gray-600">Generated on {new Date().toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium mb-1">Total Devices</div>
              <div className="text-2xl font-bold text-blue-900">{exportResult.deviceCount}</div>
            </div>
            {exportResult.movementCount > 0 && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium mb-1">Stock Movements</div>
                <div className="text-2xl font-bold text-green-900">{exportResult.movementCount}</div>
              </div>
            )}
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 font-medium mb-1">File Size</div>
              <div className="text-2xl font-bold text-purple-900">
                {((exportResult.devicesCsv.length + (exportResult.movementsCsv?.length || 0)) / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          {exportResult.summary && (
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(exportResult.summary.by_status || {}).map(([status, count]: any) => (
                  <div key={status} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1 capitalize">{status.replace(/_/g, ' ')}</div>
                    <div className="text-xl font-bold text-gray-900">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => downloadCSV(exportResult.devicesCsv, exportResult.filename)}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Download Devices CSV
            </button>
            {exportResult.movementsCsv && (
              <button
                onClick={() => downloadCSV(exportResult.movementsCsv, exportResult.filename.replace('.csv', '-movements.csv'))}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Download Movements CSV
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
