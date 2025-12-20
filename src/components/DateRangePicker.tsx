import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presetRanges = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'This Month', days: -1 }, // Special case
  { label: 'Last Month', days: -2 }, // Special case
  { label: 'This Year', days: -3 }, // Special case
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('Last 30 Days');

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    if (preset.days === 0) {
      // Today
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (preset.days === -1) {
      // This Month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset.days === -2) {
      // Last Month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (preset.days === -3) {
      // This Year
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // Last N days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - preset.days);
      startDate.setHours(0, 0, 0, 0);
    }

    setActivePreset(preset.label);
    onChange({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    setIsOpen(false);
  };

  const handleCustomDateChange = (type: 'start' | 'end', dateStr: string) => {
    const newDate = new Date(dateStr);
    if (type === 'start') {
      newDate.setHours(0, 0, 0, 0);
      onChange({ ...value, startDate: newDate.toISOString() });
    } else {
      newDate.setHours(23, 59, 59, 999);
      onChange({ ...value, endDate: newDate.toISOString() });
    }
    setActivePreset('Custom');
  };

  const formatDisplayDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-700">
          {formatDisplayDate(value.startDate)} - {formatDisplayDate(value.endDate)}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[320px]">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {presetRanges.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    activePreset === preset.label
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Custom Range</div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={value.startDate.split('T')[0]}
                    onChange={(e) => handleCustomDateChange('start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={value.endDate.split('T')[0]}
                    onChange={(e) => handleCustomDateChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
