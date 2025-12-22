import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Phone, MapPin, Calendar, Clock, CheckCircle, 
  Navigation, Building2, FileText, Camera, Tag, AlertCircle,
  Loader2, User, Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
  sub_status?: string;
  priority: string;
  client_name: string;
  client_address: string;
  client_phone?: string;
  city?: string;
  scheduled_date: string;
  mid?: string;
  tid?: string;
  problem_code?: string;
  description?: string;
  ageing?: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  completed_at?: string;
  resolution_notes?: string;
  institution?: string;
  branchname?: string;
  zone_name?: string;
}

interface Photo {
  id: string;
  photo_url: string;
  photo_type: string;
  created_at: string;
}

interface HistoryEntry {
  id: string;
  from_status: string;
  to_status: string;
  notes?: string;
  created_at: string;
  actor_name?: string;
}

export default function FSECallDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [call, setCall] = useState<Call | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Load call
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select('*')
          .eq('id', id)
          .single();

        if (callError) throw callError;
        setCall(callData);

        // Load photos
        const { data: photosData } = await supabase
          .from('photos')
          .select('*')
          .eq('call_id', id)
          .order('created_at', { ascending: false });

        setPhotos(photosData || []);

        // Load history
        const { data: historyData } = await supabase
          .from('call_history')
          .select('*')
          .eq('call_id', id)
          .order('created_at', { ascending: false });

        setHistory(historyData || []);
      } catch (err) {
        console.error('Error loading call:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'assigned': return 'bg-purple-100 text-purple-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'install': return '🔧';
      case 'swap': return '🔄';
      case 'deinstall': return '📦';
      case 'maintenance': return '🛠️';
      case 'breakdown': return '⚠️';
      default: return '📋';
    }
  };

  const getPhotoTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'shop_photo': 'Shop Photo',
      'merchant_photo': 'Merchant Photo',
      'device_front': 'Device Front',
      'device_back': 'Device Back',
      'installation_proof': 'Installation Proof',
      'signature': 'Signature',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Call not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/fse/calls')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getCallTypeIcon(call.type)}</span>
              <h1 className="text-lg font-semibold">#{call.call_number}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(call.priority)}`}>
                {call.priority}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                {call.status?.replace('_', ' ')}
              </span>
              {call.sub_status && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {call.sub_status}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Read-Only Notice */}
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600">
            {call.status === 'completed' 
              ? 'This call has been completed - view only'
              : 'This call is not scheduled for today - view only'}
          </span>
        </div>

        {/* Client Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Building2 size={18} className="text-blue-500" />
            Client Details
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Client Name</label>
              <p className="text-sm font-medium text-gray-900">{call.client_name}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Address</label>
              <p className="text-sm text-gray-700">{call.client_address}</p>
              {(call.latitude && call.longitude) && (
                <a
                  href={`https://maps.google.com/?q=${call.latitude},${call.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1"
                >
                  <Navigation size={12} />
                  Open in Maps
                </a>
              )}
            </div>
            {call.city && (
              <div>
                <label className="text-xs text-gray-500">City</label>
                <p className="text-sm text-gray-700">{call.city}</p>
              </div>
            )}
            {call.client_phone && (
              <div>
                <label className="text-xs text-gray-500">Contact</label>
                <a href={`tel:${call.client_phone}`} className="flex items-center gap-2 text-sm text-blue-600">
                  <Phone size={14} />
                  {call.client_phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Call Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-purple-500" />
            Call Details
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Type</label>
              <p className="text-sm font-medium text-gray-900 capitalize">{call.type}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Scheduled Date</label>
              <p className="text-sm text-gray-700">{format(parseISO(call.scheduled_date), 'dd MMM yyyy')}</p>
            </div>
            {call.mid && (
              <div>
                <label className="text-xs text-gray-500">MID</label>
                <p className="text-sm font-mono text-gray-700">{call.mid}</p>
              </div>
            )}
            {call.tid && (
              <div>
                <label className="text-xs text-gray-500">TID</label>
                <p className="text-sm font-mono text-gray-700">{call.tid}</p>
              </div>
            )}
            {call.problem_code && (
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Problem Code</label>
                <p className="text-sm text-gray-700">{call.problem_code}</p>
              </div>
            )}
            {call.ageing && call.ageing > 0 && (
              <div>
                <label className="text-xs text-gray-500">Ageing</label>
                <p className="text-sm text-orange-600 font-medium">{call.ageing} days</p>
              </div>
            )}
            {call.institution && (
              <div>
                <label className="text-xs text-gray-500">Institution</label>
                <p className="text-sm text-gray-700">{call.institution}</p>
              </div>
            )}
            {call.branchname && (
              <div>
                <label className="text-xs text-gray-500">Branch</label>
                <p className="text-sm text-gray-700">{call.branchname}</p>
              </div>
            )}
          </div>
          {call.description && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <label className="text-xs text-gray-500">Description</label>
              <p className="text-sm text-gray-700">{call.description}</p>
            </div>
          )}
        </div>

        {/* Resolution (if completed) */}
        {call.status === 'completed' && (
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <h3 className="font-medium text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              Resolution
            </h3>
            <div className="space-y-2">
              {call.completed_at && (
                <div>
                  <label className="text-xs text-green-700">Completed On</label>
                  <p className="text-sm text-green-900">{format(parseISO(call.completed_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
              )}
              {call.resolution_notes && (
                <div>
                  <label className="text-xs text-green-700">Notes</label>
                  <p className="text-sm text-green-800">{call.resolution_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Camera size={18} className="text-orange-500" />
              Photos ({photos.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative aspect-square cursor-pointer"
                >
                  <img
                    src={photo.photo_url}
                    alt={photo.photo_type}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <span className="absolute bottom-1 left-1 right-1 text-center text-[10px] bg-black/50 text-white rounded px-1 py-0.5 truncate">
                    {getPhotoTypeLabel(photo.photo_type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Clock size={18} className="text-gray-500" />
              Status History
            </h3>
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    {index < history.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{entry.from_status}</span>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="text-xs font-medium text-gray-700">{entry.to_status}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-600 mt-1">{entry.notes}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {format(parseISO(entry.created_at), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto.photo_url}
            alt={selectedPhoto.photo_type}
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute top-4 left-4 text-white">
            <p className="text-sm font-medium">{getPhotoTypeLabel(selectedPhoto.photo_type)}</p>
            <p className="text-xs text-gray-300">
              {format(parseISO(selectedPhoto.created_at), 'dd MMM yyyy HH:mm')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
