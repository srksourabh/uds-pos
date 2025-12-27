import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import type { CallType, Priority, DeviceStatus } from '../lib/database.types';
import { Modal } from './Modal';

interface CSVRow {
  call_number?: string;
  type?: string;
  priority?: string;
  customer_name?: string;
  region?: string;
  request_date?: string;
  tid?: string;
  mid?: string;
  call_ticket?: string;
  existing_device_model?: string;
  serial_number?: string;
  sim_number?: string;
  merchant_name?: string;
  location?: string;
  city?: string;
  state?: string;
  client_address?: string;
  pincode?: string;
  contact_person_name?: string;
  contact_number?: string;
  alternate_number?: string;
  latitude?: string;
  longitude?: string;
  description?: string;
}

interface UploadResult {
  success: boolean;
  row: number;
  call_number?: string;
  error?: string;
}

interface CSVUploadProps {
  isOpen: boolean;
  onClose: () => void;
  entity: 'calls' | 'stock';
  onSuccess?: () => void;
  bankId?: string;
}

const REQUIRED_COLUMNS = ['call_number', 'type', 'customer_name', 'merchant_name', 'city', 'state', 'client_address', 'contact_person_name', 'contact_number'];
const VALID_TYPES = ['install', 'swap', 'deinstall', 'maintenance', 'breakdown'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export function CSVUpload({ isOpen, onClose, entity, onSuccess, bankId }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [banks, setBanks] = useState<{ id: string; name: string; code: string }[]>([]);

  // Load banks on mount
  useEffect(() => {
    supabase.from('banks').select('id, name, code').then(({ data }) => {
      setBanks(data || []);
    });
  }, []);

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
    if (droppedFile && droppedFile.type === 'text/csv') {
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
        const errors: string[] = [];
        const headers = results.meta.fields || [];

        // Check required columns
        REQUIRED_COLUMNS.forEach(col => {
          if (!headers.includes(col)) {
            errors.push(`Missing required column: ${col}`);
          }
        });

        // Validate data
        results.data.forEach((row, index) => {
          const rowNum = index + 2; // +2 for header and 0-index

          if (!row.call_number?.trim()) {
            errors.push(`Row ${rowNum}: Missing call_number`);
          }

          if (!row.customer_name?.trim()) {
            errors.push(`Row ${rowNum}: Missing customer_name (use bank name like HDFC, ICICI)`);
          }

          if (!row.merchant_name?.trim()) {
            errors.push(`Row ${rowNum}: Missing merchant_name`);
          }

          if (!row.client_address?.trim()) {
            errors.push(`Row ${rowNum}: Missing client_address`);
          }

          if (!row.contact_person_name?.trim()) {
            errors.push(`Row ${rowNum}: Missing contact_person_name`);
          }

          if (!row.contact_number?.trim()) {
            errors.push(`Row ${rowNum}: Missing contact_number`);
          }

          if (row.type && !VALID_TYPES.includes(row.type.toLowerCase())) {
            errors.push(`Row ${rowNum}: Invalid type "${row.type}". Must be one of: ${VALID_TYPES.join(', ')}`);
          }

          if (row.priority && !VALID_PRIORITIES.includes(row.priority.toLowerCase())) {
            errors.push(`Row ${rowNum}: Invalid priority "${row.priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`);
          }

          if (row.latitude && isNaN(parseFloat(row.latitude))) {
            errors.push(`Row ${rowNum}: Invalid latitude`);
          }

          if (row.longitude && isNaN(parseFloat(row.longitude))) {
            errors.push(`Row ${rowNum}: Invalid longitude`);
          }
        });

        setValidationErrors(errors);
        setParsedData(results.data);
        setStep('preview');
      },
      error: (error) => {
        setValidationErrors([`Parse error: ${error.message}`]);
      }
    });
  };

  const uploadCalls = async () => {
    setUploading(true);
    const uploadResults: UploadResult[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      try {
        // Validate required fields
        if (!row.call_number?.trim() || !row.merchant_name?.trim() || !row.client_address?.trim()) {
          uploadResults.push({
            success: false,
            row: i + 2,
            call_number: row.call_number || 'N/A',
            error: 'Missing required fields: call_number, merchant_name, or client_address',
          });
          continue;
        }

        // Lookup bank by customer_name (bank name or code)
        let resolvedBankId = bankId || null;
        if (row.customer_name) {
          const foundBank = banks.find(b => 
            b.name.toLowerCase() === row.customer_name!.toLowerCase() ||
            b.code.toLowerCase() === row.customer_name!.toLowerCase()
          );
          if (foundBank) {
            resolvedBankId = foundBank.id;
          }
        }

        if (!resolvedBankId) {
          uploadResults.push({
            success: false,
            row: i + 2,
            call_number: row.call_number || 'N/A',
            error: `Bank not found: "${row.customer_name}". Use bank name like HDFC, ICICI, Axis, SBI, or Kotak`,
          });
          continue;
        }

        const callData = {
          call_number: row.call_number.trim(),
          type: (row.type?.toLowerCase() || 'maintenance') as CallType,
          priority: (row.priority?.toLowerCase() || 'medium') as Priority,
          status: 'pending' as const,
          client_bank: resolvedBankId,
          customer_name: row.customer_name?.trim() || null,
          region: row.region?.trim() || null,
          request_date: row.request_date || null,
          tid: row.tid?.trim() || null,
          mid: row.mid?.trim() || null,
          call_ticket: row.call_ticket?.trim() || null,
          existing_device_model: row.existing_device_model?.trim() || null,
          serial_number: row.serial_number?.trim() || null,
          sim_number: row.sim_number?.trim() || null,
          merchant_name: row.merchant_name?.trim() || null,
          client_name: row.merchant_name?.trim() || row.customer_name?.trim() || '',
          location: row.location?.trim() || null,
          city: row.city?.trim() || null,
          state: row.state?.trim() || null,
          client_address: row.client_address?.trim() || '',
          pincode: row.pincode?.trim() || null,
          contact_person_name: row.contact_person_name?.trim() || null,
          client_contact: row.contact_person_name?.trim() || null,
          contact_number: row.contact_number?.trim() || null,
          client_phone: row.contact_number?.trim() || null,
          alternate_number: row.alternate_number?.trim() || null,
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null,
          description: row.description?.trim() || null,
          scheduled_date: row.request_date || null,
        };

        const { error } = await supabase
          .from('calls')
          .insert(callData);

        if (error) {
          uploadResults.push({
            success: false,
            row: i + 2,
            call_number: row.call_number,
            error: error.message,
          });
        } else {
          uploadResults.push({
            success: true,
            row: i + 2,
            call_number: row.call_number,
          });
        }
      } catch (err) {
        uploadResults.push({
          success: false,
          row: i + 2,
          call_number: row.call_number,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    setResults(uploadResults);
    setUploading(false);
    setStep('results');
    onSuccess?.();
  };

  const downloadTemplate = () => {
    const template = `call_number,type,priority,customer_name,region,request_date,tid,mid,call_ticket,existing_device_model,serial_number,sim_number,merchant_name,location,city,state,client_address,pincode,contact_person_name,contact_number,alternate_number,latitude,longitude,description
CALL-001,install,high,HDFC,East,2024-01-15,TID001,MID001234567890,TICKET-001,Ingenico Move5000,SN123456,9876543210,ABC Store,Main Road,Kolkata,West Bengal,123 Main Street Kolkata,700001,John Doe,9876543210,9876543211,22.5726,88.3639,New POS installation required
CALL-002,maintenance,medium,ICICI,West,2024-01-16,TID002,MID987654321098,TICKET-002,VeriFone P400,SN654321,9876543220,XYZ Mart,Park Street,Mumbai,Maharashtra,456 Park Avenue Mumbai,400001,Jane Smith,9876543220,,19.076,72.8777,Routine maintenance check`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calls_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setResults([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (step === 'results') {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="CSV Import Results">
        <div className="space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-green-700">{successCount}</div>
              <div className="text-sm text-green-600">Successful</div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-700">{failCount}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>
        </div>

        {failCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-700 mb-2">Failed Rows:</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {results.filter(r => !r.success).map((r, i) => (
                <div key={i} className="text-sm text-red-600">
                  Row {r.row} ({r.call_number}): {r.error}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </Modal>
    );
  }

  if (step === 'preview') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Preview CSV Data">
        <div className="space-y-4">

        {validationErrors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Validation Warnings ({validationErrors.length})
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {validationErrors.slice(0, 10).map((err, i) => (
                <div key={i} className="text-sm text-yellow-600">{err}</div>
              ))}
              {validationErrors.length > 10 && (
                <div className="text-sm text-yellow-600">
                  ... and {validationErrors.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Call #</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Merchant</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">City</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedData.slice(0, 20).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{row.call_number}</td>
                    <td className="px-3 py-2 text-sm capitalize">{row.type}</td>
                    <td className="px-3 py-2 text-sm">{row.customer_name}</td>
                    <td className="px-3 py-2 text-sm">{row.merchant_name}</td>
                    <td className="px-3 py-2 text-sm">{row.city}, {row.state}</td>
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
            onClick={uploadCalls}
            disabled={uploading || validationErrors.some(e => e.includes('Missing required'))}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {parsedData.length} Calls
              </>
            )}
          </button>
        </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Calls from CSV">
      <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={downloadTemplate}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-gray-600 mb-2">
          Drag and drop your CSV file here, or click to browse
        </p>
        <p className="text-sm text-gray-400">
          Supports .csv files with call data
        </p>
      </div>

      <div className="text-sm text-gray-500">
        <p className="font-medium mb-1">Required columns:</p>
        <p className="text-xs">{REQUIRED_COLUMNS.join(', ')}</p>
        <p className="font-medium mt-2 mb-1">Optional columns:</p>
        <p className="text-xs">
          priority, region, request_date, tid, mid, call_ticket, existing_device_model, 
          serial_number, sim_number, location, pincode, alternate_number, latitude, longitude, description
        </p>
        <p className="mt-2 text-xs text-blue-600">
          <strong>Note:</strong> Use bank name (HDFC, ICICI, Axis, SBI, Kotak) in customer_name column - UUIDs are not required!
        </p>
      </div>
      </div>
    </Modal>
  );
}

// ============================================================
// STOCK CSV IMPORT COMPONENT
// ============================================================

interface StockCSVRow {
  serial_number: string;
  model: string;
  device_bank?: string;
  bank_name?: string;
  status?: string;
  current_location_name?: string;
  warehouse_name?: string;
  firmware_version?: string;
  warranty_expiry?: string;
  notes?: string;
}

interface StockUploadResult {
  success: boolean;
  row: number;
  serial_number: string;
  error?: string;
}

interface StockCSVUploadProps {
  onComplete?: (results: StockUploadResult[]) => void;
  defaultBankId?: string;
  defaultWarehouseId?: string;
}

const STOCK_REQUIRED_COLUMNS = ['serial_number', 'model'];
const STOCK_VALID_STATUSES: DeviceStatus[] = ['warehouse', 'issued', 'installed', 'faulty', 'returned', 'in_transit'];

export function StockCSVUpload({ onComplete, defaultBankId, defaultWarehouseId }: StockCSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<StockCSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<StockUploadResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'results'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load banks and warehouses for mapping
  const [banks, setBanks] = useState<{ id: string; name: string; code: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [selectedBank, setSelectedBank] = useState(defaultBankId || '');
  const [selectedWarehouse, setSelectedWarehouse] = useState(defaultWarehouseId || '');

  useEffect(() => {
    Promise.all([
      supabase.from('banks').select('id, name, code'),
      supabase.from('warehouses').select('id, name')
    ]).then(([banksRes, warehousesRes]) => {
      setBanks(banksRes.data || []);
      setWarehouses(warehousesRes.data || []);
    });
  }, []);

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
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
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

    Papa.parse<StockCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        const errors: string[] = [];
        const headers = results.meta.fields || [];

        // Check required columns
        STOCK_REQUIRED_COLUMNS.forEach(col => {
          if (!headers.includes(col)) {
            errors.push(`Missing required column: ${col}`);
          }
        });

        // Validate data
        const seenSerials = new Set<string>();
        results.data.forEach((row, index) => {
          const rowNum = index + 2; // +2 for header and 0-index

          if (!row.serial_number?.trim()) {
            errors.push(`Row ${rowNum}: Missing serial_number`);
          } else if (seenSerials.has(row.serial_number.trim())) {
            errors.push(`Row ${rowNum}: Duplicate serial_number "${row.serial_number}"`);
          } else {
            seenSerials.add(row.serial_number.trim());
          }

          if (!row.model?.trim()) {
            errors.push(`Row ${rowNum}: Missing model`);
          }

          if (row.status && !STOCK_VALID_STATUSES.includes(row.status.toLowerCase() as DeviceStatus)) {
            errors.push(`Row ${rowNum}: Invalid status "${row.status}". Must be one of: ${STOCK_VALID_STATUSES.join(', ')}`);
          }

          if (row.warranty_expiry && isNaN(Date.parse(row.warranty_expiry))) {
            errors.push(`Row ${rowNum}: Invalid warranty_expiry date format`);
          }
        });

        setValidationErrors(errors);
        setParsedData(results.data);
        setStep('mapping');
      },
      error: (error) => {
        setValidationErrors([`Parse error: ${error.message}`]);
      }
    });
  };

  const uploadStock = async () => {
    if (!selectedBank) {
      alert('Please select a bank for the devices');
      return;
    }

    setUploading(true);
    const uploadResults: StockUploadResult[] = [];

    // Check for existing serial numbers
    const serialNumbers = parsedData.map(row => row.serial_number?.trim()).filter(Boolean);
    const { data: existingDevices } = await supabase
      .from('devices')
      .select('serial_number')
      .in('serial_number', serialNumbers);

    const existingSerials = new Set((existingDevices || []).map(d => d.serial_number));

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      try {
        const serialNumber = row.serial_number?.trim();
        
        if (!serialNumber || !row.model?.trim()) {
          uploadResults.push({
            success: false,
            row: i + 2,
            serial_number: serialNumber || 'N/A',
            error: 'Missing required fields: serial_number or model',
          });
          continue;
        }

        if (existingSerials.has(serialNumber)) {
          uploadResults.push({
            success: false,
            row: i + 2,
            serial_number: serialNumber,
            error: 'Device with this serial number already exists',
          });
          continue;
        }

        // Resolve bank ID - use provided bank_name/device_bank or selected bank
        let bankId = selectedBank;
        if (row.device_bank) {
          bankId = row.device_bank;
        } else if (row.bank_name) {
          const foundBank = banks.find(b => 
            b.name.toLowerCase() === row.bank_name!.toLowerCase() ||
            b.code.toLowerCase() === row.bank_name!.toLowerCase()
          );
          if (foundBank) bankId = foundBank.id;
        }

        // Resolve warehouse/location
        let location = selectedWarehouse || null;
        if (row.current_location_name) {
          location = row.current_location_name;
        } else if (row.warehouse_name) {
          const foundWarehouse = warehouses.find(w => 
            w.name.toLowerCase() === row.warehouse_name!.toLowerCase()
          );
          if (foundWarehouse) location = foundWarehouse.id;
        }

        const deviceData = {
          serial_number: serialNumber,
          model: row.model.trim(),
          device_bank: bankId,
          status: (row.status?.toLowerCase() as DeviceStatus) || 'warehouse',
          current_location_name: location,
          firmware_version: row.firmware_version?.trim() || null,
          warranty_expiry: row.warranty_expiry || null,
          notes: row.notes?.trim() || '',
          metadata: {},
        };

        const { error } = await supabase
          .from('devices')
          .insert(deviceData);

        if (error) {
          uploadResults.push({
            success: false,
            row: i + 2,
            serial_number: serialNumber,
            error: error.message,
          });
        } else {
          uploadResults.push({
            success: true,
            row: i + 2,
            serial_number: serialNumber,
          });
        }
      } catch (err) {
        uploadResults.push({
          success: false,
          row: i + 2,
          serial_number: row.serial_number || 'Unknown',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    setResults(uploadResults);
    setUploading(false);
    setStep('results');
    onComplete?.(uploadResults);
  };

  const downloadTemplate = () => {
    const template = `serial_number,model,bank_name,status,warehouse_name,firmware_version,warranty_expiry,notes
SB123456789012345,Ingenico Move5000,HDFC,warehouse,Mumbai Main,v2.1.0,2026-12-31,New device
OD987654321098765,VeriFone P400,ICICI,warehouse,Delhi Central,v1.5.2,2027-06-30,Batch import
WB456789012345678,FUJIAN K9,Axis,warehouse,Kolkata Hub,v3.0.1,2026-03-15,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setResults([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Results Step
  if (step === 'results') {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Import Results</h3>
          <button
            onClick={reset}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Import More Devices
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-green-700">{successCount}</div>
              <div className="text-sm text-green-600">Imported Successfully</div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-700">{failCount}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>
        </div>

        {failCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-700 mb-2">Failed Rows:</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {results.filter(r => !r.success).map((r, i) => (
                <div key={i} className="text-sm text-red-600">
                  Row {r.row} ({r.serial_number}): {r.error}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mapping Step - Select bank and warehouse defaults
  if (step === 'mapping') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className="font-medium">{file?.name}</span>
            <span className="text-sm text-gray-500">({parsedData.length} devices)</span>
          </div>
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Validation Warnings ({validationErrors.length})
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {validationErrors.slice(0, 10).map((err, i) => (
                <div key={i} className="text-sm text-yellow-600">{err}</div>
              ))}
              {validationErrors.length > 10 && (
                <div className="text-sm text-yellow-600">
                  ... and {validationErrors.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bank & Warehouse Selection */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-blue-800">Default Settings for Import</h4>
          <p className="text-sm text-blue-600">
            These defaults will be used for devices that don't specify their own bank or warehouse in the CSV.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Bank <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a bank...</option>
                {banks.map(bank => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} ({bank.code})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Warehouse
              </label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a warehouse...</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Serial #</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Model</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Bank</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Firmware</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedData.slice(0, 20).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-mono">{row.serial_number}</td>
                    <td className="px-3 py-2 text-sm">{row.model}</td>
                    <td className="px-3 py-2 text-sm">{row.bank_name || row.device_bank || <span className="text-gray-400 italic">default</span>}</td>
                    <td className="px-3 py-2 text-sm capitalize">{row.status || 'warehouse'}</td>
                    <td className="px-3 py-2 text-sm">{row.firmware_version || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedData.length > 20 && (
            <div className="bg-gray-50 px-3 py-2 text-sm text-gray-500 text-center">
              Showing 20 of {parsedData.length} devices
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={uploadStock}
            disabled={uploading || !selectedBank || validationErrors.some(e => e.includes('Missing required'))}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import {parsedData.length} Devices
              </>
            )}
          </button>
          <button
            onClick={() => setStep('upload')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Upload Step
  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 mb-2">
          Drag and drop your CSV file here, or{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
            browse
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </p>
        <p className="text-sm text-gray-500">
          CSV files only. Max 1000 devices per import.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <strong>Required columns:</strong> serial_number, model
          <br />
          <strong>Optional:</strong> bank_name, status, warehouse_name, firmware_version, warranty_expiry, notes
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>
    </div>
  );
}
