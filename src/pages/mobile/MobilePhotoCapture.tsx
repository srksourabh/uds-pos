import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Camera, ArrowLeft, Check, X, Image as ImageIcon, Loader } from 'lucide-react';
import { capturePhoto, compressImage, getPhotoMetadata } from '../../lib/camera-utils';
import { supabase } from '../../lib/supabase';

const PHOTO_TYPES = [
  { value: 'before_installation', label: 'Before Installation', description: 'Photo of site before work begins' },
  { value: 'after_installation', label: 'After Installation', description: 'Photo showing completed installation' },
  { value: 'device_serial', label: 'Device Serial Number', description: 'Close-up of device serial number' },
  { value: 'merchant_signoff', label: 'Merchant Sign-off', description: 'Signed completion document' },
  { value: 'faulty_device', label: 'Faulty Device', description: 'Photo of damaged or faulty device' },
  { value: 'site_photo', label: 'Site Photo', description: 'General site or location photo' },
];

export default function MobilePhotoCapture() {
  const navigate = useNavigate();
  const { id: callId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get('deviceId');

  const [photoType, setPhotoType] = useState('before_installation');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');

  const handleCapture = async () => {
    const photo = await capturePhoto();
    if (photo) {
      const compressed = await compressImage(photo, 1024);
      setCapturedPhoto(compressed);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleUpload = async () => {
    if (!capturedPhoto || !callId) return;

    setUploading(true);
    try {
      const metadata = getPhotoMetadata();
      const base64Data = capturedPhoto.split(',')[1];
      const fileName = `${callId}_${photoType}_${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('call-photos')
        .upload(fileName, Buffer.from(base64Data, 'base64'), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('call-photos')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('photos')
        .insert({
          related_call: callId,
          related_device: deviceId || null,
          photo_type: photoType,
          photo_url: publicUrl,
          notes: notes || null,
          metadata: {
            ...metadata,
            file_size: Math.round(base64Data.length * 0.75),
          },
        });

      if (insertError) throw insertError;

      alert('Photo uploaded successfully!');
      navigate(`/mobile/calls/${callId}`);
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 text-white p-4 flex items-center gap-4">
        <button
          onClick={() => navigate(`/mobile/calls/${callId}`)}
          className="p-2 hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Photo Evidence</h1>
          <p className="text-sm text-gray-300">Capture and upload</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!capturedPhoto ? (
          <>
            <div className="bg-gray-800 rounded-lg p-6">
              <label className="block text-white font-medium mb-3">Photo Type</label>
              <select
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {PHOTO_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-400 mt-2">
                {PHOTO_TYPES.find(t => t.value === photoType)?.description}
              </p>
            </div>

            <button
              onClick={handleCapture}
              className="w-full bg-blue-600 text-white py-16 rounded-lg hover:bg-blue-700 active:bg-blue-800 flex flex-col items-center justify-center gap-4"
            >
              <Camera className="w-16 h-16" />
              <span className="text-xl font-semibold">Take Photo</span>
            </button>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3 text-white">
                <ImageIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Photo Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li>Ensure good lighting</li>
                    <li>Keep device/site in focus</li>
                    <li>Include relevant context</li>
                    <li>Avoid blurry images</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={capturedPhoto}
                alt="Captured"
                className="w-full h-auto"
              />
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <label className="block text-white font-medium mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this photo..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                disabled={uploading}
                className="flex-1 bg-gray-700 text-white py-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <X className="w-5 h-5" />
                Retake
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                {uploading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
