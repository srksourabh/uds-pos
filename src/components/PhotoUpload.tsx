import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, MapPin, Check, Loader2, AlertCircle } from 'lucide-react';
import { 
  uploadPhoto, 
  PhotoType, 
  PHOTO_TYPE_LABELS, 
  getCurrentLocation,
  UploadResult 
} from '../lib/storage';
import { capturePhoto, compressImage } from '../lib/camera-utils';

interface PhotoUploadProps {
  callId?: string;
  deviceId?: string;
  onUploadComplete?: (result: UploadResult) => void;
  onClose?: () => void;
  requiredTypes?: PhotoType[];
  maxPhotos?: number;
}

interface PendingPhoto {
  id: string;
  preview: string;
  photoType: PhotoType;
  notes: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function PhotoUpload({
  callId,
  deviceId,
  onUploadComplete,
  onClose,
  requiredTypes,
  maxPhotos = 10,
}: PhotoUploadProps) {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [selectedType, setSelectedType] = useState<PhotoType>('installation_after');
  const [isCapturing, setIsCapturing] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle camera capture
  const handleCameraCapture = async () => {
    setIsCapturing(true);
    try {
      const base64 = await capturePhoto();
      if (base64) {
        const compressed = await compressImage(base64, 1200);
        addPendingPhoto(compressed);
      }
    } catch (error) {
      console.error('Camera capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length && pendingPhotos.length + i < maxPhotos; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          const compressed = await compressImage(base64, 1200);
          addPendingPhoto(compressed);
        }
      };
      reader.readAsDataURL(file);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add photo to pending list
  const addPendingPhoto = (preview: string) => {
    const newPhoto: PendingPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      preview,
      photoType: selectedType,
      notes: '',
      status: 'pending',
    };
    setPendingPhotos((prev) => [...prev, newPhoto]);
  };

  // Remove pending photo
  const removePendingPhoto = (id: string) => {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Update photo type
  const updatePhotoType = (id: string, photoType: PhotoType) => {
    setPendingPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, photoType } : p))
    );
  };

  // Update photo notes
  const updatePhotoNotes = (id: string, notes: string) => {
    setPendingPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, notes } : p))
    );
  };

  // Upload all pending photos
  const handleUploadAll = async () => {
    if (pendingPhotos.length === 0) return;

    setIsUploading(true);
    let location: { latitude: number; longitude: number } | null = null;

    // Get location if enabled
    if (includeLocation) {
      location = await getCurrentLocation();
    }

    // Upload each photo
    for (const photo of pendingPhotos) {
      if (photo.status === 'success') continue;

      // Update status to uploading
      setPendingPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, status: 'uploading' } : p))
      );

      const result = await uploadPhoto(photo.preview, {
        callId,
        deviceId,
        photoType: photo.photoType,
        notes: photo.notes,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      // Update status based on result
      setPendingPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id
            ? {
                ...p,
                status: result.success ? 'success' : 'error',
                error: result.error,
              }
            : p
        )
      );

      if (onUploadComplete) {
        onUploadComplete(result);
      }
    }

    setIsUploading(false);
  };

  // Check if all photos are uploaded
  const allUploaded = pendingPhotos.length > 0 && 
    pendingPhotos.every((p) => p.status === 'success');

  // Count successful uploads
  const successCount = pendingPhotos.filter((p) => p.status === 'success').length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-lg w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upload Photos</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Photo Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photo Type
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as PhotoType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {(requiredTypes || Object.keys(PHOTO_TYPE_LABELS)).map((type) => (
            <option key={type} value={type}>
              {PHOTO_TYPE_LABELS[type as PhotoType]}
            </option>
          ))}
        </select>
      </div>

      {/* Capture Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleCameraCapture}
          disabled={isCapturing || pendingPhotos.length >= maxPhotos}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isCapturing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
          <span>Take Photo</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={pendingPhotos.length >= maxPhotos}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <Upload className="w-5 h-5" />
          <span>Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Location Toggle */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
        <MapPin className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600 flex-1">Include location data</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={includeLocation}
            onChange={(e) => setIncludeLocation(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Pending Photos List */}
      {pendingPhotos.length > 0 && (
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {pendingPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`flex gap-3 p-2 rounded-lg border ${
                photo.status === 'success'
                  ? 'border-green-200 bg-green-50'
                  : photo.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <img
                  src={photo.preview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded"
                />
                {photo.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                {photo.status === 'success' && (
                  <div className="absolute inset-0 bg-green-500 bg-opacity-50 flex items-center justify-center rounded">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Photo Details */}
              <div className="flex-1 min-w-0">
                <select
                  value={photo.photoType}
                  onChange={(e) => updatePhotoType(photo.id, e.target.value as PhotoType)}
                  disabled={photo.status === 'uploading' || photo.status === 'success'}
                  className="w-full text-sm px-2 py-1 border border-gray-200 rounded mb-1 disabled:bg-gray-100"
                >
                  {Object.entries(PHOTO_TYPE_LABELS).map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Add notes..."
                  value={photo.notes}
                  onChange={(e) => updatePhotoNotes(photo.id, e.target.value)}
                  disabled={photo.status === 'uploading' || photo.status === 'success'}
                  className="w-full text-sm px-2 py-1 border border-gray-200 rounded disabled:bg-gray-100"
                />
                {photo.status === 'error' && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    {photo.error || 'Upload failed'}
                  </div>
                )}
              </div>

              {/* Remove Button */}
              {photo.status !== 'success' && photo.status !== 'uploading' && (
                <button
                  onClick={() => removePendingPhoto(photo.id)}
                  className="p-1 hover:bg-gray-100 rounded self-start"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {pendingPhotos.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {successCount > 0
              ? `${successCount}/${pendingPhotos.length} uploaded`
              : `${pendingPhotos.length} photo(s) ready`}
          </span>
          {allUploaded ? (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleUploadAll}
              disabled={isUploading || pendingPhotos.every((p) => p.status === 'success')}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Upload All</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {pendingPhotos.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <Camera className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Take a photo or upload from your device</p>
          <p className="text-xs text-gray-400 mt-1">
            Maximum {maxPhotos} photos allowed
          </p>
        </div>
      )}
    </div>
  );
}

export default PhotoUpload;
