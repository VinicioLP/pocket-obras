import { useCallback, useState, type ComponentProps } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { BarChart } from "react-native-gifted-charts";

import { useFocusEffect, useNavigation } from "@react-navigation/native";

import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Session } from "@supabase/supabase-js";

import type { MainTabParamList, RootStackParamList } from "../navigation/types";

import {
  getDashboardData,
  type DashboardData,
} from "../services/dashboardService";

type HomeScreenProps = {
  session?: Session;
};

type IconName = ComponentProps<typeof Ionicons>["name"];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatCompactValue(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} mi`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} mil`;
  }

  return String(Math.round(value));
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: IconName;
  iconColor: string;
  iconBackground: string;
};

function MetricCard({
  title,
  value,
  detail,
  icon,
  iconColor,
  iconBackground,
}: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <Text style={styles.metricTitle}>{title}</Text>

      <Text style={styles.metricValue}>{value}</Text>

      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

export function HomeScreen({ session }: HomeScreenProps) {
  const { width } = useWindowDimensions();

  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList, "Inicio">>();

  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboardData();

      setDashboard(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o dashboard.";

      Alert.alert("Erro ao carregar dados", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadDashboard();
    }, [loadDashboard]),
  );

  function refreshDashboard() {
    setRefreshing(true);
    void loadDashboard();
  }

  const metadataName = session?.user.user_metadata?.full_name;

  const displayName =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim().split(" ")[0]
      : "profissional";

  const chartWidth = Math.max(width - 90, 250);

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando seu faturamento...</Text>
      </SafeAreaView>
    );
  }

  if (!dashboard) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={42} color="#dc2626" />

        <Text style={styles.errorTitle}>Não foi possível carregar</Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            void loadDashboard();
          }}
        >
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const hasChartData = dashboard.monthlyRevenue.some((item) => item.value > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshDashboard}
            colors={["#17a398"]}
            tintColor="#17a398"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {displayName}</Text>

            <Text style={styles.headerSubtitle}>
              Confira o desempenho do seu trabalho
            </Text>
          </View>

          <View style={styles.periodBadge}>
            <Ionicons name="calendar-outline" size={15} color="#176b66" />

            <Text style={styles.periodText}>Este mês</Text>
          </View>
        </View>

        <LinearGradient
          colors={["#16324f", "#176b66", "#17a398"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.revenueCard}
        >
          <View style={styles.revenueHeader}>
            <View>
              <Text style={styles.revenueLabel}>Faturamento recebido</Text>

              <Text style={styles.revenuePeriod}>Total recebido neste mês</Text>
            </View>

            <View style={styles.revenueIcon}>
              <Ionicons name="wallet-outline" size={24} color="#ffffff" />
            </View>
          </View>

          <Text style={styles.revenueValue}>
            {formatCurrency(dashboard.receivedThisMonth)}
          </Text>

          <View style={styles.revenueFooter}>
            <Ionicons name="checkmark-circle" size={17} color="#b8fff4" />

            <Text style={styles.revenueFooterText}>
              {dashboard.paymentCountThisMonth}{" "}
              {dashboard.paymentCountThisMonth === 1
                ? "pagamento recebido"
                : "pagamentos recebidos"}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="A receber"
            value={formatCurrency(dashboard.receivableAmount)}
            detail={`${dashboard.openCount} cobranças abertas`}
            icon="time-outline"
            iconColor="#176b66"
            iconBackground="#def7f3"
          />

          <MetricCard
            title="Em atraso"
            value={formatCurrency(dashboard.overdueAmount)}
            detail={`${dashboard.overdueCount} cobranças vencidas`}
            icon="alert-circle-outline"
            iconColor="#dc2626"
            iconBackground="#fee2e2"
          />

          <MetricCard
            title="Ticket médio"
            value={formatCurrency(dashboard.averageTicket)}
            detail="Média por pagamento"
            icon="trending-up-outline"
            iconColor="#2563eb"
            iconBackground="#dbeafe"
          />

          <MetricCard
            title="Recebimentos"
            value={String(dashboard.paymentCountThisMonth)}
            detail="Pagamentos neste mês"
            icon="receipt-outline"
            iconColor="#b45309"
            iconBackground="#fef3c7"
          />
        </View>

        <View style={styles.quickActions}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => rootNavigation?.navigate("CobrancaFormulario")}
          >
            <Ionicons name="add-circle-outline" size={22} color="#ffffff" />

            <Text style={styles.primaryActionText}>Nova cobrança</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={() => rootNavigation?.navigate("Cobrancas")}
          >
            <Ionicons name="cash-outline" size={22} color="#16324f" />

            <Text style={styles.secondaryActionText}>Ver financeiro</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Evolução do faturamento</Text>

              <Text style={styles.sectionSubtitle}>
                Valores recebidos nos últimos 6 meses
              </Text>
            </View>

            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />

              <Text style={styles.legendText}>Recebido</Text>
            </View>
          </View>

          {hasChartData ? (
            <View style={styles.chartContainer}>
              <BarChart
                data={dashboard.monthlyRevenue}
                width={chartWidth}
                height={180}
                barWidth={27}
                spacing={18}
                initialSpacing={10}
                endSpacing={10}
                roundedTop
                hideRules
                noOfSections={4}
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisLabelWidth={48}
                xAxisLabelTextStyle={styles.chartXAxisText}
                yAxisTextStyle={styles.chartYAxisText}
                formatYLabel={(value) => formatCompactValue(Number(value))}
                isAnimated
              />
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={36} color="#9ba9af" />

              <Text style={styles.emptyTitle}>
                Nenhum recebimento registrado
              </Text>

              <Text style={styles.emptyDescription}>
                O gráfico será preenchido quando você registrar pagamentos.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Próximas cobranças</Text>

              <Text style={styles.sectionSubtitle}>
                Valores pendentes e vencidos
              </Text>
            </View>

            <Pressable onPress={() => rootNavigation?.navigate("Cobrancas")}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </Pressable>
          </View>

          {dashboard.upcomingReceivables.length === 0 ? (
            <View style={styles.emptyReceivables}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={38}
                color="#17a398"
              />

              <Text style={styles.emptyTitle}>Nenhuma cobrança pendente</Text>

              <Text style={styles.emptyDescription}>
                Suas cobranças em aberto aparecerão aqui.
              </Text>
            </View>
          ) : (
            dashboard.upcomingReceivables.map((receivable, index) => (
              <Pressable
                key={receivable.id}
                style={[
                  styles.receivableItem,
                  index > 0 && styles.receivableItemBorder,
                ]}
                onPress={() =>
                  rootNavigation?.navigate("CobrancaDetalhes", {
                    receivableId: receivable.id,
                  })
                }
              >
                <View
                  style={[
                    styles.statusIndicator,
                    {
                      backgroundColor: receivable.overdue
                        ? "#dc2626"
                        : "#f59e0b",
                    },
                  ]}
                />

                <View style={styles.receivableInformation}>
                  <Text style={styles.receivableDescription} numberOfLines={1}>
                    {receivable.description}
                  </Text>

                  <Text style={styles.receivableClient} numberOfLines={1}>
                    {receivable.clientName}
                  </Text>

                  <Text
                    style={[
                      styles.receivableDueDate,
                      receivable.overdue && styles.overdueText,
                    ]}
                  >
                    {receivable.overdue ? "Venceu" : "Vence"} em{" "}
                    {formatDate(receivable.dueDate)}
                  </Text>
                </View>

                <View style={styles.receivableValueArea}>
                  <Text style={styles.receivableValue}>
                    {formatCurrency(receivable.remaining)}
                  </Text>

                  <Text
                    style={[
                      styles.receivableStatus,
                      receivable.overdue && styles.overdueText,
                    ]}
                  >
                    {receivable.overdue
                      ? "Atrasada"
                      : receivable.partial
                        ? "Parcial"
                        : "Pendente"}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#9ba9af" />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f7f6",
    padding: 24,
  },

  loadingText: {
    color: "#60727a",
    fontSize: 15,
    marginTop: 14,
  },

  errorTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },

  retryButton: {
    backgroundColor: "#17a398",
    borderRadius: 12,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },

  retryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  greeting: {
    color: "#16324f",
    fontSize: 25,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#6b7c83",
    fontSize: 13,
    marginTop: 3,
  },

  periodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2f4f1",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  periodText: {
    color: "#176b66",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },

  revenueCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
  },

  revenueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  revenueLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  revenuePeriod: {
    color: "#d9fffa",
    fontSize: 12,
    marginTop: 4,
  },

  revenueIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  revenueValue: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 25,
  },

  revenueFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },

  revenueFooterText: {
    color: "#d9fffa",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  metricCard: {
    width: "48.5%",
    minHeight: 155,
    backgroundColor: "#ffffff",
    borderRadius: 19,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#16324f",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  metricTitle: {
    color: "#66777e",
    fontSize: 12,
    fontWeight: "600",
  },

  metricValue: {
    color: "#16324f",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 5,
  },

  metricDetail: {
    color: "#8b989e",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  quickActions: {
    flexDirection: "row",
    marginTop: 5,
    marginBottom: 16,
  },

  primaryAction: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17a398",
    borderRadius: 15,
    marginRight: 6,
  },

  primaryActionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 7,
  },

  secondaryAction: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe3e5",
    borderRadius: 15,
    marginLeft: 6,
  },

  secondaryActionText: {
    color: "#16324f",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 7,
  },

  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 17,
    marginBottom: 16,
    shadowColor: "#16324f",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  sectionTitle: {
    color: "#16324f",
    fontSize: 17,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#819096",
    fontSize: 11,
    marginTop: 4,
  },

  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#17a398",
    marginRight: 5,
  },

  legendText: {
    color: "#718087",
    fontSize: 10,
  },

  chartContainer: {
    alignItems: "center",
    overflow: "hidden",
  },

  chartXAxisText: {
    color: "#718087",
    fontSize: 10,
    fontWeight: "700",
  },

  chartYAxisText: {
    color: "#9aa7ac",
    fontSize: 9,
  },

  emptyChart: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    paddingHorizontal: 20,
  },

  emptyReceivables: {
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    color: "#344b59",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },

  emptyDescription: {
    color: "#87959b",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },

  seeAllText: {
    color: "#17a398",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 8,
  },

  receivableItem: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },

  receivableItemBorder: {
    borderTopWidth: 1,
    borderTopColor: "#edf1f2",
  },

  statusIndicator: {
    width: 5,
    height: 43,
    borderRadius: 4,
    marginRight: 12,
  },

  receivableInformation: {
    flex: 1,
    paddingRight: 8,
  },

  receivableDescription: {
    color: "#263d49",
    fontSize: 14,
    fontWeight: "800",
  },

  receivableClient: {
    color: "#65777f",
    fontSize: 12,
    marginTop: 3,
  },

  receivableDueDate: {
    color: "#a16207",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },

  receivableValueArea: {
    alignItems: "flex-end",
    marginRight: 7,
  },

  receivableValue: {
    color: "#16324f",
    fontSize: 13,
    fontWeight: "900",
  },

  receivableStatus: {
    color: "#a16207",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 5,
  },

  overdueText: {
    color: "#dc2626",
  },
});
