import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Phone, MapPin, Clock, User, Package, Image, CheckCircle, AlertCircle } from 'lucide-react';

export function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchCallDetails = async () => {
      try {
        const [callRes, devicesRes, photosRes] = await Promise.all([
          supabase
            .from('calls')
            .select('*, banks(bank_code, bank_name), user_profiles(full_name, email, phone)')
            .eq('id', id)
            .single(),
          supabase
            .from('call_devices')
            .select('*, devices(*)')
            .eq('call_id', id),
          supabase
            .from('photos')
            .select('*')
            .eq('related_call', id)
            .order('created_at', { ascending: false }),
        ]);

        if (callRes.error) throw callRes.error;

        setCall(callRes.data);
        setDevices(devicesRes.data || []);
        setPhotos(photosRes.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching call details:', error);
        setLoading(false);
      }
    };

    fetchCallDetails();

    const subscription = supabase
      .channel(`call-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls', filter: `id=eq.${id}` }, (payload) => {
        setCall(payload.new);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading call details...</p>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Call not found</p>
        <button
          onClick={() => navigate('/calls')}
          className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
        >
          Back to Calls
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/calls')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{call.call_number}</h1>
          <p className="text-gray-600">{call.call_type_display || call.call_type}</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(call.status)}`}>
            {call.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(call.priority)}`}>
            {call.priority}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Client Information</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Client Name</div>
                <div className="font-medium text-gray-900">{call.client_name}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Contact</div>
                <div className="font-medium text-gray-900">{call.client_contact}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Address</div>
                <div className="font-medium text-gray-900">{call.installation_address}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Bank</div>
                <div className="font-medium text-gray-900">{call.banks?.bank_name}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Assignment Details</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Assigned Engineer</div>
                <div className="font-medium text-gray-900">
                  {call.user_profiles?.full_name || 'Not assigned'}
                </div>
                {call.user_profiles?.email && (
                  <div className="text-sm text-gray-500">{call.user_profiles.email}</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Scheduled Date</div>
                <div className="font-medium text-gray-900">
                  {call.scheduled_date ? new Date(call.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                </div>
              </div>
            </div>

            {call.assigned_at && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Assigned At</div>
                  <div className="font-medium text-gray-900">
                    {new Date(call.assigned_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {call.completed_at && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Completed At</div>
                  <div className="font-medium text-gray-900">
                    {new Date(call.completed_at).toLocaleString()}
                  </div>
                  {call.actual_duration_minutes && (
                    <div className="text-sm text-gray-500">Duration: {call.actual_duration_minutes} minutes</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {call.description && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{call.description}</p>
        </div>
      )}

      {call.resolution_notes && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Resolution Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{call.resolution_notes}</p>
          {call.merchant_rating && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">Merchant Rating</div>
              <div className="flex gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-xl ${i < call.merchant_rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                    ★
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {devices.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Devices</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.map((cd: any) => (
                <tr key={cd.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{cd.devices?.serial_number}</td>
                  <td className="px-6 py-4 text-gray-600">{cd.devices?.model}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {cd.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{cd.devices?.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {photos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo: any) => (
              <div key={photo.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={photo.photo_url}
                  alt={photo.photo_type}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                  {photo.photo_type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
