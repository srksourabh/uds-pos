import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import { User, Phone, MapPin } from 'lucide-react';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface AssignCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  callId: string;
  callNumber: string;
  currentEngineerId?: string | null;
}

export function AssignCallModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  callId, 
  callNumber,
  currentEngineerId 
}: AssignCallModalProps) {
  const [engineers, setEngineers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEngineers();
      setSelectedEngineerId(currentEngineerId || '');
    }
  }, [isOpen, currentEngineerId]);

  const loadEngineers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'engineer')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;
      setEngineers(data || []);
    } catch (error) {
      console.error('Error loading engineers:', error);
    }
  };

  const filteredEngineers = engineers.filter(eng => 
    eng.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (eng.employee_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (eng.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEngineerId) {
      alert('Please select an engineer');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('calls')
        .update({
          assigned_engineer: selectedEngineerId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) throw error;

      // Log the assignment in call history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('call_history')
          .insert({
            call_id: callId,
            from_status: 'pending',
            to_status: 'assigned',
            actor_id: user.id,
            notes: `Assigned to engineer`
          });
      }

      onSuccess();
    } catch (error: any) {
      alert(`Error assigning call: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Call: ${callNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Engineers
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search by name, ID, or phone..."
          />
        </div>

        <div className="border rounded-lg max-h-80 overflow-y-auto">
          {filteredEngineers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No engineers found
            </div>
          ) : (
            filteredEngineers.map((engineer) => (
              <div
                key={engineer.id}
                onClick={() => setSelectedEngineerId(engineer.id)}
                className={`p-3 border-b last:border-b-0 cursor-pointer transition ${
                  selectedEngineerId === engineer.id 
                    ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm">
                      {engineer.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 truncate">{engineer.full_name}</h4>
                      {engineer.id === currentEngineerId && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {engineer.employee_id || 'No ID'}
                      </span>
                      {engineer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {engineer.phone}
                        </span>
                      )}
                    </div>
                    {engineer.region && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPin className="w-3 h-3" />
                        {engineer.region}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="radio"
                      name="engineer"
                      checked={selectedEngineerId === engineer.id}
                      onChange={() => setSelectedEngineerId(engineer.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedEngineerId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Assigning...' : 'Assign Call'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
