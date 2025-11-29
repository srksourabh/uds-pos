import { useState } from 'react';
import { Modal } from './Modal';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];

interface MarkFaultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevice: Device | null;
  onSuccess: () => void;
}

export function MarkFaultyModal({ isOpen, onClose, selectedDevice, onSuccess }: MarkFaultyModalProps) {
  const [faultDescription, setFaultDescription] = useState('');
  const [faultCategory, setFaultCategory] = useState('Hardware');
  const [severity, setSeverity] = useState<'minor' | 'major' | 'critical'>('major');
  const [requiresRepair, setRequiresRepair] = useState(true);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [createSwapCall, setCreateSwapCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!selectedDevice) return;

    if (faultDescription.length < 20) {
      alert('Fault description must be at least 20 characters');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-device-faulty`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceId: selectedDevice.id,
            faultDescription,
            faultCategory,
            severity,
            requiresRepair,
            estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
            createSwapCall: createSwapCall && selectedDevice.status === 'installed',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark device as faulty');
      }

      setResult({
        success: true,
        message: 'Device marked as faulty successfully',
        swapCallId: result.swapCallId,
      });

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
    setFaultDescription('');
    setFaultCategory('Hardware');
    setSeverity('major');
    setRequiresRepair(true);
    setEstimatedCost('');
    setCreateSwapCall(false);
    setResult(null);
    onClose();
  };

  if (!selectedDevice) return null;

  const canCreateSwapCall = selectedDevice.status === 'installed' && selectedDevice.installed_at_client;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Mark Device as Faulty" maxWidth="lg">
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Device: {selectedDevice.serial_number}</p>
              <p className="text-sm text-yellow-700 mt-1">Model: {selectedDevice.model}</p>
              <p className="text-sm text-yellow-700">Current Status: {selectedDevice.status}</p>
              {selectedDevice.installed_at_client && (
                <p className="text-sm text-yellow-700">Installed at: {selectedDevice.installed_at_client}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fault Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={faultDescription}
            onChange={(e) => setFaultDescription(e.target.value)}
            rows={4}
            placeholder="Describe the fault in detail (minimum 20 characters)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {faultDescription.length}/20 characters minimum
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fault Category <span className="text-red-500">*</span>
            </label>
            <select
              value={faultCategory}
              onChange={(e) => setFaultCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Physical Damage">Physical Damage</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity <span className="text-red-500">*</span>
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requiresRepair}
                onChange={(e) => setRequiresRepair(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Requires Repair</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost (Optional)
            </label>
            <input
              type="number"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {canCreateSwapCall && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={createSwapCall}
                onChange={(e) => setCreateSwapCall(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-blue-900">Auto-create Swap Call</span>
                <p className="text-xs text-blue-700 mt-1">
                  Since this device is installed, automatically create a swap call to replace it with a working device.
                </p>
              </div>
            </label>
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
              <div>
                <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Device Marked as Faulty' : 'Operation Failed'}
                </p>
                <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
                {result.swapCallId && (
                  <p className="text-sm text-green-700 mt-1">
                    Swap call created successfully
                  </p>
                )}
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
            onClick={handleSubmit}
            disabled={loading || !!result || faultDescription.length < 20}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {loading ? 'Processing...' : 'Mark as Faulty'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
