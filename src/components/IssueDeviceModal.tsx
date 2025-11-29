import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { AlertCircle, CheckCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Engineer = Database['public']['Tables']['user_profiles']['Row'];
type Device = Database['public']['Tables']['devices']['Row'];

interface IssueDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevices: Device[];
  onSuccess: () => void;
}

export function IssueDeviceModal({ isOpen, onClose, selectedDevices, onSuccess }: IssueDeviceModalProps) {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadEngineers();
    }
  }, [isOpen, selectedDevices]);

  const loadEngineers = async () => {
    if (selectedDevices.length === 0) return;

    const bankIds = [...new Set(selectedDevices.map(d => d.device_bank))];

    const { data } = await supabase
      .from('user_profiles')
      .select('*, bank:bank_id(name, code)')
      .eq('role', 'engineer')
      .eq('status', 'active')
      .in('bank_id', bankIds)
      .order('full_name');

    setEngineers(data || []);
  };

  const handleIssue = async () => {
    if (!selectedEngineer || selectedDevices.length === 0) return;

    setLoading(true);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-device-to-engineer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceIds: selectedDevices.map(d => d.id),
            engineerId: selectedEngineer,
            notes: notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to issue devices');
      }

      setResult(result);

      if (result.success) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        errorCount: 1,
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedEngineer('');
    setNotes('');
    setResult(null);
    onClose();
  };

  const selectedEngineerData = engineers.find(e => e.id === selectedEngineer);
  const devicesByBank = selectedDevices.reduce((acc, device) => {
    const bankId = device.device_bank;
    if (!acc[bankId]) acc[bankId] = [];
    acc[bankId].push(device);
    return acc;
  }, {} as Record<string, Device[]>);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Issue Devices to Engineer" maxWidth="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Selected Devices ({selectedDevices.length})
          </h3>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-40 overflow-y-auto">
            {selectedDevices.map((device) => (
              <div key={device.id} className="px-4 py-2 text-sm">
                <span className="font-medium">{device.serial_number}</span>
                <span className="text-gray-500 ml-2">{device.model}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Engineer <span className="text-red-500">*</span>
          </label>
          {engineers.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  No active engineers found for the selected devices' banks.
                  Make sure devices are from banks that have active engineers assigned.
                </p>
              </div>
            </div>
          ) : (
            <select
              value={selectedEngineer}
              onChange={(e) => setSelectedEngineer(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Choose an engineer...</option>
              {engineers.map((engineer) => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.full_name} - {engineer.bank?.name || 'Unknown Bank'}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedEngineerData && Object.keys(devicesByBank).length > 1 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Bank Validation Warning</p>
                <p className="text-sm text-yellow-700 mt-1">
                  You've selected devices from multiple banks. Only devices matching the engineer's bank will be issued.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any notes about this issuance..."
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
              <div className="flex-1">
                <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Devices Issued Successfully' : 'Issue Completed with Errors'}
                </p>
                <div className="mt-2 text-sm space-y-1">
                  <p className="text-green-700">Issued: {result.successCount} devices</p>
                  {result.errorCount > 0 && (
                    <p className="text-red-700">Errors: {result.errorCount}</p>
                  )}
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-3 max-h-32 overflow-y-auto">
                    <p className="text-xs font-medium text-red-900 mb-1">Error Details:</p>
                    {result.errors.map((err: string, i: number) => (
                      <p key={i} className="text-xs text-red-700">{err}</p>
                    ))}
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
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleIssue}
            disabled={!selectedEngineer || loading || !!result}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            <User className="w-4 h-4 mr-2" />
            {loading ? 'Issuing...' : `Issue ${selectedDevices.length} Device${selectedDevices.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
