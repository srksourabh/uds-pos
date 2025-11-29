import { useState } from 'react';
import { Modal } from './Modal';
import { Upload, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ValidationError {
  row: number;
  error: string;
  data: any;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = () => {
    const template = 'serial_number,model,device_bank_code,warranty_expiry,firmware_version,notes\nDEV-001,Ingenico iWL250,FNB,2025-12-31,v1.2.3,Test device\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'device_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
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
    setPreview(parsed.slice(0, 100));
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const devices = parseCSV(text);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-import-devices`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ devices, skipDuplicates: true }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setResult(result);
      setShowPreview(false);

      if (result.success) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 3000);
      }
    } catch (error: any) {
      setResult({
        success: false,
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
                <li>Maximum 1000 devices per import</li>
                <li>Serial numbers must be unique</li>
                <li>Bank codes must match existing banks</li>
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Bank</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Warranty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{row.serial_number}</td>
                        <td className="px-3 py-2">{row.model}</td>
                        <td className="px-3 py-2">{row.device_bank_code}</td>
                        <td className="px-3 py-2">{row.warranty_expiry}</td>
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
                  {result.duplicates && result.duplicates.length > 0 && (
                    <p className="text-yellow-700">Skipped duplicates: {result.duplicates.length}</p>
                  )}
                  {result.errorCount > 0 && (
                    <p className="text-red-700">Errors: {result.errorCount}</p>
                  )}
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto">
                    <p className="text-xs font-medium text-red-900 mb-1">Error Details:</p>
                    {result.errors.slice(0, 10).map((err: ValidationError, i: number) => (
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
            disabled={!file || loading || !!result}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Importing...' : 'Import Devices'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
