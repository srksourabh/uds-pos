import { supabase } from './supabase';
import { compressImage, getPhotoMetadata } from './camera-utils';

// Storage bucket name
const BUCKET_NAME = 'call-photos';

// Photo types for categorization
export type PhotoType = 
  | 'installation_before'
  | 'installation_after'
  | 'device_photo'
  | 'merchant_location'
  | 'signature'
  | 'faulty_device'
  | 'evidence'
  | 'other';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface PhotoRecord {
  id: string;
  call_id: string | null;
  device_id: string | null;
  uploaded_by: string | null;
  photo_type: PhotoType;
  photo_url: string;
  storage_path: string | null;
  thumbnail_url: string | null;
  notes: string | null;
  file_size: number | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Generate a unique file path for storage
 */
function generateFilePath(
  callId: string | null,
  deviceId: string | null,
  photoType: PhotoType,
  fileName: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = fileName.split('.').pop() || 'jpg';
  
  // Organize by call or device
  const folder = callId 
    ? `calls/${callId}` 
    : deviceId 
      ? `devices/${deviceId}` 
      : 'general';
  
  return `${folder}/${photoType}_${timestamp}_${random}.${extension}`;
}

/**
 * Convert base64 to Blob for upload
 */
function base64ToBlob(base64: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Upload a photo to Supabase Storage
 */
export async function uploadPhoto(
  file: File | string, // File object or base64 string
  options: {
    callId?: string;
    deviceId?: string;
    photoType: PhotoType;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<UploadResult> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    let blob: Blob;
    let fileName: string;

    if (typeof file === 'string') {
      // It's a base64 string - compress it first
      const compressed = await compressImage(file, 1200);
      blob = base64ToBlob(compressed);
      fileName = 'photo.jpg';
    } else {
      // It's a File object
      blob = file;
      fileName = file.name;
    }

    // Generate unique path
    const path = generateFilePath(
      options.callId || null,
      options.deviceId || null,
      options.photoType,
      fileName
    );

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    // Get photo metadata
    const metadata = getPhotoMetadata();

    // Save record to photos table
    const { data: photoRecord, error: dbError } = await supabase
      .from('photos')
      .insert({
        call_id: options.callId || null,
        device_id: options.deviceId || null,
        uploaded_by: user.id,
        photo_type: options.photoType,
        photo_url: publicUrl,
        storage_path: path,
        notes: options.notes || null,
        file_size: blob.size,
        latitude: options.latitude || null,
        longitude: options.longitude || null,
        metadata: {
          ...metadata,
          originalFileName: fileName,
          mimeType: blob.type,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([path]);
      return { success: false, error: dbError.message };
    }

    return {
      success: true,
      url: publicUrl,
      path: path,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all photos for a call
 */
export async function getPhotosForCall(callId: string): Promise<PhotoRecord[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('call_id', callId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all photos for a device
 */
export async function getPhotosForDevice(deviceId: string): Promise<PhotoRecord[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete a photo
 */
export async function deletePhoto(photoId: string): Promise<boolean> {
  // First get the photo record to get the storage path
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', photoId)
    .single();

  if (fetchError || !photo) {
    console.error('Error fetching photo:', fetchError);
    return false;
  }

  // Delete from storage if path exists
  if (photo.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([photo.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue to delete the database record anyway
    }
  }

  // Delete the database record
  const { error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId);

  if (dbError) {
    console.error('Database delete error:', dbError);
    return false;
  }

  return true;
}

/**
 * Update photo notes
 */
export async function updatePhotoNotes(
  photoId: string,
  notes: string
): Promise<boolean> {
  const { error } = await supabase
    .from('photos')
    .update({ notes })
    .eq('id', photoId);

  if (error) {
    console.error('Error updating photo:', error);
    return false;
  }

  return true;
}

/**
 * Get photo count for a call
 */
export async function getPhotoCountForCall(callId: string): Promise<number> {
  const { count, error } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('call_id', callId);

  if (error) {
    console.error('Error counting photos:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get current location for geo-tagging
 */
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Photo type display names
 */
export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  installation_before: 'Before Installation',
  installation_after: 'After Installation',
  device_photo: 'Device Photo',
  merchant_location: 'Merchant Location',
  signature: 'Signature',
  faulty_device: 'Faulty Device',
  evidence: 'Evidence',
  other: 'Other',
};
