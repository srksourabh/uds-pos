import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { XCircle, X } from 'lucide-react';

interface CancelCallModalProps {
  callId: string;
  callNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelCallModal({ callId, callNumber, isOpen, onClose, onSuccess }: CancelCallModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert('Cancellation reason is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('calls')
        .update({
          status: 'cancelled',
          cancellation_reason: reason.trim(),
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (error) throw error;

      onSuccess();
      onClose();
      setReason('');
    } catch (error: any) {
      console.error('Error cancelling call:', error);
      alert('Failed to cancel call: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Cancel Call</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
              disabled={loading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              You are cancelling call <strong>{callNumber}</strong>. This action will update the call status to cancelled.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              placeholder="Please provide a reason for cancelling this call..."
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              This reason will be recorded and visible in the call history.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Go Back
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2"
              disabled={loading || !reason.trim()}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {loading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
