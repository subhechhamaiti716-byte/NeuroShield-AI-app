import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import api from '../../utils/api';

const MOCK_TRANSACTIONS = [
  { id: '1', merchant: 'Freelance Payment', amount: 1250.00, date: '10:00 AM', category: 'Income', safe: true, status: 'Completed', group: 'TODAY' },
  { id: '2', merchant: 'Starbucks', amount: -12.50, date: '08:15 AM', category: 'Food & Drink', safe: true, status: 'Completed', group: 'TODAY' },
  { id: '3', merchant: 'Suspicious Transaction', amount: -2450.00, date: '03:45 AM', category: 'Apple Store • Review Needed', safe: false, status: 'Action Required', group: 'YESTERDAY' },
  { id: '4', merchant: 'Uber Ride', amount: -24.00, date: '08:45 PM', category: 'Transport', safe: true, status: 'Completed', group: 'YESTERDAY' },
  { id: '5', merchant: 'Netflix Subscription', amount: -15.99, date: '10:00 AM', category: 'Entertainment', safe: true, status: 'Completed', group: 'YESTERDAY' },
];

export default function HistoryScreen() {
  const [filter, setFilter] = useState('All');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [searchQuery]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transactions', {
        params: { q: searchQuery }
      });
      setTransactions(response.data);
    } catch (error) {
      console.log('Using mock history data, API unreachable:', error);
      setTransactions(MOCK_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'All') return true;
    if (filter === 'Income') return tx.amount > 0;
    if (filter === 'Expense') return tx.amount < 0;
    return true;
  });

  const groupedTx = filteredTransactions.reduce((acc, tx) => {
    if (!acc[tx.group]) acc[tx.group] = [];
    acc[tx.group].push(tx);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        {showSearch ? (
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search merchants..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => {setShowSearch(false); setSearchQuery('');}}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.headerTitle}>History</Text>
        )}

        <TouchableOpacity style={styles.searchBtn} onPress={() => setShowSearch(!showSearch)}>
          <Ionicons name={showSearch ? "close" : "search"} size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.calendarBtn}>
          <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['All', 'Income', 'Expense'].map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : Object.entries(groupedTx).map(([group, txs]) => (
          <View key={group} style={styles.groupContainer}>
            <Text style={styles.groupLabel}>{group}</Text>
            
            {txs.map(tx => (
              <TouchableOpacity 
                key={tx.id} 
                style={[
                  styles.txCard, 
                  !tx.safe && styles.txCardSuspicious
                ]}
              >
                <View style={styles.txRow}>
                  <View style={[
                    styles.txIconContainer,
                    !tx.safe && { backgroundColor: 'rgba(255, 59, 48, 0.1)' }
                  ]}>
                    <Ionicons 
                      name={!tx.safe ? 'warning' : (tx.amount > 0 ? 'arrow-down' : 'card')} 
                      size={20} 
                      color={!tx.safe ? Colors.secondary : (tx.amount > 0 ? Colors.success : Colors.primary)} 
                    />
                  </View>
                  
                  <View style={styles.txDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.txMerchant}>{tx.merchant}</Text>
                      {tx.receipt_image && (
                        <Ionicons name="receipt-outline" size={14} color={Colors.primary} style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    <Text style={!tx.safe ? styles.txCategorySuspicious : styles.txCategory}>
                      {tx.category} • {tx.time || tx.date}
                    </Text>
                  </View>

                  <View style={styles.txAmountContainer}>
                    <Text style={[
                      styles.txAmount,
                      tx.amount > 0 && styles.txAmountPositive,
                      !tx.safe && styles.txAmountSuspicious
                    ]}>
                      {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                    {!tx.safe && (
                      <TouchableOpacity style={styles.resolveBtn}>
                        <Text style={styles.resolveBtnText}>RESOLVE</Text>
                        <Ionicons name="chevron-forward" size={12} color={Colors.secondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
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
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    marginLeft: 8,
    padding: 0,
  },
  searchBtn: {
    padding: 8,
    marginRight: -8,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  calendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterScroll: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterTextActive: {
    color: Colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  txCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txCardSuspicious: {
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 12,
  },
  txCategorySuspicious: {
    color: Colors.secondary,
    fontSize: 12,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txAmount: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  txAmountPositive: {
    color: Colors.success,
  },
  txAmountSuspicious: {
    color: Colors.secondary,
    marginBottom: 4,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resolveBtnText: {
    color: Colors.secondary,
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 2,
  },
});
