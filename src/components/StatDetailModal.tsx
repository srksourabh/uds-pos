import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, Edit, ArrowRightLeft, AlertTriangle, UserPlus, CheckCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

export type StatType = 
  | 'totalDevices' 
  | 'warehouseDevices' 
  | 'issuedDevices' 
  | 'installedDevices' 
  | 'faultyDevices'
  | 'activeCalls'
  | 'pendingCalls'
  | 'completedToday'
  | 'totalEngineers';

interface StatDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  statType: StatType;
  title: string;
}

interface Device {
  id: string;
  serial_number: string;
  model: string;
  brand: string;
  status: string;
  tid?: string;
  mid?: string;
  banks?: { name: string } | null;
  assigned_to?: string | null;
}

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
  priority: string;
  client_name: string;
  client_address?: string;
  scheduled_date?: string;
  assigned_engineer?: string;
  user_profiles?: { full_name: string } | null;
}

interface Engineer {
  id: string;
  full_name: string;
  employee_id?: string;
  phone?: string;
  email?: string;
  active: boolean;
  region?: string;
}

export function StatDetailModal({ isOpen, onClose, statType, title }: StatDetailModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [engineerMap, setEngineerMap] = useState<Map<string, string>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      loadData();
    }
  }, [isOpen, statType]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load engineer names for lookups
      const { data: allEngineers } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('role', 'engineer');
      
      const engMap = new Map<string, string>();
      (allEngineers || []).forEach(eng => {
        engMap.set(eng.id, eng.full_name || 'Unknown');
      });
      setEngineerMap(engMap);

      // Device-related stats
      if (['totalDevices', 'warehouseDevices', 'issuedDevices', 'installedDevices', 'faultyDevices'].includes(statType)) {
        let query = supabase
          .from('devices')
          .select(`
            id, serial_number, model, brand, status, tid, mid, assigned_to,
            banks!device_bank(name)
          `)
          .order('created_at', { ascending: false });

        // Apply status filter based on stat type
        if (statType === 'warehouseDevices') {
          query = query.eq('status', 'warehouse');
        } else if (statType === 'issuedDevices') {
          query = query.eq('status', 'issued');
        } else if (statType === 'installedDevices') {
          query = query.eq('status', 'installed');
        } else if (statType === 'faultyDevices') {
          query = query.eq('status', 'faulty');
        }

        const { data, error } = await query;
        if (error) {
          console.error('Device query error:', error);
          // Try simpler query without joins
          const { data: simpleData } = await supabase
            .from('devices')
            .select('id, serial_number, model, brand, status, tid, mid, assigned_to')
            .order('created_at', { ascending: false });
          setDevices((simpleData || []) as Device[]);
        } else {
          setDevices((data || []) as Device[]);
        }
      }

      // Call-related stats
      if (['activeCalls', 'pendingCalls', 'completedToday'].includes(statType)) {
        let query = supabase
          .from('calls')
          .select(`
            id, call_number, type, status, priority, client_name, client_address,
            scheduled_date, assigned_engineer
          `)
          .order('created_at', { ascending: false });

        if (statType === 'activeCalls') {
          query = query.in('status', ['pending', 'assigned', 'in_progress']);
        } else if (statType === 'pendingCalls') {
          query = query.eq('status', 'pending');
        } else if (statType === 'completedToday') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          query = query
            .eq('status', 'completed')
            .gte('completed_at', today.toISOString());
        }

        const { data, error } = await query;
        if (error) {
          console.error('Calls query error:', error);
        }
        setCalls((data || []) as Call[]);
      }

      // Engineers stat
      if (statType === 'totalEngineers') {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, employee_id, phone, email, active, region')
          .eq('role', 'engineer')
          .order('full_name');

        if (error) {
          console.error('Engineers query error:', error);
        }
        setEngineers((data || []) as Engineer[]);
      }
    } catch (error) {
      console.error('Error loading stat details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const getEngineerName = (id: string | undefined | null): string => {
    if (!id) return '-';
    return engineerMap.get(id) || '-';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      warehouse: 'bg-gray-100 text-gray-800',
      issued: 'bg-yellow-100 text-yellow-800',
      installed: 'bg-green-100 text-green-800',
      faulty: 'bg-red-100 text-red-800',
      pending: 'bg-orange-100 text-orange-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  // Determine which data to show
  const isDeviceStat = ['totalDevices', 'warehouseDevices', 'issuedDevices', 'installedDevices', 'faultyDevices'].includes(statType);
  const isCallStat = ['activeCalls', 'pendingCalls', 'completedToday'].includes(statType);
  const isEngineerStat = statType === 'totalEngineers';

  // Pagination
  const currentData = isDeviceStat ? devices : isCallStat ? calls : engineers;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = currentData.slice(startIndex, startIndex + itemsPerPage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {currentData.length} items • Click on any row to view details
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigate(isDeviceStat ? '/devices' : isCallStat ? '/calls' : '/engineers')}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Full Page
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Device Table */}
              {isDeviceStat && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(paginatedData as Device[]).map((device) => (
                        <tr 
                          key={device.id} 
                          className="hover:bg-gray-50 cursor-pointer transition"
                          onClick={() => handleNavigate(`/devices?search=${device.serial_number}`)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{device.serial_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{device.model}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{device.brand}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{device.banks?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(device.status)}`}>
                              {device.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{getEngineerName(device.assigned_to)}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleNavigate(`/devices?search=${device.serial_number}`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {device.status === 'warehouse' && (
                                <button
                                  onClick={() => handleNavigate(`/devices?action=issue&device=${device.id}`)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                  title="Issue Device"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>
                              )}
                              {device.status === 'issued' && (
                                <button
                                  onClick={() => handleNavigate(`/devices?action=transfer&device=${device.id}`)}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                  title="Transfer Device"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                </button>
                              )}
                              {device.status !== 'faulty' && (
                                <button
                                  onClick={() => handleNavigate(`/devices?action=faulty&device=${device.id}`)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Mark Faulty"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Call Table */}
              {isCallStat && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(paginatedData as Call[]).map((call) => (
                        <tr 
                          key={call.id} 
                          className="hover:bg-gray-50 cursor-pointer transition"
                          onClick={() => handleNavigate(`/calls?search=${call.call_number}`)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{call.call_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 capitalize">{call.type.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{call.client_name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(call.priority)}`}>
                              {call.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(call.status)}`}>
                              {call.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{getEngineerName(call.assigned_engineer)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {call.scheduled_date ? new Date(call.scheduled_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleNavigate(`/calls?search=${call.call_number}`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleNavigate(`/calls?action=edit&call=${call.id}`)}
                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                                title="Edit Call"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {call.status === 'pending' && (
                                <button
                                  onClick={() => handleNavigate(`/calls?action=assign&call=${call.id}`)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                  title="Assign Engineer"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>
                              )}
                              {call.status === 'in_progress' && (
                                <button
                                  onClick={() => handleNavigate(`/calls?action=complete&call=${call.id}`)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                  title="Mark Complete"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Engineer Table */}
              {isEngineerStat && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(paginatedData as Engineer[]).map((engineer) => (
                        <tr 
                          key={engineer.id} 
                          className="hover:bg-gray-50 cursor-pointer transition"
                          onClick={() => handleNavigate(`/engineers?search=${engineer.full_name}`)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{engineer.employee_id || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{engineer.full_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{engineer.phone || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{engineer.region || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${engineer.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {engineer.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleNavigate(`/engineers?search=${engineer.full_name}`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleNavigate(`/engineers?action=edit&engineer=${engineer.id}`)}
                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                                title="Edit Engineer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleNavigate(`/calls?action=assign&engineer=${engineer.id}`)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Assign Call"
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty State */}
              {currentData.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <p className="text-lg font-medium">No items found</p>
                  <p className="text-sm">There are no items matching this filter</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, currentData.length)} of {currentData.length} items
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
