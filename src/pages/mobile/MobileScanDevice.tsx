import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, QrCode, Keyboard, CheckCircle2, XCircle, AlertTriangle, Camera, Sparkles, Loader2 } from 'lucide-react';
import { useSerialOCR, useOCRStatus } from '../../lib/ocr-hooks';
import { generateSerialNumber } from '../../lib/ocr';

type ScanMode = 'qr' | 'ocr' | 'manual';

export default function MobileScanDevice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [serialNumber, setSerialNumber] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('qr');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isConfigured: isOCRConfigured } = useOCRStatus();
  const { extractSerial, loading: ocrLoading, error: ocrError, result: ocrResult } = useSerialOCR();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    device?: any;
    call?: { client_bank_name?: string; client_bank_code?: string };
    error_code?: string;
  } | null>(null);
  const [action, setAction] = useState<'install' | 'swap_in' | 'swap_out' | 'remove' | 'inspect'>('install');

  const handleOCRCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await extractSerial(file);
    if (result?.success && result.serial_number) {
      setSerialNumber(result.serial_number);
      setOcrConfidence(result.confidence);
      setScanMode('ocr');
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAutoGenerate = () => {
    const generated = generateSerialNumber('POS');
    setSerialNumber(generated);
    setOcrConfidence(1);
    setScanMode('manual');
  };

  const handleValidateDevice = async () => {
    if (!serialNumber.trim() || !id) {
      alert('Please enter a serial number');
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-device`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            call_id: id,
            serial_number: serialNumber.trim(),
            scan_timestamp: new Date().toISOString(),
          }),
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to validate device',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmDevice = async () => {
    if (!result?.success || !result.device || !id) return;

    try {
      const { error: deviceError } = await supabase
        .from('call_devices')
        .insert({
          call_id: id,
          device_id: result.device.id,
          action,
        });

      if (deviceError) throw deviceError;

      if (['install', 'swap_in'].includes(action)) {
        await supabase
          .from('devices')
          .update({
            status: 'installed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', result.device.id);
      } else if (['swap_out', 'remove'].includes(action)) {
        await supabase
          .from('devices')
          .update({
            status: 'returned',
            installed_at_client: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', result.device.id);
      }

      alert('Device added successfully!');
      navigate(`/mobile/calls/${id}`);
    } catch (error: any) {
      alert(error.message || 'Failed to add device');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/mobile/calls/${id}`)}
            className="p-2 hover:bg-blue-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Scan Device</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Scan or Enter Serial Number</h2>
            <p className="text-sm text-gray-600">
              Use QR code scanner, OCR from photo, or enter manually
            </p>
          </div>

          {/* Scan Mode Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setScanMode('qr')}
              className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                scanMode === 'qr'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <QrCode className="w-4 h-4 mx-auto mb-1" />
              QR Code
            </button>
            <button
              onClick={() => setScanMode('ocr')}
              className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                scanMode === 'ocr'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              disabled={!isOCRConfigured}
            >
              <Camera className="w-4 h-4 mx-auto mb-1" />
              OCR Photo
            </button>
            <button
              onClick={() => setScanMode('manual')}
              className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                scanMode === 'manual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Keyboard className="w-4 h-4 mx-auto mb-1" />
              Manual
            </button>
          </div>

          {/* OCR Section */}
          {scanMode === 'ocr' && (
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleOCRCapture}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                {ocrLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-gray-600">Extracting serial number...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">Take Photo of Serial Label</span>
                  </>
                )}
              </button>
              {ocrError && (
                <p className="text-sm text-red-600 mt-2">{ocrError}</p>
              )}
              {ocrResult?.raw_text && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500">
                  <span className="font-medium">Detected text:</span> {ocrResult.raw_text.slice(0, 100)}...
                </div>
              )}
              {!isOCRConfigured && (
                <p className="text-sm text-yellow-600 mt-2">
                  OCR requires Gemini API key configuration
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Serial Number
                {ocrConfidence > 0 && scanMode === 'ocr' && (
                  <span className="ml-2 text-xs text-green-600">
                    (OCR confidence: {Math.round(ocrConfidence * 100)}%)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => {
                  setSerialNumber(e.target.value.toUpperCase());
                  setScanMode('manual');
                }}
                placeholder="Enter serial number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                disabled={scanning || ocrLoading}
              />
            </div>

            {/* Auto-generate button */}
            <button
              onClick={handleAutoGenerate}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Auto-generate Serial Number
            </button>

            <button
              onClick={handleValidateDevice}
              disabled={scanning || !serialNumber.trim() || ocrLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? 'Validating...' : 'Validate Device'}
            </button>
          </div>
        </div>

        {result && (
          <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
            result.success ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
              ) : result.error_code === 'BANK_MISMATCH' ? (
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3 className={`font-bold text-lg mb-2 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? 'Device Validated!' : 'Validation Failed'}
                </h3>
                <p className={`text-sm mb-3 ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message}
                </p>

                {result.error_code === 'BANK_MISMATCH' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h4 className="font-bold text-red-900 mb-2">CRITICAL ERROR: Bank Mismatch!</h4>
                    <div className="space-y-2 text-sm text-red-800">
                      <p>
                        <strong>Device Bank:</strong>{' '}
                        {result.device?.device_bank_name} ({result.device?.device_bank_code})
                      </p>
                      <p>
                        <strong>Call Bank:</strong>{' '}
                        {result.call?.client_bank_name} ({result.call?.client_bank_code})
                      </p>
                    </div>
                    <p className="mt-3 text-sm text-red-700 font-medium">
                      You CANNOT install a device from one bank at a merchant of another bank.
                      Please scan a different device from your inventory that matches the call's bank.
                    </p>
                  </div>
                )}

                {result.success && result.device && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Device Details</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-600">Serial:</span> <span className="font-mono font-semibold">{result.device.serial_number}</span></p>
                      <p><span className="text-gray-600">Model:</span> <span className="font-semibold">{result.device.model}</span></p>
                      <p><span className="text-gray-600">Bank:</span> <span className="font-semibold">{result.device.bank_name}</span></p>
                      <p><span className="text-gray-600">Status:</span> <span className="font-semibold">{result.device.status}</span></p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Bank Match Confirmed</span>
                    </div>
                  </div>
                )}

                {result.success && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Action
                      </label>
                      <select
                        value={action}
                        onChange={(e) => setAction(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="install">Install</option>
                        <option value="swap_in">Swap In (New Device)</option>
                        <option value="swap_out">Swap Out (Old Device)</option>
                        <option value="remove">Remove (Deinstall)</option>
                        <option value="inspect">Inspect (Maintenance)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleConfirmDevice}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Confirm Device Action
                    </button>
                  </div>
                )}

                {!result.success && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setSerialNumber('');
                    }}
                    className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Validation Checklist</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Device must exist in database
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Device bank must match call bank
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Device must be assigned to you
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Device status must be warehouse or issued
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
