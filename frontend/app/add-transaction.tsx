import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/Colors';
import api from '../utils/api';

export default function AddTransactionScreen() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [locationName, setLocationName] = useState('Fetching location...');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Permission to access location was denied');
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        // Simulate reverse geocoding
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
        setLocationName(`Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
        
        // In a real app, we'd use Location.reverseGeocodeAsync
        let geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (geocode.length > 0) {
          setLocationName(`${geocode[0].city || geocode[0].region}, ${geocode[0].country}`);
        }
      } catch (e) {
        setLocationName('Location unavailable');
      }
    })();
  }, []);

  const handleAddTransaction = async () => {
    if (!amount) {
      import('react-native').then(({ Alert }) => {
        Alert.alert('Scan Required', 'You must simulate scanning the bank terminal to fetch the transaction amount securely.');
      });
      return;
    }
    
    setLoading(true);
    
    const transactionData = {
      amount: parseFloat(amount),
      category,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: locationName,
      device_model: Device.modelName || 'Unknown Device',
      os: Device.osName || 'Unknown OS',
      note
    };
    
    try {
      const response = await api.post('/transactions/check', transactionData);
      const { is_fraud, fraud_score, id } = response.data;
      
      // If we have a receipt image, upload it now
      if (receiptImage) {
        const formData = new FormData();
        const uriParts = receiptImage.split('.');
        const fileType = uriParts[uriParts.length - 1];

        // @ts-ignore
        formData.append('file', {
          uri: receiptImage,
          name: `receipt_${id}.${fileType}`,
          type: `image/${fileType}`,
        });

        await api.post(`/transactions/${id}/upload-receipt`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (is_fraud || fraud_score > 0.7) {
        router.replace({ 
          pathname: '/alert', 
          params: { 
            id: id.toString(), 
            amount, 
            location: locationName, 
            category,
            merchant: transactionData.merchant || 'Unknown Merchant'
          } 
        });
      } else {
        router.back();
      }
    } catch (error) {
      console.error('API Error:', error);
      import('react-native').then(({ Alert }) => {
        Alert.alert('Error', 'Failed to process transaction. Please check your connection.');
      });
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      import('react-native').then(({ Alert }) => Alert.alert('Permission Denied', 'We need access to your gallery to upload receipts.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      import('react-native').then(({ Alert }) => Alert.alert('Permission Denied', 'We need access to your camera to take receipt photos.'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Transaction</Text>
        <TouchableOpacity style={styles.scanBtn}>
          <Ionicons name="scan" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Auto-Detected Amount</Text>
          <View style={styles.amountInputWrapper}>
            <Text style={styles.currencySymbol}>$</Text>
            <Text style={styles.amountText}>
              {amount ? amount : '---'}
            </Text>
          </View>
          
          {!amount ? (
            <TouchableOpacity style={styles.scanBtnAction} onPress={() => {
              // Simulate scanning a merchant terminal (QR or NFC)
              const detectedAmount = (Math.random() > 0.5 ? 2450.00 : 15.50).toFixed(2);
              setAmount(detectedAmount);
              setCategory(detectedAmount > 100 ? 'Electronics' : 'Food & Drink');
            }}>
              <Ionicons name="scan" size={20} color={Colors.background} style={{ marginRight: 8 }} />
              <Text style={styles.scanBtnText}>Scan Payment Terminal</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>USD - US Dollar (Verified)</Text>
            </View>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <TouchableOpacity style={styles.inputCard}>
            <View style={styles.iconBox}>
              <Ionicons name="bag-handle" size={20} color={Colors.primary} />
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputText}>{category}</Text>
              <Text style={styles.inputSubtext}>Groceries & Lifestyle</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={[styles.formSection, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.sectionLabel}>DATE</Text>
              <TouchableOpacity style={styles.inputCardSmall}>
                <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.inputTextSmall}>Today</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.formSection, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.sectionLabel}>TIME</Text>
              <TouchableOpacity style={styles.inputCardSmall}>
                <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.inputTextSmall}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionLabel}>LOCATION</Text>
          <View style={styles.inputCard}>
            <Ionicons name="location-outline" size={24} color={Colors.textMuted} />
            <Text style={[styles.inputText, { marginLeft: 12, flex: 1 }]}>{locationName}</Text>
          </View>
          
          <Text style={styles.sectionLabel}>RECEIPT PHOTO (optional)</Text>
          <View style={styles.receiptContainer}>
            {receiptImage ? (
              <View style={styles.imagePreviewWrapper}>
                <View style={styles.imagePreview}>
                  <Text style={styles.imageText}>Receipt Attached</Text>
                  <TouchableOpacity style={styles.removeImage} onPress={() => setReceiptImage(null)}>
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.receiptButtons}>
                <TouchableOpacity style={styles.receiptBtn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                  <Text style={styles.receiptBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.receiptBtn} onPress={pickImage}>
                  <Ionicons name="images-outline" size={24} color={Colors.primary} />
                  <Text style={styles.receiptBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>NOTE (optional)</Text>
          <View style={styles.inputCard}>
            <Ionicons name="document-text-outline" size={24} color={Colors.textMuted} />
            <TextInput
              style={[styles.inputText, { marginLeft: 12, flex: 1 }]}
              placeholder="Add a note for this transaction..."
              placeholderTextColor={Colors.textMuted}
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.shieldContainer}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
          <Text style={styles.shieldText}>AI Fraud Check Enabled</Text>
        </View>
        <TouchableOpacity onPress={handleAddTransaction} activeOpacity={0.8} disabled={loading || !amount}>
          <LinearGradient
            colors={!amount ? [Colors.border, Colors.border] : Colors.primaryGradient}
            style={[styles.addBtn, !amount && { opacity: 0.5 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <Text style={styles.addBtnText}>Add Transaction</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 20,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanBtn: {
    padding: 4,
  },
  content: {
    padding: 24,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  amountLabel: {
    color: Colors.textMuted,
    fontSize: 16,
    marginBottom: 16,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    color: Colors.text,
    fontSize: 48,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountText: {
    color: Colors.text,
    fontSize: 48,
    fontWeight: 'bold',
  },
  scanBtnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  scanBtnText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  currencyBadge: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  currencyBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  inputContent: {
    flex: 1,
  },
  inputText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  inputSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputCardSmall: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputTextSmall: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  shieldContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  addBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  receiptContainer: {
    marginBottom: 20,
  },
  receiptButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  receiptBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imagePreviewWrapper: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  imagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  removeImage: {
    padding: 4,
  },
});
