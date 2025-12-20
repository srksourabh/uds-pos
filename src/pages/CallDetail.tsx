import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Phone, MapPin, Clock, User, Package, CheckCircle, AlertCircle, Camera, Image as ImageIcon, Plus } from 'lucide-react';
import { PhotoUpload } from '../components/PhotoUpload';
import { PhotoGallery } from '../components/PhotoGallery';
import { getPhotoCountForCall } from '../lib/storage';

export function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  // Fetch photo count
  const refreshPhotoCount = async () => {
    if (id) {
      const count = await getPhotoCountForCall(id);
      setPhotoCount(count);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchCallDetails = async () => {
      try {
        const [callRes, devicesRes] = await Promise.all([
          supabase
            .from('calls')
            .select('*, banks!client_bank(id, code, name), user_profiles!assigned_engineer(full_name, email, phone)')
            .eq('id', id)
            .single(),
          supabase
            .from('call_devices')
            .select('*, devices(*)')
            .eq('call_id', id),
        ]);

        if (callRes.error) throw callRes.error;

        setCall(callRes.data);
        setDevices(devicesRes.data || []);
        setLoading(false);

        // Fetch photo count
        refreshPhotoCount();
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
          <h1 className="heading-2-responsive text-gray-900">{call.call_number}</h1>
          <p className="text-gray-600">{call.type || call.call_type}</p>
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

      <div className="grid-responsive-2">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="heading-3-responsive text-gray-900 border-b pb-2">Client Information</h2>

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
                <div className="font-medium text-gray-900">{call.client_contact || call.client_phone || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Address</div>
                <div className="font-medium text-gray-900">{call.client_address}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Bank</div>
                <div className="font-medium text-gray-900">{call.banks?.name || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="heading-3-responsive text-gray-900 border-b pb-2">Assignment Details</h2>

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

            {call.started_at && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Started At</div>
                  <div className="font-medium text-gray-900">
                    {new Date(call.started_at).toLocaleString()}
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
          <h2 className="heading-3-responsive text-gray-900 border-b pb-2 mb-4">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{call.description}</p>
        </div>
      )}

      {call.resolution_notes && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="heading-3-responsive text-gray-900 border-b pb-2 mb-4">Resolution Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{call.resolution_notes}</p>
        </div>
      )}

      {devices.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="heading-3-responsive text-gray-900">Devices</h2>
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
                  <td className="table-td-responsive font-medium text-gray-900">{cd.devices?.serial_number}</td>
                  <td className="table-td-responsive text-gray-600">{cd.devices?.model}</td>
                  <td className="table-td-responsive">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {cd.action}
                    </span>
                  </td>
                  <td className="table-td-responsive text-gray-600">{cd.devices?.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Photos Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gray-600" />
            <h2 className="heading-3-responsive text-gray-900">
              Photos & Evidence
            </h2>
            {photoCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {photoCount}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {photoCount > 0 && (
              <button
                onClick={() => setShowPhotoGallery(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                View All
              </button>
            )}
            <button
              onClick={() => setShowPhotoUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Add Photos</span>
              <Plus className="w-4 h-4 sm:hidden" />
            </button>
          </div>
        </div>

        {photoCount === 0 ? (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No photos uploaded yet</p>
            <button
              onClick={() => setShowPhotoUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Upload First Photo
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <button
              onClick={() => setShowPhotoGallery(true)}
              className="inline-flex items-center gap-2 px-6 py-3 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
              View {photoCount} Photo{photoCount !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <PhotoUpload
            callId={id}
            onUploadComplete={() => {
              refreshPhotoCount();
            }}
            onClose={() => setShowPhotoUpload(false)}
          />
        </div>
      )}

      {/* Photo Gallery Modal */}
      {showPhotoGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <PhotoGallery
              callId={id}
              onClose={() => setShowPhotoGallery(false)}
              showDeleteButton={true}
              onPhotoDeleted={() => {
                refreshPhotoCount();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
