import { useState, useEffect } from 'react';
import { X, Upload, Download, Search, User, Truck, Check, AlertCircle, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeviceAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Engineer {
  id: string;
  full_name: string;
  employee_id: string | null;
  phone: string | null;
  region: string | null;
}

interface DeviceRow {
  serial_number: string;
  status: 'valid' | 'invalid' | 'pending';
  message: string;
  device_id?: string;
}

type AllocationMode = 'single' | 'bulk';
type AllocationTarget = 'engineer' | 'warehouse' | 'intransit';

export function DeviceAllocationModal({ isOpen, onClose, onSuccess }: DeviceAllocationModalProps) {
  const [mode, setMode] = useState<AllocationMode>('single');
  const [target, setTarget] = useState<AllocationTarget>('engineer');
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [singleSerialNumber, setSingleSerialNumber] = useState('');
  const [deviceRows, setDeviceRows] = useState<DeviceRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  useEffect(() => {
    if (isOpen) {
      loadEngineers();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setMode('single');
    setTarget('engineer');
    setStep('select');
    setSelectedEngineer('');
    setSearchTerm('');
    setSingleSerialNumber('');
    setDeviceRows([]);
    setResults({ success: 0, failed: 0 });
  };

  const loadEngineers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, employee_id, phone, region')
        .eq('role', 'engineer')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setEngineers(data || []);
    } catch (error) {
      console.error('Error loading engineers:', error);
    }
  };

  const filteredEngineers = engineers.filter(eng => {
    const search = searchTerm.toLowerCase();
    return (
      (eng.full_name || '').toLowerCase().includes(search) ||
      (eng.employee_id || '').toLowerCase().includes(search) ||
      (eng.phone || '').toLowerCase().includes(search)
    );
  });

  const downloadTemplate = () => {
    const headers = ['serial_number'];
    const sampleData = [
      ['DEVICE001'],
      ['DEVICE002'],
      ['DEVICE003'],
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'device_allocation_template.csv';
    link.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    const rows: DeviceRow[] = [];
    for (const line of dataLines) {
      const serialNumber = line.replace(/"/g, '').trim();
      if (serialNumber) {
        rows.push({
          serial_number: serialNumber,
          status: 'pending',
          message: 'Validating...'
        });
      }
    }

    // Validate devices
    await validateDevices(rows);
  };

  const validateDevices = async (rows: DeviceRow[]) => {
    const serialNumbers = rows.map(r => r.serial_number);
    
    try {
      const { data: devices, error } = await supabase
        .from('devices')
        .select('id, serial_number, status, whereabouts')
        .in('serial_number', serialNumbers);

      if (error) throw error;

      const deviceMap = new Map(devices?.map(d => [d.serial_number, d]) || []);

      const validatedRows = rows.map(row => {
        const device = deviceMap.get(row.serial_number);
        if (!device) {
          return { ...row, status: 'invalid' as const, message: 'Device not found' };
        }
        
        // Check if device can be allocated
        if (target === 'engineer' && device.status === 'installed') {
          return { ...row, status: 'invalid' as const, message: 'Device already installed', device_id: device.id };
        }
        
        return { ...row, status: 'valid' as const, message: 'Ready to allocate', device_id: device.id };
      });

      setDeviceRows(validatedRows);
      setStep('preview');
    } catch (error) {
      console.error('Error validating devices:', error);
    }
  };

  const handleSingleDeviceValidation = async () => {
    if (!singleSerialNumber.trim()) return;

    const rows: DeviceRow[] = [{
      serial_number: singleSerialNumber.trim(),
      status: 'pending',
      message: 'Validating...'
    }];

    await validateDevices(rows);
  };

  const processAllocation = async () => {
    setProcessing(true);
    let successCount = 0;
    let failedCount = 0;

    const validDevices = deviceRows.filter(r => r.status === 'valid' && r.device_id);

    for (const device of validDevices) {
      try {
        let updateData: Record<string, unknown> = {};

        if (target === 'engineer') {
          updateData = {
            assigned_to: selectedEngineer,
            status: 'issued',
            whereabouts: 'engineer',
            updated_at: new Date().toISOString()
          };
        } else if (target === 'warehouse') {
          updateData = {
            assigned_to: null,
            status: 'warehouse',
            whereabouts: 'warehouse',
            updated_at: new Date().toISOString()
          };
        } else if (target === 'intransit') {
          updateData = {
            status: 'in_transit',
            whereabouts: 'intransit',
            updated_at: new Date().toISOString()
          };
        }

        const { error } = await supabase
          .from('devices')
          .update(updateData)
          .eq('id', device.device_id);

        if (error) throw error;

        // Log the movement
        await supabase.from('stock_movements').insert({
          device_id: device.device_id,
          from_location: 'Previous Location',
          to_location: target === 'engineer' ? `Engineer: ${selectedEngineer}` : target,
          movement_type: 'transfer',
          notes: `Bulk allocation via Device Allocation Modal`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

        successCount++;
      } catch (error) {
        console.error(`Error allocating device ${device.serial_number}:`, error);
        failedCount++;
      }
    }

    setResults({ success: successCount, failed: failedCount });
    setStep('result');
    setProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Allocate Devices</h2>
            <p className="text-sm text-gray-600 mt-1">Transfer devices to engineer, warehouse, or in-transit</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div className="space-y-6">
              {/* Allocation Target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocate To</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTarget('engineer')}
                    className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                      target === 'engineer' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <User className={`w-6 h-6 ${target === 'engineer' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${target === 'engineer' ? 'text-blue-600' : 'text-gray-600'}`}>
                      Engineer
                    </span>
                  </button>
                  <button
                    onClick={() => setTarget('warehouse')}
                    className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                      target === 'warehouse' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Package className={`w-6 h-6 ${target === 'warehouse' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${target === 'warehouse' ? 'text-blue-600' : 'text-gray-600'}`}>
                      Warehouse
                    </span>
                  </button>
                  <button
                    onClick={() => setTarget('intransit')}
                    className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                      target === 'intransit' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Truck className={`w-6 h-6 ${target === 'intransit' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${target === 'intransit' ? 'text-blue-600' : 'text-gray-600'}`}>
                      In Transit
                    </span>
                  </button>
                </div>
              </div>

              {/* Engineer Selection (only if target is engineer) */}
              {target === 'engineer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Engineer *</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search engineers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredEngineers.length === 0 ? (
                      <p className="p-4 text-center text-gray-500 text-sm">No engineers found</p>
                    ) : (
                      filteredEngineers.map(eng => (
                        <label
                          key={eng.id}
                          className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            selectedEngineer === eng.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="engineer"
                            value={eng.id}
                            checked={selectedEngineer === eng.id}
                            onChange={() => setSelectedEngineer(eng.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{eng.full_name}</p>
                            <p className="text-xs text-gray-500">
                              {eng.employee_id} • {eng.phone || 'No phone'} • {eng.region || 'No region'}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('single')}
                    className={`p-4 rounded-lg border-2 transition ${
                      mode === 'single' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${mode === 'single' ? 'text-blue-600' : 'text-gray-600'}`}>
                      Single Device
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Enter one serial number</p>
                  </button>
                  <button
                    onClick={() => setMode('bulk')}
                    className={`p-4 rounded-lg border-2 transition ${
                      mode === 'bulk' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${mode === 'bulk' ? 'text-blue-600' : 'text-gray-600'}`}>
                      Bulk Import
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Upload CSV file</p>
                  </button>
                </div>
              </div>

              {/* Single Device Input */}
              {mode === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number *</label>
                  <input
                    type="text"
                    value={singleSerialNumber}
                    onChange={(e) => setSingleSerialNumber(e.target.value)}
                    placeholder="Enter device serial number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              {/* Bulk Upload */}
              {mode === 'bulk' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Upload CSV File</label>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">Drop your CSV file here or click to browse</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition text-sm"
                    >
                      Select File
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Preview Allocation</h3>
                <div className="flex gap-2 text-sm">
                  <span className="text-green-600">{deviceRows.filter(r => r.status === 'valid').length} valid</span>
                  <span className="text-red-600">{deviceRows.filter(r => r.status === 'invalid').length} invalid</span>
                </div>
              </div>

              {target === 'engineer' && selectedEngineer && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Allocating to:</strong> {engineers.find(e => e.id === selectedEngineer)?.full_name}
                  </p>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Serial Number</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deviceRows.map((row, idx) => (
                      <tr key={idx} className={row.status === 'invalid' ? 'bg-red-50' : ''}>
                        <td className="px-4 py-2 font-mono">{row.serial_number}</td>
                        <td className="px-4 py-2">
                          {row.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check className="w-4 h-4" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <AlertCircle className="w-4 h-4" /> Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="text-center py-8">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                results.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {results.failed === 0 ? (
                  <Check className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Allocation Complete</h3>
              <p className="text-gray-600 mb-4">
                Successfully allocated {results.success} device{results.success !== 1 ? 's' : ''}
                {results.failed > 0 && `, ${results.failed} failed`}
              </p>
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'result' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={step === 'select' ? onClose : () => setStep('select')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              {step === 'select' ? 'Cancel' : 'Back'}
            </button>
            
            {step === 'select' && (
              <button
                onClick={mode === 'single' ? handleSingleDeviceValidation : undefined}
                disabled={
                  (target === 'engineer' && !selectedEngineer) ||
                  (mode === 'single' && !singleSerialNumber.trim())
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === 'single' ? 'Validate & Preview' : 'Upload CSV to Continue'}
              </button>
            )}
            
            {step === 'preview' && (
              <button
                onClick={processAllocation}
                disabled={processing || deviceRows.filter(r => r.status === 'valid').length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Allocate {deviceRows.filter(r => r.status === 'valid').length} Devices
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
