import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Smartphone, ClipboardList, Users, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SearchResult {
  id: string;
  type: 'device' | 'call' | 'engineer' | 'bank';
  title: string;
  subtitle: string;
  icon: typeof Smartphone;
  url: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut to open search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query.trim());
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search devices
      const { data: devices } = await supabase
        .from('devices')
        .select('id, serial_number, model, status')
        .or(`serial_number.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`)
        .limit(3);

      if (devices) {
        devices.forEach(device => {
          searchResults.push({
            id: device.id,
            type: 'device',
            title: device.serial_number,
            subtitle: `${device.model} • ${device.status}`,
            icon: Smartphone,
            url: `/devices?search=${device.serial_number}`,
          });
        });
      }

      // Search calls
      const { data: calls } = await supabase
        .from('calls')
        .select('id, call_number, client_name, status, type')
        .or(`call_number.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%`)
        .limit(3);

      if (calls) {
        calls.forEach(call => {
          searchResults.push({
            id: call.id,
            type: 'call',
            title: call.call_number,
            subtitle: `${call.client_name} • ${call.type} • ${call.status}`,
            icon: ClipboardList,
            url: `/calls/${call.id}`,
          });
        });
      }

      // Search engineers
      const { data: engineers } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, phone')
        .eq('role', 'engineer')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(3);

      if (engineers) {
        engineers.forEach(engineer => {
          searchResults.push({
            id: engineer.id,
            type: 'engineer',
            title: engineer.full_name || 'Unknown',
            subtitle: engineer.email || engineer.phone || '',
            icon: Users,
            url: `/engineers?search=${engineer.full_name}`,
          });
        });
      }

      // Search banks
      const { data: banks } = await supabase
        .from('banks')
        .select('id, name, code')
        .or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
        .limit(2);

      if (banks) {
        banks.forEach(bank => {
          searchResults.push({
            id: bank.id,
            type: 'bank',
            title: bank.name,
            subtitle: bank.code,
            icon: Building2,
            url: `/banks?search=${bank.name}`,
          });
        });
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const closeSearch = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline text-sm">Search...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-white rounded border border-gray-200">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeSearch}
          />

          {/* Modal */}
          <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
            <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center px-4 border-b border-gray-200">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search devices, calls, engineers..."
                  className="flex-1 px-3 py-4 text-lg outline-none placeholder-gray-400"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {loading && (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                )}

                {!loading && query.length >= 2 && results.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No results found for "{query}"</p>
                    <p className="text-sm mt-1">Try searching for device serial numbers, call numbers, or names</p>
                  </div>
                )}

                {results.length > 0 && (
                  <ul className="py-2">
                    {results.map((result, index) => {
                      const Icon = result.icon;
                      return (
                        <li key={`${result.type}-${result.id}`}>
                          <button
                            onClick={() => handleSelect(result)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                              index === selectedIndex
                                ? 'bg-blue-50 text-blue-700'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${
                              index === selectedIndex ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{result.title}</p>
                              <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              result.type === 'device' ? 'bg-blue-100 text-blue-700' :
                              result.type === 'call' ? 'bg-orange-100 text-orange-700' :
                              result.type === 'engineer' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {result.type}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {query.length < 2 && !loading && (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-sm">Type at least 2 characters to search</p>
                    <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Devices
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardList className="w-3 h-3" /> Calls
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> Engineers
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border">↑↓</kbd> Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border">↵</kbd> Select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border">Esc</kbd> Close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
