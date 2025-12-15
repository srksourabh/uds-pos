import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, X, Building2, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import type { CallType, Priority } from '../lib/database.types';

interface CSVRow {
  [key: string]: string | undefined;
}

interface UploadResult {
  success: boolean;
  row: number;
  call_number?: string;
  status: 'new' | 'duplicate' | 'updated' | 'error';
  error?: string;
}

interface Customer {
  id: string;
  name: string;
  short_name: string | null;
}

interface ImportBatch {
  id: string;
  batch_number: string;
  customer_id: string;
  source_file: string;
  total_rows: number;
  new_calls: number;
  duplicate_calls: number;
  status: string;
  created_at: string;
}

interface CallImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Map common column names from various customer formats
const COLUMN_MAPPINGS: Record<string, string[]> = {
  call_number: ['call_number', 'call no', 'call_no', 'callno', 'ticket', 'ticket_no', 'sr_no', 'service_request'],
  type: ['type', 'call_type', 'calltype', 'service_type', 'activity_type', 'activity'],
  client_name: ['client_name', 'merchant_name', 'merchant', 'me_name', 'customer_name', 'name', 'alias_name'],
  client_address: ['client_address', 'address', 'merchant_address', 'full_address', 'location'],
  city: ['city', 'district', 'location_city'],
  mid: ['mid', 'merchant_id', 'merchantid'],
  tid: ['tid', 'terminal_id', 'terminalid'],
  client_phone: ['client_phone', 'phone', 'mobile', 'contact_no', 'telephoneno', 'mobile_no'],
  scheduled_date: ['scheduled_date', 'schedule_date', 'visit_date', 'due_date', 'date'],
  priority: ['priority', 'urgency', 'sla_priority'],
  statecode: ['statecode', 'state_code', 'state'],
  fsp_region: ['fsp_region', 'region', 'zone'],
  fsp_center: ['fsp_center', 'center', 'branch'],
};

const TYPE_MAPPINGS: Record<string, CallType> = {
  'installation': 'install',
  'install': 'install',
  'new installation': 'install',
  'swap': 'swap',
  'replacement': 'swap',
  'deinstallation': 'deinstall',
  'deinstall': 'deinstall',
  'removal': 'deinstall',
  'pm': 'maintenance',
  'preventive maintenance': 'maintenance',
  'maintenance': 'maintenance',
  'service': 'maintenance',
  'breakdown': 'breakdown',
  'repair': 'breakdown',
  'complaint': 'breakdown',
  'cm': 'breakdown',
};

