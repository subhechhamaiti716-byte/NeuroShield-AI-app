import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import api from '../utils/api';

import { LinearGradient } from 'expo-linear-gradient';

export default function AlertScreen() {
  const params = useLocalSearchParams();
  const id = params.tx_id || params.id;
  const amount = params.amount || '2,450.00';
  const location = params.location || 'San Francisco, CA';
  const category = params.category || 'Electronics';
  const merchant = params.merchant || 'Apple Store';
  const score = params.score ? parseFloat(params.score as string) : 0.85;

  const handleSafe = async () => {
    try {
      if (id) {
        await api.patch(`/transactions/${id}/feedback`, { feedback: 'safe' });
      }
    } catch (e) {
      console.error('Feedback error:', e);
    }
    router.replace('/(tabs)');
  };

  const handleFraud = async () => {
    try {
      if (id) {
        await api.patch(`/transactions/${id}/feedback`, { feedback: 'fraud' });
      }
    } catch (e) {
      console.error('Feedback error:', e);
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Ionicons name="shield-half" size={40} color={Colors.secondary} />
            </View>
          </View>
          
          <Text style={styles.title}>Suspicious Transaction Detected</Text>
          <Text style={styles.message}>
            We noticed an unusual attempt on your card. Was this you?
          </Text>

          <View style={styles.txCard}>
            <View style={styles.txHeader}>
              <View style={styles.txIcon}>
                <Ionicons name="card-outline" size={24} color={Colors.text} />
              </View>
              <View style={styles.txDetails}>
                <Text style={styles.txMerchant}>{merchant}</Text>
                <Text style={styles.txCategory}>{category} • {Math.round(score * 100)}% Risk</Text>
              </View>
              <Text style={styles.txAmount}>${amount}</Text>
            </View>
            
            <View style={styles.txFooter}>
              <View style={styles.txFooterItem}>
                <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.txFooterText}>{location}</Text>
              </View>
              <View style={styles.txFooterItem}>
                <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.txFooterText}>Just now</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={handleSafe} activeOpacity={0.8} style={{ width: '100%', marginBottom: 16 }}>
            <LinearGradient
              colors={Colors.primaryGradient}
              style={styles.safeBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.safeBtnText}>Yes, It&apos;s Me</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleFraud} style={styles.fraudBtn} activeOpacity={0.8}>
            <Text style={styles.fraudBtnText}>Report Fraud</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(11, 13, 23, 0.95)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.card,
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 24,
    marginTop: -48,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 59, 48, 0.5)',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: Colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  txCard: {
    backgroundColor: Colors.background,
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txMerchant: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  txCategory: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  txAmount: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  txFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txFooterText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginLeft: 6,
  },
  safeBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  safeBtnText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  fraudBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  fraudBtnText: {
    color: Colors.secondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
