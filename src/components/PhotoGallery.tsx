import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  MapPin, 
  Clock, 
  User,
  Image as ImageIcon,
  Loader2,
  Download,
  AlertCircle
} from 'lucide-react';
import { 
  PhotoRecord, 
  getPhotosForCall, 
  getPhotosForDevice, 
  deletePhoto,
  PHOTO_TYPE_LABELS,
  PhotoType
} from '../lib/storage';

interface PhotoGalleryProps {
  callId?: string;
  deviceId?: string;
  onClose?: () => void;
  showDeleteButton?: boolean;
  onPhotoDeleted?: () => void;
}

export function PhotoGallery({
  callId,
  deviceId,
  onClose,
  showDeleteButton = true,
  onPhotoDeleted,
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Fetch photos
  useEffect(() => {
    async function loadPhotos() {
      setLoading(true);
      setError(null);
      try {
        let data: PhotoRecord[] = [];
        if (callId) {
          data = await getPhotosForCall(callId);
        } else if (deviceId) {
          data = await getPhotosForDevice(deviceId);
        }
        setPhotos(data);
      } catch (err) {
        setError('Failed to load photos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPhotos();
  }, [callId, deviceId]);

  // Handle delete
  const handleDelete = async (photoId: string) => {
    setDeleting(photoId);
    try {
      const success = await deletePhoto(photoId);
      if (success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (selectedIndex !== null && photos[selectedIndex]?.id === photoId) {
          setSelectedIndex(null);
        }
        if (onPhotoDeleted) {
          onPhotoDeleted();
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  // Navigate in lightbox
  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, photos.length]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Download photo
  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-600">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <ImageIcon className="w-12 h-12 mb-2 text-gray-300" />
        <p className="text-sm">No photos uploaded yet</p>
      </div>
    );
  }

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <div className="relative">
      {/* Gallery Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Photos ({photos.length})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Thumbnail Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square group cursor-pointer rounded-lg overflow-hidden bg-gray-100"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={photo.photo_url}
              alt={PHOTO_TYPE_LABELS[photo.photo_type as PhotoType] || 'Photo'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* Photo Type Badge */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
              <span className="text-xs text-white truncate block">
                {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType] || photo.photo_type}
              </span>
            </div>
            {/* Delete Button */}
            {showDeleteButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(photo.id);
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between p-4 text-white">
            <div>
              <h4 className="font-medium">
                {PHOTO_TYPE_LABELS[selectedPhoto.photo_type as PhotoType] || selectedPhoto.photo_type}
              </h4>
              <p className="text-sm text-gray-300">
                {selectedIndex! + 1} of {photos.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(
                    selectedPhoto.photo_url,
                    `photo-${selectedPhoto.id}.jpg`
                  );
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
              {showDeleteButton && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(selectedPhoto.id);
                  }}
                  className="p-2 hover:bg-red-500/50 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setSelectedIndex(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Image */}
          <div
            className="flex-1 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {selectedIndex! > 0 && (
              <button
                onClick={goToPrevious}
                className="absolute left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Image */}
            <img
              src={selectedPhoto.photo_url}
              alt={PHOTO_TYPE_LABELS[selectedPhoto.photo_type as PhotoType]}
              className="max-w-full max-h-full object-contain"
            />

            {/* Next Button */}
            {selectedIndex! < photos.length - 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}
          </div>

          {/* Photo Details */}
          <div className="p-4 bg-black/50 text-white">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatDate(selectedPhoto.created_at)}</span>
              </div>
              {selectedPhoto.latitude && selectedPhoto.longitude && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>
                    {selectedPhoto.latitude.toFixed(4)}, {selectedPhoto.longitude.toFixed(4)}
                  </span>
                </div>
              )}
              {selectedPhoto.file_size && (
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  <span>{(selectedPhoto.file_size / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>
            {selectedPhoto.notes && (
              <p className="mt-2 text-gray-300">{selectedPhoto.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold mb-2">Delete Photo?</h4>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. The photo will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 flex items-center justify-center gap-2"
              >
                {deleting === confirmDelete ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoGallery;