export function CallImportModal({ isOpen, onClose, onSuccess }: CallImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [mappedColumns, setMappedColumns] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [step, setStep] = useState<'select' | 'upload' | 'mapping' | 'preview' | 'results'>('select');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [recentImports, setRecentImports] = useState<ImportBatch[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadRecentImports();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, short_name')
      .eq('status', 'active')
      .order('name');
    if (data) setCustomers(data);
  };

  const loadRecentImports = async () => {
    const { data } = await supabase
      .from('call_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentImports(data);
  };

  const findColumnMapping = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    
    for (const [targetCol, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
      for (const header of headers) {
        const normalizedHeader = header.toLowerCase().trim().replace(/[\s_-]+/g, '_');
        if (possibleNames.some(name => normalizedHeader.includes(name.replace(/[\s_-]+/g, '_')))) {
          mapping[targetCol] = header;
          break;
        }
      }
    }
    
    return mapping;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  }, []);

  const processFile = (file: File) => {
    setFile(file);
    setValidationErrors([]);
    setParsedData([]);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const autoMapping = findColumnMapping(headers);
        setMappedColumns(autoMapping);
        setParsedData(results.data);
        setStep('mapping');
      },
      error: (error) => {
        setValidationErrors([`Parse error: ${error.message}`]);
      }
    });
  };

  const validateAndPreview = () => {
    const errors: string[] = [];
    
    if (!mappedColumns.call_number) {
      errors.push('Call number column is required');
    }
    if (!mappedColumns.client_name && !mappedColumns.mid) {
      errors.push('Either Client Name or MID column is required');
    }
    
    setValidationErrors(errors);
    if (errors.length === 0) {
      setStep('preview');
    }
  };

  const mapCallType = (value: string | undefined): CallType => {
    if (!value) return 'maintenance';
    const normalized = value.toLowerCase().trim();
    return TYPE_MAPPINGS[normalized] || 'maintenance';
  };

  const uploadCalls = async () => {
    setUploading(true);
    const uploadResults: UploadResult[] = [];
    let newCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    // Create import batch record
    const { data: batch } = await supabase
      .from('call_import_batches')
      .insert({
        batch_number: `IMP-${Date.now()}`,
        customer_id: selectedCustomer || null,
        source_file: file?.name || 'unknown',
        total_rows: parsedData.length,
        status: 'processing'
      })
      .select()
      .single();

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      try {
        const callNumber = row[mappedColumns.call_number || '']?.trim();
        
        if (!callNumber) {
          uploadResults.push({
            success: false,
            row: i + 2,
            status: 'error',
            error: 'Missing call number'
          });
          errorCount++;
          continue;
        }

        // Check for duplicate
        const { data: existing } = await supabase
          .from('calls')
          .select('id, call_number')
          .eq('call_number', callNumber)
          .maybeSingle();

        if (existing) {
          uploadResults.push({
            success: true,
            row: i + 2,
            call_number: callNumber,
            status: 'duplicate'
          });
          duplicateCount++;
          continue;
        }

        // Build call data from mapped columns
        const callData: Record<string, any> = {
          call_number: callNumber,
          type: mapCallType(row[mappedColumns.type || '']),
          status: 'pending',
          client_name: row[mappedColumns.client_name || ''] || row[mappedColumns.mid || ''] || 'Unknown',
          client_address: row[mappedColumns.client_address || ''] || '',
          city: row[mappedColumns.city || '']?.toUpperCase() || null,
          mid: row[mappedColumns.mid || ''] || null,
          tid: row[mappedColumns.tid || ''] || null,
          client_phone: row[mappedColumns.client_phone || ''] || null,
          statecode: row[mappedColumns.statecode || ''] || null,
          fsp_region: row[mappedColumns.fsp_region || ''] || null,
          fsp_center: row[mappedColumns.fsp_center || ''] || null,
          customer_id: selectedCustomer || null,
          priority: (row[mappedColumns.priority || '']?.toLowerCase() || 'medium') as Priority,
        };

        // Parse scheduled date if available
        if (mappedColumns.scheduled_date && row[mappedColumns.scheduled_date]) {
          const dateStr = row[mappedColumns.scheduled_date];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            callData.scheduled_date = parsedDate.toISOString().split('T')[0];
          }
        } else {
          callData.scheduled_date = new Date().toISOString().split('T')[0];
        }

        const { error } = await supabase
          .from('calls')
          .insert(callData);

        if (error) {
          uploadResults.push({
            success: false,
            row: i + 2,
            call_number: callNumber,
            status: 'error',
            error: error.message
          });
          errorCount++;
        } else {
          uploadResults.push({
            success: true,
            row: i + 2,
            call_number: callNumber,
            status: 'new'
          });
          newCount++;
        }
      } catch (err) {
        uploadResults.push({
          success: false,
          row: i + 2,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    // Update batch record
    if (batch) {
      await supabase
        .from('call_import_batches')
        .update({
          new_calls: newCount,
          duplicate_calls: duplicateCount,
          error_calls: errorCount,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);
    }

    setResults(uploadResults);
    setUploading(false);
    setStep('results');
    loadRecentImports();
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setMappedColumns({});
    setValidationErrors([]);
    setResults([]);
    setStep('select');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const newCount = results.filter(r => r.status === 'new').length;
  const duplicateCount = results.filter(r => r.status === 'duplicate').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Calls
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Select Customer */}
          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer (Optional)
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- All Customers --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.short_name ? `(${c.short_name})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Select the customer whose calls you are importing (Hitachi, FiServ, etc.)
                </p>
              </div>

              {/* Recent Imports */}
              {recentImports.length > 0 && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Recent Imports
                  </h3>
                  <div className="space-y-2">
                    {recentImports.map(imp => (
                      <div key={imp.id} className="flex justify-between text-sm bg-white p-2 rounded border">
                        <span className="text-gray-600">{imp.source_file}</span>
                        <span className="text-gray-500">
                          {imp.new_calls} new, {imp.duplicate_calls} duplicates
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                  ${isDragging
                    ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-lg text-gray-600 mb-2">
                  Drop your CSV/Excel file here
                </p>
                <p className="text-sm text-gray-400">
                  or click to browse
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Duplicate calls (same call number) will be automatically skipped.
                  Only new calls will be added to the system.
                </p>
              </div>
            </div>
          )}

          {/* Step: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-medium">{file?.name}</span>
                <span className="text-sm text-gray-500">({parsedData.length} rows)</span>
              </div>

              <h3 className="font-medium text-gray-700">Map Columns</h3>
              <p className="text-sm text-gray-500 mb-4">
                We've automatically detected some columns. Please verify or adjust the mappings.
              </p>

              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                {Object.entries(COLUMN_MAPPINGS).map(([target, _]) => (
                  <div key={target} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-1 capitalize">
                      {target.replace(/_/g, ' ')}
                      {['call_number'].includes(target) && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={mappedColumns[target] || ''}
                      onChange={(e) => setMappedColumns(prev => ({ ...prev, [target]: e.target.value }))}
                      className="p-2 border rounded-lg text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {(parsedData[0] ? Object.keys(parsedData[0]) : []).map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-sm text-red-600">{err}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={reset}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={validateAndPreview}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Continue to Preview
                </button>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{file?.name}</span>
                  <span className="text-sm text-gray-500">({parsedData.length} rows)</span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Call #</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Client/MID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">City</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">TID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parsedData.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-mono">
                            {row[mappedColumns.call_number || '']}
                          </td>
                          <td className="px-3 py-2 text-sm capitalize">
                            {mapCallType(row[mappedColumns.type || ''])}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {row[mappedColumns.client_name || ''] || row[mappedColumns.mid || '']}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {row[mappedColumns.city || '']}
                          </td>
                          <td className="px-3 py-2 text-sm font-mono">
                            {row[mappedColumns.tid || '']}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 20 && (
                  <div className="bg-gray-50 px-3 py-2 text-sm text-gray-500 text-center">
                    Showing 20 of {parsedData.length} rows
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={uploadCalls}
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {parsedData.length} Calls
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold text-green-700">{newCount}</div>
                    <div className="text-sm text-green-600">New Calls Added</div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-700">{duplicateCount}</div>
                    <div className="text-sm text-yellow-600">Duplicates Skipped</div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold text-red-700">{errorCount}</div>
                    <div className="text-sm text-red-600">Errors</div>
                  </div>
                </div>
              </div>

              {errorCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-700 mb-2">Error Details:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.filter(r => r.status === 'error').map((r, i) => (
                      <div key={i} className="text-sm text-red-600">
                        Row {r.row}: {r.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Import More
                </button>
                <button
                  onClick={() => { onSuccess(); onClose(); }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
