import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Smartphone,
  Phone,
  Users,
  Store,
  Trash2,
  Eye,
  AlertTriangle,
  Info
} from 'lucide-react';

type ImportType = 'devices' | 'calls' | 'engineers' | 'merchants';
type ImportStep = 'select' | 'upload' | 'map' | 'validate' | 'preview' | 'import' | 'complete';

interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  required: boolean;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

// Column definitions for each import type
const COLUMN_DEFINITIONS: Record<ImportType, Array<{ name: string; key: string; required: boolean; description: string }>> = {
  devices: [
    { name: 'Serial Number', key: 'serial_number', required: true, description: 'Unique device serial number' },
    { name: 'TID', key: 'tid', required: false, description: 'Terminal ID' },
    { name: 'Model', key: 'model', required: true, description: 'Device model (e.g., Ingenico ICT250)' },
    { name: 'Brand', key: 'brand', required: false, description: 'Device brand (Ingenico, VeriFone, FUJIAN)' },
    { name: 'Status', key: 'status', required: false, description: 'warehouse, issued, installed, faulty' },
    { name: 'Bank Code', key: 'bank_code', required: false, description: 'Bank code (HDFC, ICICI, AXIS, SBI, KOTAK)' },
    { name: 'SIM Number', key: 'sim_number', required: false, description: 'SIM card number' },
    { name: 'Firmware Version', key: 'firmware_version', required: false, description: 'Firmware version' },
  ],
  calls: [
    { name: 'Call Number', key: 'call_number', required: true, description: 'Unique call reference number' },
    { name: 'Type', key: 'type', required: true, description: 'installation, maintenance, swap, repair' },
    { name: 'Priority', key: 'priority', required: false, description: 'low, medium, high, urgent' },
    { name: 'Client Name', key: 'client_name', required: true, description: 'Merchant/client name' },
    { name: 'Client Phone', key: 'client_phone', required: false, description: 'Contact phone number' },
    { name: 'Client Address', key: 'client_address', required: false, description: 'Full address' },
    { name: 'Client City', key: 'client_city', required: false, description: 'City name' },
    { name: 'Client State', key: 'client_state', required: false, description: 'State name' },
    { name: 'Client Pincode', key: 'client_pincode', required: false, description: '6-digit pincode' },
    { name: 'MID', key: 'mid', required: false, description: '15-digit Merchant ID' },
    { name: 'TID', key: 'tid', required: false, description: 'Terminal ID' },
    { name: 'Bank Code', key: 'bank_code', required: false, description: 'Bank code' },
    { name: 'Remarks', key: 'remarks', required: false, description: 'Additional notes' },
  ],
  engineers: [
    { name: 'Employee ID', key: 'employee_id', required: true, description: 'Format: UDSPL#### (e.g., UDSPL0001)' },
    { name: 'Full Name', key: 'full_name', required: true, description: 'Engineer full name' },
    { name: 'Email', key: 'email', required: true, description: 'Email address' },
    { name: 'Phone', key: 'phone', required: true, description: 'Phone number with country code' },
    { name: 'City', key: 'city', required: false, description: 'City of operation' },
    { name: 'State', key: 'state', required: false, description: 'State' },
    { name: 'Region', key: 'region', required: false, description: 'Region name' },
  ],
  merchants: [
    { name: 'Name', key: 'name', required: true, description: 'Merchant business name' },
    { name: 'MID', key: 'mid', required: true, description: '15-digit Merchant ID' },
    { name: 'Phone', key: 'phone', required: false, description: 'Contact phone' },
    { name: 'Email', key: 'email', required: false, description: 'Contact email' },
    { name: 'Address', key: 'address', required: false, description: 'Full address' },
    { name: 'City', key: 'city', required: true, description: 'City name' },
    { name: 'State', key: 'state', required: false, description: 'State name' },
    { name: 'Pincode', key: 'pincode', required: false, description: '6-digit pincode' },
    { name: 'Latitude', key: 'latitude', required: false, description: 'GPS latitude' },
    { name: 'Longitude', key: 'longitude', required: false, description: 'GPS longitude' },
    { name: 'Bank Code', key: 'bank_code', required: false, description: 'Associated bank' },
  ],
};

