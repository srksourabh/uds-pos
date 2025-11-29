import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Play,
  Camera,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
  client_bank: string;
  client_name: string;
  client_contact: string | null;
  client_phone: string | null;
  client_address: string;
  latitude: number | null;
  longitude: number | null;
  scheduled_date: string;
  priority: string;
  description: string;
  started_at: string | null;
  metadata: any;
}

interface ScannedDevice {
  id: string;
  serial_number: string;
  model: string;
  action: string;
}

export default function MobileCallDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    fetchCallDetails();
  }, [id]);

  useEffect(() => {
    if (startTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime]);

  const fetchCallDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCall(data);

      if (data.started_at) {
        setStartTime(new Date(data.started_at));
      }

      const { data: callDevices } = await supabase
        .from('call_devices')
        .select('*, device:devices(*)')
        .eq('call_id', id);

      if (callDevices) {
        setScannedDevices(
          callDevices.map((cd: any) => ({
            id: cd.device.id,
            serial_number: cd.device.serial_number,
            model: cd.device.model,
            action: cd.action,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching call:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = async () => {
    if (!call || !user) return;

    setStarting(true);
    try {
      let gps: { latitude: number; longitude: number } | undefined;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true,
            });
          });
          gps = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (error) {
          console.warn('GPS not available:', error);
        }
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-call`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            call_id: call.id,
            start_gps: gps,
            start_timestamp: new Date().toISOString(),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setStartTime(new Date());
        setCall({ ...call, status: 'in_progress', started_at: result.started_at });
        alert('Call started successfully!');
      } else {
        throw new Error(result.error || 'Failed to start call');
      }
    } catch (error: any) {
      console.error('Error starting call:', error);
      alert(error.message || 'Failed to start call');
    } finally {
      setStarting(false);
    }
  };

  const handleNavigate = () => {
    if (!call || !call.latitude || !call.longitude) {
      alert('Location not available for this call');
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://?daddr=${call.latitude},${call.longitude}&q=${encodeURIComponent(call.client_name)}`
      : `geo:${call.latitude},${call.longitude}?q=${encodeURIComponent(call.client_name)}`;

    window.location.href = url;
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const canComplete = () => {
    if (!call || call.status !== 'in_progress') return false;
    if (['install', 'swap'].includes(call.type) && scannedDevices.length === 0) return false;
    if (['install', 'swap'].includes(call.type) && photos.length < 2) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading call details...</p>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Call not found</p>
          <button
            onClick={() => navigate('/mobile/calls')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to calls
          </button>
        </div>
      </div>
    );
  }

  const priorityColors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-gray-400',
  };

  const typeColors = {
    install: 'bg-blue-500',
    swap: 'bg-purple-500',
    deinstall: 'bg-gray-500',
    maintenance: 'bg-green-500',
    breakdown: 'bg-red-500',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/mobile/calls')}
            className="p-2 hover:bg-blue-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{call.call_number}</h1>
            <div className="flex gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[call.type as keyof typeof typeColors] || 'bg-gray-500'} text-white`}>
                {call.type}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${priorityColors[call.priority as keyof typeof priorityColors] || 'bg-gray-400'} text-white`}>
                {call.priority.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {call.status === 'in_progress' && startTime && (
          <div className="bg-blue-800 rounded-lg p-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Duration</span>
              <span className="text-xl font-mono font-bold">{formatElapsedTime(elapsedTime)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Client Information
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <p className="font-semibold text-gray-900">{call.client_name}</p>
            </div>
            {call.client_contact && (
              <div>
                <span className="text-gray-600">Contact:</span>
                <p className="font-semibold text-gray-900">{call.client_contact}</p>
              </div>
            )}
            {call.client_phone && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-semibold text-gray-900">{call.client_phone}</p>
                </div>
                <a
                  href={`tel:${call.client_phone}`}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg flex items-center gap-1 text-xs"
                >
                  <Phone className="w-3 h-3" />
                  Call
                </a>
              </div>
            )}
            <div>
              <span className="text-gray-600">Address:</span>
              <p className="font-semibold text-gray-900">{call.client_address}</p>
            </div>
            <div>
              <span className="text-gray-600">Scheduled:</span>
              <p className="font-semibold text-gray-900">
                {new Date(call.scheduled_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {call.description && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Description
            </h2>
            <p className="text-sm text-gray-700">{call.description}</p>
          </div>
        )}

        {call.latitude && call.longitude && (
          <button
            onClick={handleNavigate}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center gap-3 active:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Navigation className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-gray-900">Navigate to Location</h3>
              <p className="text-sm text-gray-600">Open in Maps</p>
            </div>
          </button>
        )}

        {call.status === 'in_progress' && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-bold text-gray-900 mb-3">Progress</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Devices Scanned</span>
                  <span className="font-bold text-gray-900">{scannedDevices.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Photos Taken</span>
                  <span className="font-bold text-gray-900">{photos.length}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Started At</span>
                  <span className="font-bold text-gray-900">
                    {call.started_at ? new Date(call.started_at).toLocaleTimeString() : '-'}
                  </span>
                </div>
              </div>
            </div>

            {scannedDevices.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="font-bold text-gray-900 mb-3">Scanned Devices</h2>
                <div className="space-y-2">
                  {scannedDevices.map((device) => (
                    <div key={device.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{device.serial_number}</p>
                          <p className="text-xs text-gray-600">{device.model}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {device.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2">
        {call.status === 'assigned' && (
          <button
            onClick={handleStartCall}
            disabled={starting}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 active:from-green-600 active:to-green-700 transition-all shadow-lg disabled:opacity-50"
          >
            <Play className="w-6 h-6" />
            {starting ? 'Starting...' : 'Start Call'}
          </button>
        )}

        {call.status === 'in_progress' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate(`/mobile/calls/${id}/scan`)}
                className="bg-blue-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 active:bg-blue-600 transition-colors"
              >
                <QrCode className="w-5 h-5" />
                Scan Device
              </button>
              <button
                onClick={() => navigate(`/mobile/calls/${id}/photo`)}
                className="bg-purple-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 active:bg-purple-600 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>
            </div>
            <button
              onClick={() => navigate(`/mobile/calls/${id}/complete`)}
              disabled={!canComplete()}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 active:from-green-600 active:to-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-6 h-6" />
              Complete Call
            </button>
            {!canComplete() && (
              <p className="text-xs text-center text-red-600">
                {scannedDevices.length === 0
                  ? 'Scan at least one device to continue'
                  : photos.length < 2
                  ? 'Take at least 2 photos to continue'
                  : 'Complete all requirements'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
