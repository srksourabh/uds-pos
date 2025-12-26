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
      setSelectedEngineer('');
      setNotes('');
      setResult(null);
    }
  }, [isOpen]);

  const loadEngineers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'engineer')
      .eq('status', 'active')
      .order('full_name');

    setEngineers(data || []);
  };

  const handleIssue = async () => {
    if (!selectedEngineer || selectedDevices.length === 0) return;

    setLoading(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const device of selectedDevices) {
        try {
          // Update device assignment
          const { error: updateError } = await supabase
            .from('devices')
            .update({
              assigned_to: selectedEngineer,
              whereabouts: 'engineer',
              status: 'issued',
              current_location_type: 'engineer',
              current_location_id: selectedEngineer,
              updated_at: new Date().toISOString(),
              updated_by: user.id,
            })
            .eq('id', device.id);

          if (updateError) throw updateError;

          // Create stock movement record
          const { error: movementError } = await supabase
            .from('stock_movements')
            .insert({
              device_id: device.id,
              movement_type: 'issuance',
              from_status: device.status || 'warehouse',
              to_status: 'issued',
              to_engineer: selectedEngineer,
              from_location_type: 'warehouse',
              from_location_name: 'Main Warehouse',
              to_location_type: 'engineer',
              to_location_id: selectedEngineer,
              actor_id: user.id,
              reason: 'Device issued to engineer',
              notes: notes || '',
            });

          if (movementError) {
            console.warn('Movement record creation failed:', movementError);
            // Don't fail the whole operation if movement record fails
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`${device.serial_number}: ${error.message}`);
        }
      }

      setResult({
        success: errorCount === 0,
        successCount,
        errorCount,
        errors: errors.slice(0, 10),
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
                  No active engineers found. Please ensure there are active engineers in the system.
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
                  {engineer.full_name} {engineer.emp_id ? `(${engineer.emp_id})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

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
            disabled={!selectedEngineer || loading || (result && result.success)}
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