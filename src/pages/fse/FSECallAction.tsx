import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Phone, MapPin, Calendar, Clock, CheckCircle, AlertTriangle,
  Camera, Package, DollarSign, Save, Loader2, Navigation, Building2,
  ChevronDown, X, Plus, Trash2, Image, RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
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
  latitude?: number;
  longitude?: number;
}

interface Device {
  id: string;
  serial_number: string;
  model: string;
  make: string;
  device_condition: string;
  current_location_type: string;
}

interface Photo {
  id: string;
  photo_url: string;
  photo_type: string;
  created_at: string;
}

interface Expense {
  id: string;
  amount: number;
  reason: string;
}

type CallStatus = 'Closed' | 'Problematic' | 'Reschedule';

const PHOTO_TYPES = [
  { value: 'shop_photo', label: 'Shop Photo' },
  { value: 'merchant_photo', label: 'Merchant Photo' },
  { value: 'device_front', label: 'Device Front' },
  { value: 'device_back', label: 'Device Back' },
  { value: 'installation_proof', label: 'Installation Proof' },
  { value: 'signature', label: 'Signature' },
];

export default function FSECallAction() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [callStatus, setCallStatus] = useState<CallStatus | ''>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseReason, setNewExpenseReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [problemNotes, setProblemNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  // UI state
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activePhotoType, setActivePhotoType] = useState('');

  // Load call details
  useEffect(() => {
    const loadCall = async () => {
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
      } catch (err) {
        console.error('Error loading call:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCall();
    loadAvailableDevices();
    loadPhotos();
  }, [id]);

  // Load devices in FSE inventory (Good condition only)
  const loadAvailableDevices = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, serial_number, model, make, device_condition, current_location_type')
        .eq('assigned_to', user.id)
        .eq('current_location_type', 'engineer')
        .in('device_condition', ['good', 'new'])
        .order('serial_number');

      if (error) throw error;
      setAvailableDevices(data || []);
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  };

  // Load photos for this call
  const loadPhotos = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('call_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error loading photos:', err);
    }
  };

  // Handle photo capture
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !id || !user?.id || !activePhotoType) return;

    setUploadingPhoto(true);
    const file = e.target.files[0];

    try {
      // Create unique filename
      const ext = file.name.split('.').pop();
      const filename = `calls/${id}/${activePhotoType}_${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('call-photos')
        .upload(filename, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('call-photos')
        .getPublicUrl(filename);

      // Save to photos table
      const { error: dbError } = await supabase
        .from('photos')
        .insert({
          call_id: id,
          uploaded_by: user.id,
          photo_type: activePhotoType,
          photo_url: urlData.publicUrl,
          storage_path: filename,
        });

      if (dbError) throw dbError;

      // Reload photos
      loadPhotos();
      setActivePhotoType('');
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photo: Photo) => {
    if (!confirm('Delete this photo?')) return;

    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;
      loadPhotos();
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  // Add expense
  const handleAddExpense = () => {
    if (!newExpenseAmount || !newExpenseReason) return;

    setExpenses([
      ...expenses,
      {
        id: Date.now().toString(),
        amount: parseFloat(newExpenseAmount),
        reason: newExpenseReason,
      },
    ]);
    setNewExpenseAmount('');
    setNewExpenseReason('');
  };

  // Remove expense
  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  // Submit call update
  const handleSubmit = async () => {
    if (!callStatus || !call) {
      alert('Please select a call status');
      return;
    }

    if (callStatus === 'Reschedule' && !rescheduleDate) {
      alert('Please select a reschedule date');
      return;
    }

    if (callStatus === 'Problematic' && !problemNotes) {
      alert('Please describe the problem');
      return;
    }

    setSaving(true);

    try {
      // Map FSE status to database status
      let dbStatus = call.status;
      let subStatus = '';

      if (callStatus === 'Closed') {
        dbStatus = 'completed';
      } else if (callStatus === 'Reschedule') {
        dbStatus = 'pending';
        subStatus = 'Rescheduled';
      } else if (callStatus === 'Problematic') {
        dbStatus = 'in_progress';
        subStatus = 'Problematic';
      }

      // Update call
      const updateData: any = {
        status: dbStatus,
        sub_status: subStatus,
        resolution_notes: callStatus === 'Closed' ? resolutionNotes : problemNotes,
        updated_at: new Date().toISOString(),
      };

      if (callStatus === 'Closed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (callStatus === 'Reschedule') {
        updateData.scheduled_date = rescheduleDate;
        updateData.tentative_date = rescheduleDate;
      }

      const { error: callError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', call.id);

      if (callError) throw callError;

      // If device was used, update device status
      if (selectedDevice && callStatus === 'Closed') {
        const { error: deviceError } = await supabase
          .from('devices')
          .update({
            status: 'installed',
            current_location_type: 'merchant',
            installed_at_client: call.client_name,
            installation_date: new Date().toISOString().split('T')[0],
            installed_at_mid: call.mid,
            installation_tid: call.tid,
          })
          .eq('id', selectedDevice);

        if (deviceError) throw deviceError;

        // Create stock movement record
        await supabase.from('stock_movements').insert({
          device_id: selectedDevice,
          movement_type: 'status_change',
          from_status: 'issued',
          to_status: 'installed',
          from_location_type: 'engineer',
          to_location_type: 'merchant',
          from_engineer: user?.id,
          call_id: call.id,
          actor_id: user?.id,
          reason: `Installed at ${call.client_name}`,
          mid: call.mid,
          tid: call.tid,
        });
      }

      // Save expenses (if any) - would need an expenses table
      // For now, store in call metadata
      if (expenses.length > 0) {
        await supabase
          .from('calls')
          .update({
            metadata: {
              expenses: expenses,
            },
          })
          .eq('id', call.id);
      }

      // Record call history
      await supabase.from('call_history').insert({
        call_id: call.id,
        from_status: call.status,
        to_status: dbStatus,
        actor_id: user?.id,
        notes: callStatus === 'Closed' ? resolutionNotes : problemNotes,
      });

      alert('Call updated successfully!');
      navigate('/fse/calls');
    } catch (err) {
      console.error('Error updating call:', err);
      alert('Failed to update call');
    } finally {
      setSaving(false);
    }
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
    <div className="min-h-screen bg-gray-50 pb-24">
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
            <h1 className="text-lg font-semibold">#{call.call_number}</h1>
            <p className="text-xs text-gray-500 capitalize">{call.type} • {call.priority} Priority</p>
          </div>
          <a
            href={call.latitude && call.longitude 
              ? `https://maps.google.com/?q=${call.latitude},${call.longitude}` 
              : `https://maps.google.com/?q=${encodeURIComponent(call.client_address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-blue-600 text-white rounded-lg"
          >
            <Navigation size={20} />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Client Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Client Details</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Building2 size={16} className="text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-700">{call.client_name}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-600">{call.client_address}</span>
            </div>
            {call.client_phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                <a href={`tel:${call.client_phone}`} className="text-sm text-blue-600">
                  {call.client_phone}
                </a>
              </div>
            )}
          </div>
          {(call.mid || call.tid) && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
              {call.mid && (
                <div className="text-xs">
                  <span className="text-gray-500">MID:</span>{' '}
                  <span className="font-mono text-gray-700">{call.mid}</span>
                </div>
              )}
              {call.tid && (
                <div className="text-xs">
                  <span className="text-gray-500">TID:</span>{' '}
                  <span className="font-mono text-gray-700">{call.tid}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Call Status Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            Call Status *
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(['Closed', 'Problematic', 'Reschedule'] as CallStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setCallStatus(status)}
                className={`py-3 px-2 rounded-lg text-sm font-medium border transition-all ${
                  callStatus === status
                    ? status === 'Closed'
                      ? 'bg-green-600 text-white border-green-600'
                      : status === 'Problematic'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-orange-600 text-white border-orange-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {status === 'Closed' && <CheckCircle size={16} className="inline mr-1" />}
                {status === 'Problematic' && <AlertTriangle size={16} className="inline mr-1" />}
                {status === 'Reschedule' && <RotateCcw size={16} className="inline mr-1" />}
                {status}
              </button>
            ))}
          </div>

          {/* Reschedule Date */}
          {callStatus === 'Reschedule' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Date *
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Problem Notes */}
          {callStatus === 'Problematic' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Problem Description *
              </label>
              <textarea
                value={problemNotes}
                onChange={(e) => setProblemNotes(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Resolution Notes */}
          {callStatus === 'Closed' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Notes
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="What was done..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Device Selection (only for Closed) */}
        {callStatus === 'Closed' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Package size={18} className="text-blue-500" />
              Inventory Used
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Only devices in your inventory with "Good" condition are shown
            </p>
            
            {availableDevices.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No devices in your inventory</p>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between"
                >
                  <span className={selectedDevice ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedDevice
                      ? availableDevices.find((d) => d.id === selectedDevice)?.serial_number
                      : 'Select device...'}
                  </span>
                  <ChevronDown size={20} className="text-gray-400" />
                </button>
                
                {showDeviceDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                    <button
                      onClick={() => {
                        setSelectedDevice('');
                        setShowDeviceDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b"
                    >
                      No device used
                    </button>
                    {availableDevices.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => {
                          setSelectedDevice(device.id);
                          setShowDeviceDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{device.serial_number}</p>
                          <p className="text-xs text-gray-500">{device.make} {device.model}</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          {device.device_condition}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Photo Evidence */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Camera size={18} className="text-purple-500" />
            Photo Evidence
          </h3>

          {/* Photo Type Selection */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {PHOTO_TYPES.map((type) => {
              const existingPhoto = photos.find((p) => p.photo_type === type.value);
              return (
                <label
                  key={type.value}
                  className={`relative flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                    existingPhoto
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    onClick={() => setActivePhotoType(type.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingPhoto}
                  />
                  {existingPhoto ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <Camera size={16} className="text-gray-400" />
                  )}
                  <span className="text-xs font-medium">{type.label}</span>
                </label>
              );
            })}
          </div>

          {uploadingPhoto && (
            <div className="flex items-center gap-2 text-sm text-blue-600 mb-3">
              <Loader2 size={16} className="animate-spin" />
              Uploading...
            </div>
          )}

          {/* Photo Preview */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={photo.photo_url}
                    alt={photo.photo_type}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full"
                  >
                    <X size={12} />
                  </button>
                  <span className="absolute bottom-1 left-1 right-1 text-center text-[10px] bg-black/50 text-white rounded px-1 py-0.5 truncate">
                    {PHOTO_TYPES.find((t) => t.value === photo.photo_type)?.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign size={18} className="text-green-500" />
            Expenses
          </h3>

          {/* Add Expense */}
          <div className="flex gap-2 mb-3">
            <input
              type="number"
              placeholder="₹ Amount"
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Reason (e.g., Travel, Food)"
              value={newExpenseReason}
              onChange={(e) => setNewExpenseReason(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={handleAddExpense}
              disabled={!newExpenseAmount || !newExpenseReason}
              className="px-3 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Expense List */}
          {expenses.length > 0 && (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900">₹{expense.amount}</span>
                    <span className="text-sm text-gray-500 ml-2">{expense.reason}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveExpense(expense.id)}
                    className="text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-sm font-bold text-gray-900">
                  ₹{expenses.reduce((sum, e) => sum + e.amount, 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
        <button
          onClick={handleSubmit}
          disabled={saving || !callStatus}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {saving ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Submit Update
            </>
          )}
        </button>
      </div>
    </div>
  );
}
