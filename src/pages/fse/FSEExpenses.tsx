import { useState, useEffect } from 'react';
import {
  Plus, Receipt, Clock, CheckCircle, XCircle,
  ArrowLeft, RefreshCw, Loader2, DollarSign,
  Camera
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import type { Expense, ExpenseType } from '../../lib/database.types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface ExpenseSummary {
  total_amount: number;
  pending_amount: number;
  approved_amount: number;
  rejected_amount: number;
  expense_count: number;
}

export default function FSEExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id, statusFilter]);

  const loadData = async (showRefreshing = false) => {
    if (!user?.id) return;

    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      // Load expense types
      const { data: types } = await supabase
        .from('expense_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setExpenseTypes(types || []);

      // Load expenses with filter
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('engineer_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: expenseData, error } = await query;

      if (error) throw error;
      setExpenses(expenseData || []);

      // Calculate summary from loaded expenses
      const allExpenses = expenseData || [];
      const summaryCalc: ExpenseSummary = {
        total_amount: allExpenses.reduce((sum, e) => sum + e.amount, 0),
        pending_amount: allExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
        approved_amount: allExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
        rejected_amount: allExpenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0),
        expense_count: allExpenses.length,
      };
      setSummary(summaryCalc);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()}>
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">My Expenses</h1>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">This Month</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_amount)}</p>
            <p className="text-xs text-gray-500">{summary.expense_count} claims</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Pending</p>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(summary.pending_amount)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Approved</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.approved_amount)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Rejected</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(summary.rejected_amount)}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                statusFilter === filter
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Expense List */}
      <div className="px-4 space-y-3">
        {expenses.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No expenses found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              Add Your First Expense
            </button>
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{expense.expense_type}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(expense.created_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(expense.amount)}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                    {getStatusIcon(expense.status)}
                    {expense.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-2">{expense.reason}</p>

              {expense.receipt_photo_url && (
                <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                  <Camera className="w-3 h-3" />
                  <span>Receipt attached</span>
                </div>
              )}

              {expense.status === 'rejected' && expense.rejection_reason && (
                <div className="mt-2 p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">
                    <strong>Rejection reason:</strong> {expense.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-20"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          expenseTypes={expenseTypes}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Add Expense Modal Component
interface AddExpenseModalProps {
  expenseTypes: ExpenseType[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddExpenseModal({ expenseTypes, onClose, onSuccess }: AddExpenseModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    expense_type: '',
    amount: '',
    reason: '',
    receipt_photo_url: '',
  });

  const selectedType = expenseTypes.find(t => t.name === formData.expense_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        engineer_id: user.id,
        expense_type: formData.expense_type,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        receipt_photo_url: formData.receipt_photo_url || null,
        status: 'pending',
      });

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      alert(`Error submitting expense: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add Expense</h2>
            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expense Type *
            </label>
            <select
              required
              value={formData.expense_type}
              onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select type</option>
              {expenseTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name} - {type.description}
                </option>
              ))}
            </select>
            {selectedType?.max_amount && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(selectedType.max_amount)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (INR) *
            </label>
            <input
              type="number"
              required
              min="1"
              max={selectedType?.max_amount || 10000}
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description/Reason *
            </label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Describe the expense"
            />
          </div>

          {selectedType?.requires_receipt && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Camera className="w-5 h-5" />
                <span className="text-sm font-medium">Receipt Required</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                This expense type requires a receipt photo. Upload feature coming soon.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
