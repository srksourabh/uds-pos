import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Search, Building2, ArrowRight, Check, X, 
  RefreshCw, User, MapPin, Phone, Mail, AlertTriangle
} from 'lucide-react';

type Engineer = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  emp_id: string;
  status: string;
  office_id: string;
  office?: {
    id: string;
    name: string;
    code: string;
  };
};

type Office = {
  id: string;
  name: string;
  code: string;
  city: string;
};

export function EngineerTransfer() {
  const { user, profile } = useAuth();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOffice, setFilterOffice] = useState<string>('all');
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null);
  const [targetOffice, setTargetOffice] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load offices
      const { data: officesData } = await supabase
        .from('warehouses')
        .select('id, name, code, city')
        .eq('is_active', true)
        .order('name');
      
      setOffices(officesData || []);

      // Load engineers with their office info
      const { data: engineersData } = await supabase
        .from('user_profiles')
        .select(`
          id, email, full_name, phone, emp_id, status, office_id,
          office:office_id(id, name, code)
        `)
        .eq('role', 'engineer')
        .order('full_name');

      setEngineers(engineersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedEngineer || !targetOffice) return;

    setProcessing(true);
    setMessage(null);

    try {
      const targetOfficeData = offices.find(o => o.id === targetOffice);
      const fromOfficeData = selectedEngineer.office;

      // Update engineer's office
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ office_id: targetOffice })
        .eq('id', selectedEngineer.id);

      if (updateError) throw updateError;

      // Log the activity
      await supabase.from('activity_logs').insert({
        activity_type: 'engineer_transfer',
        entity_type: 'user_profiles',
        entity_id: selectedEngineer.id,
        actor_id: user?.id,
        actor_name: profile?.full_name,
        actor_role: profile?.role,
        office_id: targetOffice,
        office_name: targetOfficeData?.name,
        description: `Engineer ${selectedEngineer.full_name} (${selectedEngineer.emp_id}) transferred from ${fromOfficeData?.name || 'Unassigned'} to ${targetOfficeData?.name}`,
        old_data: { office_id: selectedEngineer.office_id, office_name: fromOfficeData?.name },
        new_data: { office_id: targetOffice, office_name: targetOfficeData?.name },
        metadata: { reason: transferReason }
      });

      // Also log to the previous office
      if (fromOfficeData) {
        await supabase.from('activity_logs').insert({
          activity_type: 'engineer_transfer',
          entity_type: 'user_profiles',
          entity_id: selectedEngineer.id,
          actor_id: user?.id,
          actor_name: profile?.full_name,
          actor_role: profile?.role,
          office_id: fromOfficeData.id,
          office_name: fromOfficeData.name,
          description: `Engineer ${selectedEngineer.full_name} (${selectedEngineer.emp_id}) transferred out to ${targetOfficeData?.name}`,
          old_data: { office_id: selectedEngineer.office_id, office_name: fromOfficeData?.name },
          new_data: { office_id: targetOffice, office_name: targetOfficeData?.name },
          metadata: { reason: transferReason }
        });
      }

      setMessage({ type: 'success', text: `${selectedEngineer.full_name} transferred to ${targetOfficeData?.name} successfully` });
      setSelectedEngineer(null);
      setTargetOffice('');
      setTransferReason('');
      setShowConfirm(false);
      loadData();
    } catch (error: any) {
      console.error('Transfer error:', error);
      setMessage({ type: 'error', text: error.message || 'Transfer failed' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredEngineers = engineers.filter(eng => {
    const matchesSearch = 
      eng.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eng.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eng.emp_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOffice = filterOffice === 'all' || eng.office_id === filterOffice;
    
    return matchesSearch && matchesOffice;
  });

  const getOfficeEngineersCount = (officeId: string) => {
    return engineers.filter(e => e.office_id === officeId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Engineer Transfer</h1>
          <p className="text-gray-600 mt-1">Transfer engineers between offices</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Office Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {offices.map(office => (
          <div 
            key={office.id}
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition ${
              filterOffice === office.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setFilterOffice(filterOffice === office.id ? 'all' : office.id)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{getOfficeEngineersCount(office.id)}</p>
                <p className="text-xs text-gray-500">{office.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, emp ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={filterOffice}
            onChange={(e) => setFilterOffice(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="all">All Offices</option>
            {offices.map(office => (
              <option key={office.id} value={office.id}>{office.name} ({getOfficeEngineersCount(office.id)})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engineers List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Engineers ({filteredEngineers.length})</h2>
          </div>

          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredEngineers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No engineers found</p>
              </div>
            ) : (
              filteredEngineers.map(engineer => (
                <div 
                  key={engineer.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                    selectedEngineer?.id === engineer.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedEngineer(engineer);
                    setTargetOffice('');
                    setShowConfirm(false);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{engineer.full_name}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {engineer.emp_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {engineer.email}
                        </span>
                        {engineer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {engineer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        engineer.office ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {engineer.office?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transfer Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Transfer Engineer</h2>
          </div>

          <div className="p-6">
            {selectedEngineer ? (
              <div className="space-y-6">
                {/* Selected Engineer */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium mb-1">Selected Engineer</p>
                  <p className="font-semibold text-gray-900">{selectedEngineer.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedEngineer.emp_id}</p>
                </div>

                {/* Current Office */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Current Office</p>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {selectedEngineer.office?.name || 'Not Assigned'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </div>

                {/* Target Office */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer To
                  </label>
                  <select
                    value={targetOffice}
                    onChange={(e) => {
                      setTargetOffice(e.target.value);
                      setShowConfirm(false);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select Office</option>
                    {offices
                      .filter(o => o.id !== selectedEngineer.office_id)
                      .map(office => (
                        <option key={office.id} value={office.id}>
                          {office.name} ({office.code})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Transfer Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="Enter reason for transfer..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Confirm Warning */}
                {showConfirm && targetOffice && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Confirm Transfer</p>
                        <p className="text-sm text-amber-700 mt-1">
                          This will transfer <strong>{selectedEngineer.full_name}</strong> to{' '}
                          <strong>{offices.find(o => o.id === targetOffice)?.name}</strong>.
                          All their stock and calls will need to be reassigned.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {showConfirm ? (
                    <>
                      <button
                        onClick={handleTransfer}
                        disabled={processing || !targetOffice}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        {processing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Confirm Transfer
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowConfirm(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={!targetOffice}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Transfer
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Select an engineer to transfer</p>
                <p className="text-sm text-gray-400 mt-1">Click on an engineer from the list</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
