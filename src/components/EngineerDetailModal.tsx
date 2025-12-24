import { X, User, Mail, Phone, MapPin, Calendar, Shield, Building, Users } from 'lucide-react';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  banks?: Database['public']['Tables']['banks']['Row'];
};

interface EngineerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineer: UserProfile | null;
}

export function EngineerDetailModal({ isOpen, onClose, engineer }: EngineerDetailModalProps) {
  if (!isOpen || !engineer) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-xl">
                {engineer.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{engineer.full_name}</h2>
              <p className="text-sm text-gray-600">{engineer.employee_id || 'No Employee ID'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Role */}
          <div className="flex gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              engineer.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {engineer.active ? 'Active' : 'Inactive'}
            </span>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
              {engineer.role}
            </span>
            {engineer.designation && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                {engineer.designation}
              </span>
            )}
          </div>

          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Employee ID</p>
                <p className="text-sm font-medium text-gray-900">{engineer.employee_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Designation</p>
                <p className="text-sm font-medium text-gray-900">{engineer.designation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date of Joining</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(engineer.date_of_joining)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Referred By</p>
                <p className="text-sm font-medium text-gray-900">{engineer.referred_by || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{engineer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{engineer.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm font-medium text-gray-900">{engineer.address || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Pincode</p>
                  <p className="text-sm font-medium text-gray-900">{engineer.pincode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Latitude</p>
                  <p className="text-sm font-medium text-gray-900">{engineer.latitude || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Longitude</p>
                  <p className="text-sm font-medium text-gray-900">{engineer.longitude || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Contact Name</p>
                <p className="text-sm font-medium text-gray-900">{engineer.emergency_contact_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact Number</p>
                <p className="text-sm font-medium text-gray-900">{engineer.emergency_contact_number || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Assigned Bank */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Assignment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Assigned Bank</p>
                <p className="text-sm font-medium text-gray-900">{engineer.banks?.name || 'Not Assigned'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Region</p>
                <p className="text-sm font-medium text-gray-900">{engineer.region || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              System Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Created At</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(engineer.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(engineer.updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{engineer.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">2FA Enabled</p>
                <p className="text-sm font-medium text-gray-900">{engineer.totp_enabled ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
