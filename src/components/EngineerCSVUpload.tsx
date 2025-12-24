import { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EngineerCSVUploadProps {
  onComplete: (results: { success: boolean; message: string }[]) => void;
  onClose: () => void;
}

interface CSVRow {
  employee_id?: string;
  emp_name: string;
  designation?: string;
  email: string;
  phone: string;
  address?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  date_of_joining?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  referred_by?: string;
  bank_code?: string;
}

export function EngineerCSVUpload({ onComplete, onClose }: EngineerCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ success: boolean; message: string }[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = [
      'employee_id',
      'emp_name',
      'designation',
      'email',
      'phone',
      'address',
      'pincode',
      'latitude',
      'longitude',
      'date_of_joining',
      'emergency_contact_name',
      'emergency_contact_number',
      'referred_by',
      'bank_code'
    ];
    const sampleRow = [
      'UDSPL0001',
      'John Doe',
      'Field Service Engineer',
      'john@example.com',
      '+919876543210',
      '123 Main Street, Kolkata',
      '700001',
      '22.5726',
      '88.3639',
      '2024-01-15',
      'Jane Doe',
      '+919876543211',
      'HR Team',
      'HDFC'
    ];
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'engineer_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      if (row.emp_name && row.email && row.phone) {
        rows.push(row as CSVRow);
      }
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setPreview(parsed);
      setStep('preview');
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setLoading(true);
    const importResults: { success: boolean; message: string }[] = [];

    // Get bank mappings
    const { data: banks } = await supabase
      .from('banks')
      .select('id, code, name');

    const bankMap = new Map(banks?.map(b => [b.code.toUpperCase(), b.id]) || []);

    for (const row of preview) {
      try {
        // Generate employee ID if not provided
        const employeeId = row.employee_id || `UDSPL${Date.now().toString().slice(-4)}${Math.random().toString(36).slice(-2).toUpperCase()}`;

        // Create auth user with a default password (should be changed on first login)
        const defaultPassword = `Engineer@${Math.random().toString(36).slice(-6)}`;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: row.email,
          password: defaultPassword,
          options: {
            data: {
              full_name: row.emp_name,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          const bankId = row.bank_code ? bankMap.get(row.bank_code.toUpperCase()) : null;

          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: authData.user.id,
              email: row.email,
              full_name: row.emp_name,
              phone: row.phone,
              role: 'engineer',
              status: 'active',
              active: true,
              bank_id: bankId || null,
              employee_id: employeeId,
              designation: row.designation || null,
              address: row.address || null,
              pincode: row.pincode || null,
              latitude: row.latitude ? parseFloat(row.latitude) : null,
              longitude: row.longitude ? parseFloat(row.longitude) : null,
              date_of_joining: row.date_of_joining || null,
              emergency_contact_name: row.emergency_contact_name || null,
              emergency_contact_number: row.emergency_contact_number || null,
              referred_by: row.referred_by || null,
            });

          if (profileError) throw profileError;
        }

        importResults.push({
          success: true,
          message: `✓ ${row.emp_name} (${row.email}) imported successfully`
        });
      } catch (error: any) {
        importResults.push({
          success: false,
          message: `✗ ${row.emp_name}: ${error.message}`
        });
      }
    }

    setResults(importResults);
    setStep('results');
    setLoading(false);
    onComplete(importResults);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Import Engineers from CSV</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Upload a CSV file with engineer details
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Select CSV File
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Required columns: <strong>emp_name, email, phone</strong></li>
                  <li>• Optional columns: employee_id, designation, address, pincode, latitude, longitude, date_of_joining, emergency_contact_name, emergency_contact_number, referred_by, bank_code</li>
                  <li>• Date format: YYYY-MM-DD</li>
                  <li>• Bank code should match existing bank codes (e.g., HDFC, ICICI)</li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <FileText className="w-5 h-5" />
                <span className="font-medium">{file?.name}</span>
                <span className="text-gray-500">({preview.length} records found)</span>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Employee ID</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Designation</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Bank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{row.employee_id || 'Auto'}</td>
                          <td className="px-3 py-2 font-medium">{row.emp_name}</td>
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.phone}</td>
                          <td className="px-3 py-2">{row.designation || '-'}</td>
                          <td className="px-3 py-2">{row.bank_code || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>{results.filter(r => r.success).length} succeeded</span>
                </div>
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span>{results.filter(r => !r.success).length} failed</span>
                </div>
              </div>

              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`px-4 py-2 border-b last:border-b-0 text-sm ${
                      result.success ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {result.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t">
          {step === 'upload' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                  setStep('upload');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading || preview.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Importing...' : `Import ${preview.length} Engineers`}
              </button>
            </>
          )}

          {step === 'results' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
