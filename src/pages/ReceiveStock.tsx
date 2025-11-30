import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Scan, Plus, Package, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Bank = Database['public']['Tables']['banks']['Row'];

interface ScannedDevice {
  serial_number: string;
  model: string;
  source_bank_id: string;
  source_bank_name: string;
  status: 'pending' | 'success' | 'error';
  error_message?: string;
}

export function ReceiveStock() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [currentScan, setCurrentScan] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState<'barcode' | 'manual'>('barcode');
  const [manualEntry, setManualEntry] = useState({
    serial_number: '',
    model: '',
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBanks();
    if (scanMode === 'barcode' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBanks(data);
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentScan.trim()) {
      await processBarcode(currentScan.trim());
      setCurrentScan('');
    }
  };

  const processBarcode = async (barcode: string) => {
    if (!selectedBank) {
      alert('Please select a source bank/customer first');
      return;
    }

    const bank = banks.find(b => b.id === selectedBank);
    if (!bank) return;

    const newDevice: ScannedDevice = {
      serial_number: barcode,
      model: 'To be determined',
      source_bank_id: selectedBank,
      source_bank_name: bank.name,
      status: 'pending',
    };

    setScannedDevices(prev => [newDevice, ...prev]);

    try {
      const { data: existing, error: checkError } = await supabase
        .from('devices')
        .select('id')
        .eq('serial_number', barcode)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        setScannedDevices(prev => prev.map(d =>
          d.serial_number === barcode
            ? { ...d, status: 'error', error_message: 'Device already exists in system' }
            : d
        ));
        return;
      }

      setScannedDevices(prev => prev.map(d =>
        d.serial_number === barcode
          ? { ...d, status: 'success' }
          : d
      ));
    } catch (error: any) {
      setScannedDevices(prev => prev.map(d =>
        d.serial_number === barcode
          ? { ...d, status: 'error', error_message: error.message }
          : d
      ));
    }
  };

  const handleManualAdd = () => {
    if (!selectedBank || !manualEntry.serial_number || !manualEntry.model) {
      alert('Please fill in all required fields');
      return;
    }

    const bank = banks.find(b => b.id === selectedBank);
    if (!bank) return;

    const newDevice: ScannedDevice = {
      serial_number: manualEntry.serial_number,
      model: manualEntry.model,
      source_bank_id: selectedBank,
      source_bank_name: bank.name,
      status: 'pending',
    };

    setScannedDevices(prev => [newDevice, ...prev]);
    setManualEntry({ serial_number: '', model: '' });

    setTimeout(async () => {
      try {
        const { data: existing, error: checkError } = await supabase
          .from('devices')
          .select('id')
          .eq('serial_number', manualEntry.serial_number)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
          setScannedDevices(prev => prev.map(d =>
            d.serial_number === manualEntry.serial_number
              ? { ...d, status: 'error', error_message: 'Device already exists in system' }
              : d
          ));
          return;
        }

        setScannedDevices(prev => prev.map(d =>
          d.serial_number === manualEntry.serial_number
            ? { ...d, status: 'success' }
            : d
        ));
      } catch (error: any) {
        setScannedDevices(prev => prev.map(d =>
          d.serial_number === manualEntry.serial_number
            ? { ...d, status: 'error', error_message: error.message }
            : d
        ));
      }
    }, 100);
  };

  const handleReceiveAll = async () => {
    const successDevices = scannedDevices.filter(d => d.status === 'success');
    if (successDevices.length === 0) {
      alert('No valid devices to receive');
      return;
    }

    setLoading(true);

    try {
      const devicesToInsert = successDevices.map(d => ({
        serial_number: d.serial_number,
        model: d.model,
        device_bank: d.source_bank_id,
        status: 'warehouse',
        current_location: 'warehouse',
        metadata: {
          received_from: d.source_bank_name,
          received_at: new Date().toISOString(),
        },
      }));

      const { error } = await supabase
        .from('devices')
        .insert(devicesToInsert);

      if (error) throw error;

      alert(`Successfully received ${successDevices.length} devices`);
      setScannedDevices([]);
    } catch (error: any) {
      alert(`Error receiving devices: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = (serialNumber: string) => {
    setScannedDevices(prev => prev.filter(d => d.serial_number !== serialNumber));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Receive Stock</h1>
        <p className="text-gray-600 mt-2">Scan or manually add devices from banks/customers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Source & Scanning</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Bank/Customer *
            </label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select source bank/customer</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name} ({bank.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setScanMode('barcode')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                scanMode === 'barcode'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Scan className="w-5 h-5 mx-auto mb-1" />
              Barcode Scanner
            </button>
            <button
              onClick={() => setScanMode('manual')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                scanMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-5 h-5 mx-auto mb-1" />
              Manual Entry
            </button>
          </div>

          {scanMode === 'barcode' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan Barcode
              </label>
              <input
                ref={inputRef}
                type="text"
                value={currentScan}
                onChange={(e) => setCurrentScan(e.target.value)}
                onKeyDown={handleBarcodeInput}
                placeholder="Focus here and scan barcode..."
                disabled={!selectedBank}
                className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono disabled:bg-gray-100"
              />
              <p className="text-sm text-gray-500 mt-2">
                Keep this field focused and scan barcodes. Press Enter after each scan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serial Number *
                </label>
                <input
                  type="text"
                  value={manualEntry.serial_number}
                  onChange={(e) => setManualEntry({ ...manualEntry, serial_number: e.target.value })}
                  placeholder="SN123456789"
                  disabled={!selectedBank}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model *
                </label>
                <input
                  type="text"
                  value={manualEntry.model}
                  onChange={(e) => setManualEntry({ ...manualEntry, model: e.target.value })}
                  placeholder="PAX S920"
                  disabled={!selectedBank}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <button
                onClick={handleManualAdd}
                disabled={!selectedBank || !manualEntry.serial_number || !manualEntry.model}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Add Device
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-700">Total Scanned</span>
              <span className="text-lg font-bold text-blue-600">{scannedDevices.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-700">Ready to Receive</span>
              <span className="text-lg font-bold text-green-600">
                {scannedDevices.filter(d => d.status === 'success').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-gray-700">Errors</span>
              <span className="text-lg font-bold text-red-600">
                {scannedDevices.filter(d => d.status === 'error').length}
              </span>
            </div>
          </div>

          <button
            onClick={handleReceiveAll}
            disabled={loading || scannedDevices.filter(d => d.status === 'success').length === 0}
            className="w-full mt-6 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
          >
            {loading ? 'Receiving...' : 'Receive All Devices'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Scanned Devices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {scannedDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No devices scanned yet</p>
                  </td>
                </tr>
              ) : (
                scannedDevices.map((device, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">{device.serial_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {device.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{device.source_bank_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {device.status === 'success' ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ready
                        </span>
                      ) : device.status === 'error' ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                          Validating...
                        </span>
                      )}
                      {device.error_message && (
                        <p className="text-xs text-red-600 mt-1">{device.error_message}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleRemoveDevice(device.serial_number)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
