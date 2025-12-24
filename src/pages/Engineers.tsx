import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Users, Phone, Mail, Upload, Download, Briefcase } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { AddEngineerModal } from '../components/AddEngineerModal';
import { EngineerCSVUpload } from '../components/EngineerCSVUpload';
import { EngineerDetailModal } from '../components/EngineerDetailModal';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  banks?: Database['public']['Tables']['banks']['Row'];
};

export function Engineers() {
  const [engineers, setEngineers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadEngineers();

    const channel = supabase
      .channel('engineers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, loadEngineers)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadEngineers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          banks!bank_id(id, name, code)
        `)
        .eq('role', 'engineer')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEngineers(data as UserProfile[]);
    } catch (error) {
      console.error('Error loading engineers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (engineer: UserProfile) => {
    setSelectedEngineer(engineer);
    setShowDetailModal(true);
  };

  const exportToCSV = () => {
    const headers = [
      'Employee ID', 'Name', 'Email', 'Phone', 'Designation', 
      'Address', 'Pincode', 'Latitude', 'Longitude', 
      'Date of Joining', 'Emergency Contact', 'Emergency Phone',
      'Referred By', 'Bank', 'Status', 'Created At'
    ];
    
    const rows = engineers.map(eng => [
      eng.employee_id || '',
      eng.full_name,
      eng.email,
      eng.phone || '',
      eng.designation || '',
      eng.address || '',
      eng.pincode || '',
      eng.latitude || '',
      eng.longitude || '',
      eng.date_of_joining || '',
      eng.emergency_contact_name || '',
      eng.emergency_contact_number || '',
      eng.referred_by || '',
      eng.banks?.name || '',
      eng.active ? 'Active' : 'Inactive',
      new Date(eng.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engineers_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEngineers = engineers.filter((engineer) =>
    engineer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    engineer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (engineer.employee_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (engineer.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-responsive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-1-responsive text-gray-900">Engineers</h1>
          <p className="text-gray-600 mt-2">Manage field service engineers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowCSVUpload(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Engineer
          </button>
        </div>
      </div>

      <div className="card-responsive mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, email, employee ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEngineers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No engineers found</p>
          </div>
        ) : (
          filteredEngineers.map((engineer) => (
            <div
              key={engineer.id}
              className="card-responsive hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {engineer.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{engineer.full_name}</h3>
                    <p className="text-xs text-gray-500">{engineer.employee_id || 'No ID'}</p>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                      engineer.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {engineer.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{engineer.email}</span>
                </div>
                {engineer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{engineer.phone}</span>
                  </div>
                )}
                {engineer.designation && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    <span>{engineer.designation}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Assigned Bank</p>
                  <p className="text-sm font-medium text-gray-900">
                    {engineer.banks?.name || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => handleViewDetails(engineer)}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredEngineers.length} of {engineers.length} engineers
        </p>
      </div>

      <AddEngineerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadEngineers();
          setShowAddModal(false);
        }}
      />

      {showCSVUpload && (
        <EngineerCSVUpload
          onComplete={(results) => {
            const successCount = results.filter(r => r.success).length;
            if (successCount > 0) {
              loadEngineers();
            }
          }}
          onClose={() => setShowCSVUpload(false)}
        />
      )}

      <EngineerDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEngineer(null);
        }}
        engineer={selectedEngineer}
      />
    </div>
  );
}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Engineer
        </button>
      </div>

      <div className="card-responsive mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEngineers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No engineers found</p>
          </div>
        ) : (
          filteredEngineers.map((engineer) => (
            <div
              key={engineer.id}
              className="card-responsive hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {engineer.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{engineer.full_name}</h3>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                      engineer.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {engineer.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{engineer.email}</span>
                </div>
                {engineer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{engineer.phone}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Assigned Bank</p>
                  <p className="text-sm font-medium text-gray-900">
                    {engineer.banks?.name || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredEngineers.length} of {engineers.length} engineers
        </p>
      </div>

      <AddEngineerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadEngineers();
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