const IMPORT_TYPE_INFO: Record<ImportType, { title: string; icon: typeof Smartphone; color: string; description: string }> = {
  devices: { 
    title: 'POS Devices', 
    icon: Smartphone, 
    color: 'blue',
    description: 'Import POS terminals with serial numbers, TIDs, and status'
  },
  calls: { 
    title: 'Service Calls', 
    icon: Phone, 
    color: 'green',
    description: 'Import service calls with client details and locations'
  },
  engineers: { 
    title: 'Field Engineers', 
    icon: Users, 
    color: 'purple',
    description: 'Import engineer profiles with contact information'
  },
  merchants: { 
    title: 'Merchants', 
    icon: Store, 
    color: 'orange',
    description: 'Import merchant details with MIDs and GPS coordinates'
  },
};

export function BulkImport() {
  const [step, setStep] = useState<ImportStep>('select');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Load banks for lookups
  useState(() => {
    supabase.from('banks').select('id, code, name').then(({ data }) => {
      setBanks(data || []);
    });
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }
    
    setFile(selectedFile);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setCsvHeaders(results.meta.fields || []);
        
        // Auto-map columns based on name similarity
        if (importType) {
          const definitions = COLUMN_DEFINITIONS[importType];
          const autoMappings: ColumnMapping[] = definitions.map(def => {
            const matchingHeader = results.meta.fields?.find(h => 
              h.toLowerCase().replace(/[_\s]/g, '') === def.key.toLowerCase().replace(/[_\s]/g, '') ||
              h.toLowerCase().includes(def.key.toLowerCase().replace(/_/g, ' ')) ||
              def.name.toLowerCase().includes(h.toLowerCase())
            );
            return {
              csvColumn: matchingHeader || '',
              dbColumn: def.key,
              required: def.required,
            };
          });
          setColumnMappings(autoMappings);
        }
        
        setStep('map');
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const updateMapping = (dbColumn: string, csvColumn: string) => {
    setColumnMappings(prev => 
      prev.map(m => m.dbColumn === dbColumn ? { ...m, csvColumn } : m)
    );
  };

  const validateData = () => {
    if (!importType) return;
    
    const errors: ValidationError[] = [];
    const valid: any[] = [];
    const definitions = COLUMN_DEFINITIONS[importType];
    
    csvData.forEach((row, idx) => {
      const rowNumber = idx + 2; // +2 for header and 1-based index
      let rowValid = true;
      const mappedRow: any = {};
      
      // Check required fields
      columnMappings.forEach(mapping => {
        const def = definitions.find(d => d.key === mapping.dbColumn);
        const value = mapping.csvColumn ? row[mapping.csvColumn]?.toString().trim() : '';
        
        if (mapping.required && !value) {
          errors.push({
            row: rowNumber,
            column: def?.name || mapping.dbColumn,
            value: '',
            error: 'Required field is empty'
          });
          rowValid = false;
        } else if (value) {
          mappedRow[mapping.dbColumn] = value;
        }
      });
      
      // Type-specific validations
      if (importType === 'devices') {
        if (mappedRow.serial_number && !/^[A-Za-z0-9-]+$/.test(mappedRow.serial_number)) {
          errors.push({ row: rowNumber, column: 'Serial Number', value: mappedRow.serial_number, error: 'Invalid format' });
          rowValid = false;
        }
        if (mappedRow.status && !['warehouse', 'issued', 'installed', 'faulty'].includes(mappedRow.status.toLowerCase())) {
          errors.push({ row: rowNumber, column: 'Status', value: mappedRow.status, error: 'Must be: warehouse, issued, installed, or faulty' });
          rowValid = false;
        }
      }
      
      if (importType === 'calls') {
        if (mappedRow.type && !['installation', 'maintenance', 'swap', 'repair'].includes(mappedRow.type.toLowerCase())) {
          errors.push({ row: rowNumber, column: 'Type', value: mappedRow.type, error: 'Must be: installation, maintenance, swap, or repair' });
          rowValid = false;
        }
        if (mappedRow.priority && !['low', 'medium', 'high', 'urgent'].includes(mappedRow.priority.toLowerCase())) {
          errors.push({ row: rowNumber, column: 'Priority', value: mappedRow.priority, error: 'Must be: low, medium, high, or urgent' });
          rowValid = false;
        }
        if (mappedRow.mid && !/^\d{15}$/.test(mappedRow.mid)) {
          errors.push({ row: rowNumber, column: 'MID', value: mappedRow.mid, error: 'Must be 15 digits' });
          rowValid = false;
        }
      }
      
      if (importType === 'engineers') {
        if (mappedRow.employee_id && !/^UDSPL\d{4}$/.test(mappedRow.employee_id)) {
          errors.push({ row: rowNumber, column: 'Employee ID', value: mappedRow.employee_id, error: 'Format must be UDSPL#### (e.g., UDSPL0001)' });
          rowValid = false;
        }
        if (mappedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedRow.email)) {
          errors.push({ row: rowNumber, column: 'Email', value: mappedRow.email, error: 'Invalid email format' });
          rowValid = false;
        }
      }
      
      if (importType === 'merchants') {
        if (mappedRow.mid && !/^\d{15}$/.test(mappedRow.mid)) {
          errors.push({ row: rowNumber, column: 'MID', value: mappedRow.mid, error: 'Must be 15 digits' });
          rowValid = false;
        }
        if (mappedRow.latitude && (isNaN(parseFloat(mappedRow.latitude)) || parseFloat(mappedRow.latitude) < -90 || parseFloat(mappedRow.latitude) > 90)) {
          errors.push({ row: rowNumber, column: 'Latitude', value: mappedRow.latitude, error: 'Must be between -90 and 90' });
          rowValid = false;
        }
        if (mappedRow.longitude && (isNaN(parseFloat(mappedRow.longitude)) || parseFloat(mappedRow.longitude) < -180 || parseFloat(mappedRow.longitude) > 180)) {
          errors.push({ row: rowNumber, column: 'Longitude', value: mappedRow.longitude, error: 'Must be between -180 and 180' });
          rowValid = false;
        }
      }
      
      if (rowValid) {
        valid.push(mappedRow);
      }
    });
    
    setValidationErrors(errors);
    setValidRows(valid);
    setStep('preview');
  };

  const performImport = async () => {
    if (!importType || validRows.length === 0) return;
    
    setImporting(true);
    setImportProgress(0);
    
    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 50;
    const totalBatches = Math.ceil(validRows.length / batchSize);
    
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      try {
        // Transform data for database
        const transformedBatch = await Promise.all(batch.map(async (row) => {
          const transformed: any = { ...row };
          
          // Convert bank_code to bank ID
          if (row.bank_code) {
            const bank = banks.find(b => b.code.toLowerCase() === row.bank_code.toLowerCase());
            if (bank) {
              if (importType === 'devices') transformed.device_bank = bank.id;
              else if (importType === 'calls') transformed.client_bank = bank.id;
              else if (importType === 'merchants') transformed.bank_id = bank.id;
            }
            delete transformed.bank_code;
          }
          
          // Type-specific transformations
          if (importType === 'devices') {
            transformed.status = (row.status || 'warehouse').toLowerCase();
          }
          
          if (importType === 'calls') {
            transformed.type = (row.type || 'installation').toLowerCase();
            transformed.priority = (row.priority || 'medium').toLowerCase();
            transformed.status = 'pending';
          }
          
          if (importType === 'engineers') {
            transformed.role = 'engineer';
            transformed.status = 'active';
          }
          
          if (importType === 'merchants') {
            if (row.latitude) transformed.latitude = parseFloat(row.latitude);
            if (row.longitude) transformed.longitude = parseFloat(row.longitude);
          }
          
          return transformed;
        }));
        
        // Insert batch
        const tableName = importType === 'engineers' ? 'user_profiles' : importType;
        const { error } = await supabase.from(tableName).insert(transformedBatch);
        
        if (error) {
          result.failed += batch.length;
          result.errors.push({ row: i + 1, error: error.message });
        } else {
          result.success += batch.length;
        }
      } catch (err: any) {
        result.failed += batch.length;
        result.errors.push({ row: i + 1, error: err.message });
      }
      
      setImportProgress(Math.round((currentBatch / totalBatches) * 100));
    }
    
    setImportResult(result);
    setImporting(false);
    setStep('complete');
  };

  const downloadTemplate = () => {
    if (!importType) return;
    
    const definitions = COLUMN_DEFINITIONS[importType];
    const headers = definitions.map(d => d.name);
    
    // Add sample row
    let sampleRow: string[] = [];
    if (importType === 'devices') {
      sampleRow = ['SN123456789', 'TID001', 'ICT250', 'Ingenico', 'warehouse', 'HDFC', '9876543210', '1.0.0'];
    } else if (importType === 'calls') {
      sampleRow = ['CALL-001', 'installation', 'medium', 'ABC Store', '9876543210', '123 Main St', 'Mumbai', 'Maharashtra', '400001', '123456789012345', 'TID001', 'HDFC', 'New installation'];
    } else if (importType === 'engineers') {
      sampleRow = ['UDSPL0001', 'John Doe', 'john@example.com', '+919876543210', 'Mumbai', 'Maharashtra', 'West'];
    } else if (importType === 'merchants') {
      sampleRow = ['ABC Store', '123456789012345', '9876543210', 'abc@store.com', '123 Main St', 'Mumbai', 'Maharashtra', '400001', '19.0760', '72.8777', 'HDFC'];
    }
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}-import-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep('select');
    setImportType(null);
    setFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMappings([]);
    setValidationErrors([]);
    setValidRows([]);
    setImportResult(null);
    setImportProgress(0);
  };

  const requiredMappingsComplete = useMemo(() => {
    return columnMappings.filter(m => m.required).every(m => m.csvColumn !== '');
  }, [columnMappings]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bulk Import</h1>
          <p className="text-gray-600 mt-1">Import data from CSV files</p>
        </div>
        {step !== 'select' && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Start Over
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
        {['select', 'upload', 'map', 'preview', 'import', 'complete'].map((s, idx) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === s ? 'bg-blue-600 text-white' :
              ['select', 'upload', 'map', 'preview', 'import', 'complete'].indexOf(step) > idx ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {['select', 'upload', 'map', 'preview', 'import', 'complete'].indexOf(step) > idx ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                idx + 1
              )}
            </div>
            {idx < 5 && (
              <div className={`w-8 md:w-16 h-1 mx-1 ${
                ['select', 'upload', 'map', 'preview', 'import', 'complete'].indexOf(step) > idx ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Import Type */}
      {step === 'select' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Select Data Type to Import</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(IMPORT_TYPE_INFO) as ImportType[]).map(type => {
              const info = IMPORT_TYPE_INFO[type];
              const Icon = info.icon;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setImportType(type);
                    setStep('upload');
                  }}
                  className={`p-6 rounded-xl border-2 text-left hover:border-${info.color}-500 hover:bg-${info.color}-50 transition-all group`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-${info.color}-100 group-hover:bg-${info.color}-200`}>
                      <Icon className={`w-8 h-8 text-${info.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{info.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                      <div className="mt-3 text-sm text-gray-500">
                        {COLUMN_DEFINITIONS[type].filter(c => c.required).length} required fields, {COLUMN_DEFINITIONS[type].length} total
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Upload File */}
      {step === 'upload' && importType && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Upload {IMPORT_TYPE_INFO[importType].title} CSV
            </h2>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

          {/* Required Fields Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Required Fields</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {COLUMN_DEFINITIONS[importType].filter(c => c.required).map(c => c.name).join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-lg font-medium text-gray-700">
              Drag and drop your CSV file here
            </p>
            <p className="text-sm text-gray-500 mt-2">or</p>
            <label className="mt-4 inline-block">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <span className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block">
                Browse Files
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-4">Only CSV files are supported</p>
          </div>

          <button
            onClick={() => setStep('select')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Type Selection
          </button>
        </div>
      )}

      {/* Step 3: Map Columns */}
      {step === 'map' && importType && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Map Columns</h2>
              <p className="text-sm text-gray-600">
                File: {file?.name} ({csvData.length} rows)
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Database Field</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CSV Column</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {COLUMN_DEFINITIONS[importType].map(def => {
                  const mapping = columnMappings.find(m => m.dbColumn === def.key);
                  return (
                    <tr key={def.key} className={def.required && !mapping?.csvColumn ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 font-medium text-gray-900">{def.name}</td>
                      <td className="px-4 py-3">
                        <select
                          value={mapping?.csvColumn || ''}
                          onChange={(e) => updateMapping(def.key, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            def.required && !mapping?.csvColumn ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        >
                          <option value="">-- Select Column --</option>
                          {csvHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{def.description}</td>
                      <td className="px-4 py-3 text-center">
                        {def.required ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Required</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Optional</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={validateData}
              disabled={!requiredMappingsComplete}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Validate Data
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Preview & Validation */}
      {step === 'preview' && importType && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Validation Results</h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Rows</p>
                  <p className="text-2xl font-bold text-gray-900">{csvData.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valid Rows</p>
                  <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{validationErrors.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-medium text-red-900">Validation Errors ({validationErrors.length})</h3>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validationErrors.slice(0, 50).map((err, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{err.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{err.column}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 max-w-32 truncate">{err.value || '(empty)'}</td>
                        <td className="px-4 py-2 text-sm text-red-600">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validationErrors.length > 50 && (
                  <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
                    ... and {validationErrors.length - 50} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Valid Data */}
          {validRows.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-green-50 px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-green-900">Preview Valid Data (first 10 rows)</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(validRows[0] || {}).map(key => (
                        <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.values(row).map((val: any, i) => (
                          <td key={i} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-40 truncate">
                            {val || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep('map')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Mapping
            </button>
            <button
              onClick={performImport}
              disabled={validRows.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {validRows.length} Records
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Importing */}
      {step === 'import' && importing && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <Loader className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Importing Data...</h2>
          <p className="text-gray-600 mt-2">Please wait while we import your records</p>
          
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{importProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="h-3 bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Complete */}
      {step === 'complete' && importResult && (
        <div className="space-y-6">
          <div className={`rounded-xl p-8 text-center ${
            importResult.failed === 0 ? 'bg-green-50' : 'bg-yellow-50'
          }`}>
            {importResult.failed === 0 ? (
              <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" />
            ) : (
              <AlertTriangle className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
            )}
            <h2 className="text-2xl font-bold text-gray-900">Import Complete!</h2>
            <p className="text-gray-600 mt-2">
              {importResult.success} records imported successfully
              {importResult.failed > 0 && `, ${importResult.failed} failed`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-100 rounded-xl">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Successfully Imported</p>
                  <p className="text-4xl font-bold text-green-600">{importResult.success}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-red-100 rounded-xl">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Failed</p>
                  <p className="text-4xl font-bold text-red-600">{importResult.failed}</p>
                </div>
              </div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b">
                <h3 className="font-medium text-red-900">Import Errors</h3>
              </div>
              <div className="max-h-48 overflow-y-auto p-4 space-y-2">
                {importResult.errors.map((err, idx) => (
                  <div key={idx} className="text-sm text-red-600">
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Import More Data
            </button>
            <a
              href={`/${importType === 'engineers' ? 'users' : importType}`}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Eye className="w-4 h-4" />
              View Imported Data
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
