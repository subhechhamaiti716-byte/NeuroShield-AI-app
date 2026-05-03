import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const MOCK_TRANSACTIONS = [
  { id: '1', merchant: 'Apple Store', amount: -1299.00, date: 'Today, 10:23 AM', category: 'Electronics', safe: true },
  { id: '2', merchant: 'Starbucks', amount: -5.50, date: 'Today, 08:15 AM', category: 'Food & Drink', safe: true },
  { id: '3', merchant: 'Unknown Vendor', amount: -450.00, date: 'Yesterday, 11:45 PM', category: 'Action Required', safe: false },
  { id: '4', merchant: 'Freelance Payment', amount: 1250.00, date: 'Yesterday, 10:00 AM', category: 'Income', safe: true },
];

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txResponse, analyticsResponse] = await Promise.all([
        api.get('/transactions?limit=5'),
        api.get('/transactions/analytics/summary')
      ]);
      setTransactions(txResponse.data);
      setAnalytics(analyticsResponse.data);
    } catch (error) {
      console.log('Error fetching dashboard data:', error);
      setTransactions(MOCK_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout }
    ]);
  };

  const totalBalance = analytics ? analytics.total_received - analytics.total_spent : 124500;
  const riskLabel = analytics && analytics.risk_score < 0.3 ? 'LOW' : analytics && analytics.risk_score < 0.6 ? 'MEDIUM' : 'HIGH';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={24} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.greeting}>Welcome Back</Text>
            <Text style={styles.userName}>{user?.full_name || 'Alex Morgan'}</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={[styles.notificationBtn, { marginRight: 12 }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Total Protected Balance</Text>
          <Text style={styles.balanceAmount}>₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          <View style={[styles.riskBadge, riskLabel !== 'LOW' && { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
            <Ionicons 
              name="shield-checkmark" 
              size={16} 
              color={riskLabel === 'LOW' ? Colors.success : Colors.secondary} 
              style={{ marginRight: 4 }} 
            />
            <Text style={[styles.riskText, riskLabel !== 'LOW' && { color: Colors.secondary }]}>
              RISK LEVEL: {riskLabel}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          <TouchableOpacity 
            style={[styles.addBtn, { flex: 1, marginBottom: 0 }]} 
            onPress={() => router.push('/add-transaction')} 
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.primaryGradient}
              style={styles.addBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add" size={24} color={Colors.text} />
              <Text style={styles.addBtnText}>Add Transaction</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.linkBankBtn, { flex: 1 }]} 
            onPress={async () => {
              try {
                const response = await api.post('/banking/create_link_token');
                Alert.alert("Link Bank", "Connecting to Secure Bank API (Plaid)... \nToken: " + response.data.link_token);
              } catch (e) {
                Alert.alert("Error", "Failed to initialize bank link.");
              }
            }}
          >
            <Ionicons name="card-outline" size={24} color={Colors.primary} />
            <Text style={styles.linkBankBtnText}>Link Bank</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.navigate('/history')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsList}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : transactions.map((tx) => (
            <TouchableOpacity 
              key={tx.id || Math.random().toString()} 
              style={[
                styles.transactionItem, 
                !tx.safe && styles.transactionItemSuspicious
              ]}
              onPress={() => !tx.safe ? router.push('/alert') : null}
            >
              <View style={[
                styles.txIconContainer, 
                !tx.safe && { backgroundColor: 'rgba(255, 59, 48, 0.2)' }
              ]}>
                <Ionicons 
                  name={!tx.safe ? 'warning' : (tx.amount > 0 ? 'arrow-down' : 'bag-handle')} 
                  size={20} 
                  color={!tx.safe ? Colors.secondary : (tx.amount > 0 ? Colors.success : Colors.primary)} 
                />
              </View>
              
              <View style={styles.txDetails}>
                <Text style={styles.txMerchant}>{tx.merchant}</Text>
                <Text style={!tx.safe ? styles.txCategorySuspicious : styles.txCategory}>{tx.category}</Text>
              </View>

              <View style={styles.txAmountContainer}>
                <Text style={[
                  styles.txAmount,
                  tx.amount > 0 && styles.txAmountPositive,
                  !tx.safe && styles.txAmountSuspicious
                ]}>
                  {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.txDate}>{(tx.time || tx.date || '').split(',')[0]}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  greeting: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  userName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  scrollContent: {
    padding: 24,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceLabel: {
    color: Colors.textMuted,
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    color: Colors.text,
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addBtn: {
    height: 56,
    borderRadius: 16,
  },
  addBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  addBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  linkBankBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  linkBankBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 14,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 16,
  },
  transactionItemSuspicious: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.5)',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  txIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  txDetails: {
    flex: 1,
  },
  txMerchant: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  txCategory: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  txCategorySuspicious: {
    color: Colors.secondary,
    fontSize: 14,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  txAmountPositive: {
    color: Colors.success,
  },
  txAmountSuspicious: {
    color: Colors.secondary,
  },
  txDate: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
