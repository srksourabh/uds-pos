import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ArrowRightLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];
type Engineer = Database['public']['Tables']['user_profiles']['Row'];

interface TransferDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevice: Device | null;
  onSuccess: () => void;
}

type TransferType = 'engineer_to_engineer' | 'engineer_to_warehouse' | 'warehouse_to_engineer';

export function TransferDeviceModal({ isOpen, onClose, selectedDevice, onSuccess }: TransferDeviceModalProps) {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [transferType, setTransferType] = useState<TransferType>('engineer_to_engineer');
  const [toEngineerId, setToEngineerId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && selectedDevice) {
      loadEngineers();
      autoDetectTransferType();
    }
  }, [isOpen, selectedDevice]);

  const autoDetectTransferType = () => {
    if (!selectedDevice) return;

    if (['warehouse', 'returned'].includes(selectedDevice.status)) {
      setTransferType('warehouse_to_engineer');
    } else if (['issued', 'installed'].includes(selectedDevice.status)) {
      setTransferType('engineer_to_warehouse');
    }
  };

  const loadEngineers = async () => {
    if (!selectedDevice) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('*, bank:bank_id(name, code)')
      .eq('role', 'engineer')
      .eq('status', 'active')
      .eq('bank_id', selectedDevice.device_bank)
      .order('full_name');

    setEngineers(data || []);
  };

  const handleTransfer = async () => {
    if (!selectedDevice) return;

    if (reason.length < 10) {
      alert('Reason must be at least 10 characters');
      return;
    }

    if (['engineer_to_engineer', 'warehouse_to_engineer'].includes(transferType) && !toEngineerId) {
      alert('Please select a target engineer');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transfer-device`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceId: selectedDevice.id,
            transferType,
            toEngineerId: toEngineerId || undefined,
            reason,
            notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transfer failed');
      }

      setResult({ success: true, message: result.message });

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTransferType('engineer_to_engineer');
    setToEngineerId('');
    setReason('');
    setNotes('');
    setResult(null);
    onClose();
  };

  if (!selectedDevice) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Transfer Device" maxWidth="lg">
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Device: {selectedDevice.serial_number}</p>
              <p className="text-sm text-blue-700 mt-1">Model: {selectedDevice.model}</p>
              <p className="text-sm text-blue-700">Current Status: {selectedDevice.status}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transfer Type <span className="text-red-500">*</span>
          </label>
          <select
            value={transferType}
            onChange={(e) => setTransferType(e.target.value as TransferType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="engineer_to_engineer">Engineer to Engineer</option>
            <option value="engineer_to_warehouse">Engineer to Warehouse (Return)</option>
            <option value="warehouse_to_engineer">Warehouse to Engineer (Issue)</option>
          </select>
        </div>

        {['engineer_to_engineer', 'warehouse_to_engineer'].includes(transferType) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Engineer <span className="text-red-500">*</span>
            </label>
            {engineers.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  No active engineers found for this device's bank.
                </p>
              </div>
            ) : (
              <select
                value={toEngineerId}
                onChange={(e) => setToEngineerId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Choose an engineer...</option>
                {engineers.map((engineer) => (
                  <option key={engineer.id} value={engineer.id}>
                    {engineer.full_name} - {engineer.bank?.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for transfer (minimum 10 characters)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {reason.length}/10 characters minimum
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any additional notes..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {result && (
          <div className={`border rounded-lg p-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Transfer Successful' : 'Transfer Failed'}
                </p>
                <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={loading || !!result || reason.length < 10}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            {loading ? 'Transferring...' : 'Transfer Device'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
