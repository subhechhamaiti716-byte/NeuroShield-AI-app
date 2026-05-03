import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import api from '../../utils/api';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: Colors.card,
  backgroundGradientTo: Colors.card,
  color: (opacity = 1) => `rgba(0, 209, 255, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: Colors.primary
  }
};

interface AnalyticsData {
  total_transactions: number;
  total_spent: number;
  total_received: number;
  fraud_count: number;
  safe_count: number;
  risk_score: number;
  category_breakdown: Record<string, number>;
}

export default function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/transactions/analytics/summary');
      setData(response.data);
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const riskPercentage = data ? Math.round((1 - data.risk_score) * 100) : 0;
  const categories = data ? Object.entries(data.category_breakdown) : [];
  const maxCategoryValue = categories.length > 0 ? Math.max(...categories.map(([_, v]) => v)) : 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Transactions</Text>
            <Text style={styles.statValue}>{data?.total_transactions || 0}</Text>
            <View style={[styles.statBadge, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
              <Text style={[styles.statBadgeText, { color: Colors.secondary }]}>
                {data?.fraud_count || 0} Suspicious
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={styles.statValue}>₹{(data?.total_spent || 0).toLocaleString('en-IN')}</Text>
            <View style={[styles.statBadge, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
              <Text style={[styles.statBadgeText, { color: Colors.success }]}>
                Risk: {data && data.risk_score < 0.3 ? 'Low' : data && data.risk_score < 0.6 ? 'Medium' : 'High'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Spending Trend (Last 7 Days)</Text>
          <LineChart
            data={{
              labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              datasets: [{ data: [200, 450, 280, 800, 990, 430, 300] }]
            }}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
          />
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressCard}>
            <Text style={styles.cardTitle}>AI Health Score</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>{riskPercentage}%</Text>
              <Text style={styles.scoreSubtext}>Safe Activity</Text>
            </View>
            <ProgressChart
              data={{ labels: ["Safe"], data: [riskPercentage / 100] }}
              width={100}
              height={100}
              strokeWidth={10}
              radius={32}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
              }}
              hideLegend={true}
              style={styles.progressChart}
            />
          </View>

          <View style={styles.progressCard}>
            <Text style={styles.cardTitle}>Protected Txns</Text>
            <View style={styles.scoreContainer}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
            </View>
            <ProgressChart
              data={{ labels: ["Protected"], data: [1.0] }}
              width={100}
              height={100}
              strokeWidth={10}
              radius={32}
              chartConfig={chartConfig}
              hideLegend={true}
              style={styles.progressChart}
            />
          </View>
        </View>

        <View style={styles.categoryCard}>
          <Text style={styles.cardTitle}>Category Spending Breakdown</Text>
          
          {categories.length > 0 ? categories.map(([name, amount], index) => (
            <View key={name} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{name}</Text>
                <Text style={styles.categoryAmount}>₹{amount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${(amount / maxCategoryValue) * 100}%`, 
                      backgroundColor: index % 2 === 0 ? Colors.primary : '#A020F0' 
                    }
                  ]} 
                />
              </View>
            </View>
          )) : (
            <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>No category data available</Text>
          )}
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    padding: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
    marginTop: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  progressChart: {
    position: 'absolute',
    top: 50,
  },
  scoreContainer: {
    position: 'absolute',
    top: 75,
    alignItems: 'center',
    zIndex: 10,
  },
  scoreText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreSubtext: {
    color: Colors.textMuted,
    fontSize: 8,
  },
  categoryCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    color: Colors.text,
    fontSize: 14,
  },
  categoryAmount: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
