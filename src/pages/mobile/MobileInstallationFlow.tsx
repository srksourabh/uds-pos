import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, Camera, QrCode, FileText, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InstallationStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
  required: boolean;
}

export default function MobileInstallationFlow() {
  const navigate = useNavigate();
  const { id: callId } = useParams<{ id: string }>();
  const [call, setCall] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    loadCallData();
  }, [callId]);

  const loadCallData = async () => {
    if (!callId) return;

    const [callRes, devicesRes, photosRes] = await Promise.all([
      supabase.from('calls').select('*').eq('id', callId).single(),
      supabase.from('call_devices').select('*, devices(*)').eq('call_id', callId),
      supabase.from('photos').select('*').eq('related_call', callId),
    ]);

    setCall(callRes.data);
    setDevices(devicesRes.data || []);
    setPhotos(photosRes.data || []);
  };

  const steps: InstallationStep[] = [
    {
      id: 'arrive',
      title: 'Arrive at Location',
      description: 'Navigate to merchant location and verify address',
      icon: MapPin,
      completed: call?.status === 'in_progress',
      required: true,
    },
    {
      id: 'scan_device',
      title: 'Scan Device',
      description: 'Scan device QR code and validate',
      icon: QrCode,
      completed: devices.length > 0,
      required: true,
    },
    {
      id: 'before_photo',
      title: 'Before Photo',
      description: 'Take photo of installation site',
      icon: Camera,
      completed: photos.some(p => p.photo_type === 'before_installation'),
      required: true,
    },
    {
      id: 'install',
      title: 'Install Device',
      description: 'Complete physical installation',
      icon: CheckCircle,
      completed: devices.some(d => d.action === 'install'),
      required: true,
    },
    {
      id: 'after_photo',
      title: 'After Photo',
      description: 'Take photo of completed installation',
      icon: Camera,
      completed: photos.some(p => p.photo_type === 'after_installation'),
      required: true,
    },
    {
      id: 'notes',
      title: 'Completion Notes',
      description: 'Document installation details',
      icon: FileText,
      completed: false,
      required: true,
    },
  ];

  const handleStepClick = (index: number) => {
    const step = steps[index];

    if (step.id === 'arrive' && !step.completed) {
      navigate(`/mobile/calls/${callId}`);
    } else if (step.id === 'scan_device') {
      navigate(`/mobile/calls/${callId}/scan`);
    } else if (step.id === 'before_photo' || step.id === 'after_photo') {
      navigate(`/mobile/calls/${callId}/photo?type=${step.id}`);
    } else if (step.id === 'notes') {
      navigate(`/mobile/calls/${callId}/complete`);
    }
  };

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate(`/mobile/calls/${callId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Installation Guide</h1>
            <p className="text-sm text-gray-600">
              Step {completedSteps + 1} of {steps.length}
            </p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1 text-center">
            {completedSteps} of {steps.length} steps completed ({Math.round(progress)}%)
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.completed;
          const isCurrent = index === completedSteps;

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(index)}
              className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
                isCompleted
                  ? 'border-green-500 bg-green-50'
                  : isCurrent
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    {step.required && !isCompleted && (
                      <span className="text-xs text-red-600 font-medium">Required</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {isCompleted && (
                    <p className="text-xs text-green-600 font-medium mt-2">✓ Completed</p>
                  )}
                  {isCurrent && !isCompleted && (
                    <p className="text-xs text-blue-600 font-medium mt-2">→ Current step</p>
                  )}
                </div>

                {isCurrent && !isCompleted && (
                  <div className="flex-shrink-0 text-blue-600">
                    <Circle className="w-6 h-6" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {completedSteps === steps.length && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <button
            onClick={() => navigate(`/mobile/calls/${callId}/complete`)}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Complete Call
          </button>
        </div>
      )}
    </div>
  );
}
