import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Clock, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
  priority: string;
  client_name: string;
  client_address: string;
  scheduled_date: string | null;
  latitude: number | null;
  longitude: number | null;
}

const priorityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  urgent: '#ef4444',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  assigned: { bg: '#dbeafe', text: '#1e40af' },
  in_progress: { bg: '#f3e8ff', text: '#7c3aed' },
  completed: { bg: '#dcfce7', text: '#166534' },
};

export default function CallsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCalls();
  }, [user]);

  const loadCalls = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('assigned_engineer', user.id)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .order('priority', { ascending: false })
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCalls();
  };

  const renderCall = ({ item }: { item: Call }) => {
    const status = statusColors[item.status] || statusColors.pending;

    return (
      <TouchableOpacity
        style={styles.callCard}
        onPress={() => router.push(`/call/${item.id}`)}
      >
        <View style={styles.callHeader}>
          <View style={styles.callNumber}>
            <Text style={styles.callNumberText}>{item.call_number}</Text>
            <View style={[styles.priorityDot, { backgroundColor: priorityColors[item.priority] }]} />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.clientName}>{item.client_name}</Text>

        <View style={styles.callInfo}>
          <MapPin size={14} color="#6b7280" />
          <Text style={styles.callInfoText} numberOfLines={1}>
            {item.client_address}
          </Text>
        </View>

        {item.scheduled_date && (
          <View style={styles.callInfo}>
            <Clock size={14} color="#6b7280" />
            <Text style={styles.callInfoText}>
              {new Date(item.scheduled_date).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.callFooter}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          <ChevronRight size={20} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        renderItem={renderCall}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Calls Today</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any assigned calls for today
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  callCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callNumber: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  callInfoText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 14,
    flex: 1,
  },
  callFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  typeBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});
