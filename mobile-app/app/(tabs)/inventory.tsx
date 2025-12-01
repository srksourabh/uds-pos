import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Device {
  id: string;
  serial_number: string;
  model: string;
  status: string;
  device_bank: { name: string } | null;
}

const statusIcons: Record<string, { icon: any; color: string }> = {
  issued: { icon: Package, color: '#2563eb' },
  warehouse: { icon: Package, color: '#6b7280' },
  installed: { icon: CheckCircle, color: '#22c55e' },
  faulty: { icon: AlertTriangle, color: '#ef4444' },
};

export default function InventoryScreen() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
  }, [user]);

  const loadDevices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, serial_number, model, status, device_bank(name)')
        .eq('assigned_to', user.id)
        .order('status')
        .order('serial_number');

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  const renderDevice = ({ item }: { item: Device }) => {
    const statusConfig = statusIcons[item.status] || statusIcons.warehouse;
    const Icon = statusConfig.icon;

    return (
      <View style={styles.deviceCard}>
        <View style={[styles.iconContainer, { backgroundColor: `${statusConfig.color}20` }]}>
          <Icon size={24} color={statusConfig.color} />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.serialNumber}>{item.serial_number}</Text>
          <Text style={styles.model}>{item.model}</Text>
          <View style={styles.deviceMeta}>
            <Text style={[styles.status, { color: statusConfig.color }]}>
              {item.status}
            </Text>
            {item.device_bank && (
              <Text style={styles.bank}>{item.device_bank.name}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // Group devices by status
  const issuedDevices = devices.filter(d => d.status === 'issued');
  const otherDevices = devices.filter(d => d.status !== 'issued');

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{devices.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#2563eb' }]}>
            {issuedDevices.length}
          </Text>
          <Text style={styles.summaryLabel}>Issued</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
            {devices.filter(d => d.status === 'installed').length}
          </Text>
          <Text style={styles.summaryLabel}>Installed</Text>
        </View>
      </View>

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Devices</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any devices assigned to you
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
  summary: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  deviceCard: {
    flexDirection: 'row',
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  serialNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'monospace',
  },
  model: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginRight: 12,
  },
  bank: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
