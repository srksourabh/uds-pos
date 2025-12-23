import { useState, useEffect } from 'react';
import {
  Receipt, CheckCircle, XCircle, User,
  RefreshCw, Loader2, DollarSign, Calendar,
  Camera, Filter, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import type { ExpenseWithDetails } from '../../lib/database.types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export function ExpenseApprovals() {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadExpenses();
  }, [statusFilter]);

  const loadExpenses = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          engineer:engineer_id(id, full_name, phone, email),
          call:call_id(id, call_number, client_name),
          approver:approved_by(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      // Type assertion needed because Supabase's generated types don't include our extended type
      setExpenses((data || []) as unknown as ExpenseWithDetails[]);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (expenseId: string) => {
    setProcessingId(expenseId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .eq('status', 'pending');

      if (error) throw error;
      loadExpenses();
    } catch (error: any) {
      alert(`Error approving expense: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (expenseId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessingId(expenseId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', expenseId)
        .eq('status', 'pending');

      if (error) throw error;
      setShowRejectModal(null);
      setRejectionReason('');
      loadExpenses();
    } catch (error: any) {
      alert(`Error rejecting expense: ${error.message}`);
    } finally {
      setProcessingId(null);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredExpenses = expenses.filter((expense) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      expense.engineer?.full_name?.toLowerCase().includes(search) ||
      expense.expense_type.toLowerCase().includes(search) ||
      expense.reason.toLowerCase().includes(search)
    );
  });

  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Approvals</h1>
          <p className="text-gray-600 mt-1">
            Review and approve expense claims from field engineers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {pendingCount} pending
            </span>
          )}
          <button
            onClick={() => loadExpenses(true)}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by engineer name or expense type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-4">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No expenses found</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{expense.expense_type}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(expense.status)}`}>
                          {expense.status}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{expense.reason}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{expense.engineer?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(expense.created_at), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                    {expense.receipt_photo_url && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Camera className="w-4 h-4" />
                        <span>Receipt attached</span>
                      </div>
                    )}
                    {expense.call && (
                      <div className="flex items-center gap-1">
                        <Receipt className="w-4 h-4" />
                        <span>Call: {expense.call.call_number}</span>
                      </div>
                    )}
                  </div>

                  {expense.status === 'rejected' && expense.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600">
                        <strong>Rejection reason:</strong> {expense.rejection_reason}
                      </p>
                    </div>
                  )}

                  {expense.status !== 'pending' && expense.approver && (
                    <div className="mt-2 text-xs text-gray-500">
                      {expense.status === 'approved' ? 'Approved' : 'Rejected'} by {expense.approver.full_name}
                      {expense.approved_at && ` on ${format(new Date(expense.approved_at), 'dd MMM yyyy')}`}
                    </div>
                  )}
                </div>

                {expense.status === 'pending' && (
                  <div className="flex gap-2 lg:flex-col">
                    <button
                      onClick={() => handleApprove(expense.id)}
                      disabled={processingId === expense.id}
                      className="flex-1 lg:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {processingId === expense.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(expense.id)}
                      disabled={processingId === expense.id}
                      className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Reject Expense</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this expense claim.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={processingId === showRejectModal || !rejectionReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {processingId === showRejectModal ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseApprovals;
