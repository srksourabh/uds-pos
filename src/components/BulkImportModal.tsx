import { useState } from 'react';
import { Modal } from './Modal';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      'serial_number',
      'model',
      'make',
      'device_category',
      'tid',
      'customer_id',
      'receiving_date',
      'condition_status',
      'whereabouts'
    ];

    const examples = [
      'SN123456789',
      'iWL250',
      'Ingenico',
      'pos_terminal',
      'TID12345678',
      'HDFC',
      '2024-01-15',
      'good',
      'warehouse'
    ];

    const csvContent = [
      headers.join(','),
      examples.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'devices_import_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    return data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setResult(null);

    const text = await selectedFile.text();
    const parsed = parseCSV(text);
    setPreview(parsed.slice(0, 10));
    setShowPreview(true);
  };

  const generateUniqueEntryId = () => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `UDS${dateStr}${random}`;
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const devices = parseCSV(text);

      if (devices.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      // Load customer/bank lookup
      const { data: banks } = await supabase
        .from('banks')
        .select('id, code, name');

      const bankMap = new Map<string, string>();
      (banks || []).forEach(bank => {
        bankMap.set(bank.code.toUpperCase(), bank.id);
        bankMap.set(bank.name.toUpperCase(), bank.id);
      });

      let successCount = 0;
      let errorCount = 0;
      const errors: { row: number; error: string }[] = [];

      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        try {
          // Resolve customer_id from code or name
          let customer_id = device.customer_id;
          if (customer_id) {
            const resolved = bankMap.get(customer_id.toUpperCase());
            if (!resolved) {
              throw new Error(`Unknown customer: ${customer_id}`);
            }
            customer_id = resolved;
          }

          // Generate unique entry ID
          const unique_entry_id = generateUniqueEntryId();

          // Prepare device data
          const deviceData = {
            unique_entry_id,
            serial_number: device.serial_number?.toUpperCase() || '',
            model: device.model || '',
            make: device.make || '',
            device_category: device.device_category || 'pos_terminal',
            tid: device.tid?.toUpperCase() || null,
            device_bank: customer_id || null,
            customer_id: customer_id || null,
            receiving_date: device.receiving_date || new Date().toISOString().split('T')[0],
            condition_status: device.condition_status || 'good',
            whereabouts: device.whereabouts || 'warehouse',
            status: 'warehouse',
            current_location_type: 'warehouse',
            current_location_name: 'Main Warehouse',
          };

          // Check for duplicates
          const { data: existing } = await supabase
            .from('devices')
            .select('id')
            .eq('serial_number', deviceData.serial_number)
            .maybeSingle();

          if (existing) {
            throw new Error(`Duplicate serial number: ${deviceData.serial_number}`);
          }

          // Insert device
          const { error: insertError } = await supabase
            .from('devices')
            .insert(deviceData);

          if (insertError) throw insertError;

          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push({
            row: i + 2, // +2 because row 1 is header, array is 0-indexed
            error: error.message || 'Unknown error'
          });
        }
      }

      setResult({
        success: errorCount === 0,
        successCount,
        errorCount,
        errors: errors.slice(0, 20), // Show max 20 errors
      });

      if (successCount > 0) {
        setTimeout(() => {
          onSuccess();
          if (errorCount === 0) {
            handleClose();
          }
        }, 2000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        successCount: 0,
        errorCount: 1,
        errors: [{ row: 0, error: error.message }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setShowPreview(false);
    setResult(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Devices" maxWidth="2xl">
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Import Requirements</p>
              <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>CSV file format required</li>
                <li>Serial numbers must be unique</li>
                <li>Customer ID can be bank code (HDFC, ICICI, etc.) or bank name</li>
                <li>Valid whereabouts: warehouse, intransit, engineer, installed</li>
                <li>Valid conditions: good, faulty, returned</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <label className="cursor-pointer">
            <span className="text-blue-600 hover:text-blue-700 font-medium">
              Choose a CSV file
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {showPreview && preview.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Preview (First {preview.length} rows)
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Serial</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Model</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Make</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Customer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{row.serial_number}</td>
                        <td className="px-3 py-2">{row.model}</td>
                        <td className="px-3 py-2">{row.make}</td>
                        <td className="px-3 py-2">{row.customer_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className={`border rounded-lg p-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Import Successful' : 'Import Completed with Errors'}
                </p>
                <div className="mt-2 text-sm space-y-1">
                  <p className="text-green-700">Imported: {result.successCount} devices</p>
                  {result.errorCount > 0 && (
                    <p className="text-red-700">Errors: {result.errorCount}</p>
                  )}
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto">
                    <p className="text-xs font-medium text-red-900 mb-1">Error Details:</p>
                    {result.errors.map((err: { row: number; error: string }, i: number) => (
                      <p key={i} className="text-xs text-red-700">
                        Row {err.row}: {err.error}
                      </p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-xs text-red-600 mt-1">
                        ...and {result.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading || (result && result.success)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Importing...' : 'Import Devices'}
          </button>
        </div>
      </div>
    </Modal>
  );
}