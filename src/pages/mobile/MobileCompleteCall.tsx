import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Star } from 'lucide-react';

export default function MobileCompleteCall() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [merchantRating, setMerchantRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchCallData();
  }, [id]);

  const fetchCallData = async () => {
    if (!id) return;

    try {
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (callError) throw callError;
      setCall(callData);

      const { data: callDevices, error: devicesError } = await supabase
        .from('call_devices')
        .select('*, device:devices(*)')
        .eq('call_id', id);

      if (devicesError) throw devicesError;
      setDevices(callDevices || []);

      validateCall(callData, callDevices || []);
    } catch (error) {
      console.error('Error fetching call data:', error);
    }
  };

  const validateCall = (callData: any, callDevices: any[]) => {
    const errors: string[] = [];

    if (!callData.started_at) {
      errors.push('Call not started');
    }

    if (['install', 'swap'].includes(callData.type) && callDevices.length === 0) {
      errors.push('No devices scanned');
    }

    if (callData.type === 'swap' && callDevices.length !== 2) {
      errors.push('Swap requires exactly 2 devices (swap_out + swap_in)');
    }

    setValidationErrors(errors);
  };

  const handleSubmit = async () => {
    if (!call || !id) return;

    if (resolutionNotes.length < 20) {
      alert('Resolution notes must be at least 20 characters');
      return;
    }

    if (validationErrors.length > 0) {
      alert('Please fix validation errors before submitting');
      return;
    }

    setSubmitting(true);

    try {
      const startTime = new Date(call.started_at).getTime();
      const endTime = Date.now();
      const durationMinutes = Math.floor((endTime - startTime) / 60000);

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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-call-completion`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            call_id: id,
            resolution_notes: resolutionNotes,
            actual_duration_minutes: durationMinutes,
            completion_timestamp: new Date().toISOString(),
            completion_gps: gps,
            merchant_rating: merchantRating > 0 ? merchantRating : undefined,
            devices: devices.map((d) => ({
              device_id: d.device_id,
              serial_number: d.device.serial_number,
              action: d.action,
            })),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('Call completed successfully! Great work!');
        navigate('/mobile/calls');
      } else {
        throw new Error(result.error || 'Failed to complete call');
      }
    } catch (error: any) {
      console.error('Error completing call:', error);
      alert(error.message || 'Failed to complete call');
    } finally {
      setSubmitting(false);
    }
  };

  if (!call) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const duration = call.started_at
    ? Math.floor((Date.now() - new Date(call.started_at).getTime()) / 60000)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/mobile/calls/${id}`)}
            className="p-2 hover:bg-green-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Complete Call</h1>
            <p className="text-sm text-green-100">{call.call_number}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3">Validation Checklist</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {call.started_at ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={call.started_at ? 'text-gray-700' : 'text-red-700'}>
                Call started
              </span>
            </div>
            <div className="flex items-center gap-2">
              {devices.length > 0 || !['install', 'swap'].includes(call.type) ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span
                className={
                  devices.length > 0 || !['install', 'swap'].includes(call.type)
                    ? 'text-gray-700'
                    : 'text-red-700'
                }
              >
                Device scanned ({devices.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {resolutionNotes.length >= 20 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <span
                className={
                  resolutionNotes.length >= 20 ? 'text-gray-700' : 'text-yellow-700'
                }
              >
                Resolution notes ({resolutionNotes.length}/20 characters)
              </span>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="font-semibold text-red-900 mb-2">Cannot complete call:</p>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700 flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3">Call Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Started At</span>
              <span className="font-semibold text-gray-900">
                {call.started_at
                  ? new Date(call.started_at).toLocaleTimeString()
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Duration</span>
              <span className="font-semibold text-gray-900">{duration} minutes</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Devices</span>
              <span className="font-semibold text-gray-900">{devices.length}</span>
            </div>
          </div>
        </div>

        {devices.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-bold text-gray-900 mb-3">Devices</h2>
            <div className="space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{d.device.serial_number}</p>
                      <p className="text-xs text-gray-600">{d.device.model}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {d.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3">
            Resolution Notes <span className="text-red-500">*</span>
          </h2>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Describe work completed, any issues encountered, and merchant feedback... (minimum 20 characters)"
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span
              className={`${
                resolutionNotes.length < 20
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {resolutionNotes.length}/20 characters minimum
            </span>
            <span className="text-gray-500">{resolutionNotes.length}/500</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3">
            Merchant Satisfaction <span className="text-gray-400 text-sm">(Optional)</span>
          </h2>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setMerchantRating(rating)}
                className="p-2 transition-transform active:scale-90"
              >
                <Star
                  className={`w-10 h-10 ${
                    rating <= merchantRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {merchantRating > 0 && (
            <p className="text-center text-sm text-gray-600 mt-2">
              {merchantRating === 5
                ? 'Excellent!'
                : merchantRating === 4
                ? 'Good!'
                : merchantRating === 3
                ? 'Average'
                : merchantRating === 2
                ? 'Needs Improvement'
                : 'Poor'}
            </p>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleSubmit}
          disabled={submitting || validationErrors.length > 0 || resolutionNotes.length < 20}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 active:from-green-600 active:to-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-6 h-6" />
          {submitting ? 'Submitting...' : 'Submit Completion'}
        </button>
        {(validationErrors.length > 0 || resolutionNotes.length < 20) && (
          <p className="text-xs text-center text-red-600 mt-2">
            Complete all required fields to submit
          </p>
        )}
      </div>
    </div>
  );
}
