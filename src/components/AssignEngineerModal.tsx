import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { AlertCircle, CheckCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Engineer = Database['public']['Tables']['user_profiles']['Row'];
type Device = Database['public']['Tables']['devices']['Row'];

interface AssignEngineerModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null;
  onSuccess: () => void;
}

export function AssignEngineerModal({ isOpen, onClose, device, onSuccess }: AssignEngineerModalProps) {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && device) {
      loadEngineers();
      setSelectedEngineer(device.assigned_to || '');
      setNotes('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, device]);

  const loadEngineers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'engineer')
      .eq('status', 'active')
      .order('full_name');

    setEngineers(data || []);
  };

  const handleAssign = async () => {
    if (!selectedEngineer || !device) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isReassignment = !!device.assigned_to;
      const oldEngineer = device.assigned_to;

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
          movement_type: isReassignment ? 'transfer' : 'issuance',
          from_status: device.status || 'warehouse',
          to_status: 'issued',
          from_engineer: isReassignment ? oldEngineer : null,
          to_engineer: selectedEngineer,
          from_location_type: isReassignment ? 'engineer' : 'warehouse',
          from_location_id: isReassignment ? oldEngineer : null,
          to_location_type: 'engineer',
          to_location_id: selectedEngineer,
          actor_id: user.id,
          reason: isReassignment ? 'Device reassigned to another engineer' : 'Device issued to engineer',
          notes: notes || '',
        });

      if (movementError) {
        console.warn('Movement record creation failed:', movementError);
      }

      setSuccess(true);

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to assign device');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedEngineer('');
    setNotes('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!device) return null;

  const currentEngineer = engineers.find(e => e.id === device.assigned_to);
  const isReassignment = !!device.assigned_to;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isReassignment ? 'Reassign Device to Engineer' : 'Assign Device to Engineer'} 
      maxWidth="lg"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Device Details</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Serial Number:</span>
                <span className="ml-2 font-medium">{device.serial_number}</span>
              </div>
              <div>
                <span className="text-gray-600">Model:</span>
                <span className="ml-2 font-medium">{device.model || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Make:</span>
                <span className="ml-2 font-medium">{device.make || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">TID:</span>
                <span className="ml-2 font-medium">{device.tid || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {isReassignment && currentEngineer && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Current Assignment</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Currently assigned to: <strong>{currentEngineer.full_name}</strong>
                  {currentEngineer.emp_id && ` (${currentEngineer.emp_id})`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isReassignment ? 'Reassign to Engineer' : 'Assign to Engineer'} <span className="text-red-500">*</span>
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
            placeholder={`Add any notes about this ${isReassignment ? 'reassignment' : 'assignment'}...`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <p className="text-sm text-green-700">
                Device {isReassignment ? 'reassigned' : 'assigned'} successfully!
              </p>
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
            onClick={handleAssign}
            disabled={!selectedEngineer || loading || success}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            <User className="w-4 h-4 mr-2" />
            {loading ? (isReassignment ? 'Reassigning...' : 'Assigning...') : (isReassignment ? 'Reassign Device' : 'Assign Device')}
          </button>
        </div>
      </div>
    </Modal>
  );
}