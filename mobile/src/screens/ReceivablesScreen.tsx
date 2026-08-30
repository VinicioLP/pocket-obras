import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect } from "@react-navigation/native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";

import { supabase } from "../lib/supabase";

type ScreenProps = NativeStackScreenProps<RootStackParamList, "Cobrancas">;

type ReceivableStatus = "pending" | "partial" | "paid" | "cancelled";

type ClientRelation = {
  id: string;
  name: string;
};

type Receivable = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: ReceivableStatus;
  installment_number: number;
  installment_total: number;

  client: ClientRelation | ClientRelation[] | null;
};

type DisplayStatus = ReceivableStatus | "overdue";

const statusConfig: Record<
  DisplayStatus,
  {
    label: string;
    background: string;
    color: string;
  }
> = {
  pending: {
    label: "Pendente",
    background: "#fef3c7",
    color: "#a16207",
  },

  partial: {
    label: "Parcial",
    background: "#dbeafe",
    color: "#1d4ed8",
  },

  paid: {
    label: "Pago",
    background: "#dcfce7",
    color: "#15803d",
  },

  cancelled: {
    label: "Cancelado",
    background: "#f1f5f9",
    color: "#64748b",
  },

  overdue: {
    label: "Atrasado",
    background: "#fee2e2",
    color: "#b91c1c",
  },
};

function formatarMoeda(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatarData(value: string) {
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function obterDataLocal() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function obterNomeCliente(client: Receivable["client"]) {
  if (!client) {
    return "Cliente não encontrado";
  }

  if (Array.isArray(client)) {
    return client[0]?.name ?? "Cliente não encontrado";
  }

  return client.name;
}

function obterStatus(receivable: Receivable): DisplayStatus {
  if (receivable.status === "paid" || receivable.status === "cancelled") {
    return receivable.status;
  }

  if (receivable.due_date < obterDataLocal()) {
    return "overdue";
  }

  return receivable.status;
}

export function ReceivablesScreen({ navigation }: ScreenProps) {
  const [receivables, setReceivables] = useState<Receivable[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const carregarCobrancas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("receivables")
        .select(
          `
            id,
            description,
            amount,
            due_date,
            status,
            installment_number,
            installment_total,
            client:clients!receivables_client_id_fkey (
              id,
              name
            )
          `,
        )
        .order("due_date", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setReceivables((data ?? []) as Receivable[]);
    } catch (error) {
      console.error("Erro ao carregar cobranças:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarCobrancas();
    }, [carregarCobrancas]),
  );

  const quantities = useMemo(() => {
    return receivables.reduce(
      (result, receivable) => {
        const status = obterStatus(receivable);

        if (status === "paid") {
          result.paid += 1;
        } else if (status === "overdue") {
          result.overdue += 1;
        } else if (status !== "cancelled") {
          result.open += 1;
        }

        return result;
      },
      {
        open: 0,
        overdue: 0,
        paid: 0,
      },
    );
  }, [receivables]);

  function atualizar() {
    setRefreshing(true);
    void carregarCobrancas();
  }

  if (loading) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando cobranças...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <FlatList
        data={receivables}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.content,
          receivables.length === 0 && styles.emptyContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={atualizar}
            colors={["#17a398"]}
            tintColor="#17a398"
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heading}>
              <View style={styles.headingText}>
                <Text style={styles.title}>Cobranças</Text>

                <Text style={styles.subtitle}>
                  Controle os valores que seus clientes precisam pagar.
                </Text>
              </View>

              <Pressable
                style={styles.addButton}
                onPress={() => navigation.navigate("CobrancaFormulario")}
              >
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            </View>

            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{quantities.open}</Text>

                <Text style={styles.summaryLabel}>Em aberto</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, styles.overdueNumber]}>
                  {quantities.overdue}
                </Text>

                <Text style={styles.summaryLabel}>Atrasadas</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, styles.paidNumber]}>
                  {quantities.paid}
                </Text>

                <Text style={styles.summaryLabel}>Pagas</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>R$</Text>

            <Text style={styles.emptyTitle}>Nenhuma cobrança cadastrada</Text>

            <Text style={styles.emptyDescription}>
              Cadastre a primeira cobrança para começar o controle financeiro.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() => navigation.navigate("CobrancaFormulario")}
            >
              <Text style={styles.emptyButtonText}>Nova cobrança</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const displayStatus = obterStatus(item);

          const status = statusConfig[displayStatus];

          return (
            <View style={styles.receivableCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleArea}>
                  <Text style={styles.clientName}>
                    {obterNomeCliente(item.client)}
                  </Text>

                  <Text style={styles.description}>{item.description}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: status.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: status.color,
                      },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.amount}>{formatarMoeda(item.amount)}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.dueDate}>
                  Vencimento: {formatarData(item.due_date)}
                </Text>

                <Text style={styles.installment}>
                  Parcela {item.installment_number}/{item.installment_total}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  emptyContent: {
    flexGrow: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f7f6",
  },

  loadingText: {
    color: "#60727a",
    fontSize: 15,
    marginTop: 12,
  },

  heading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  headingText: {
    flex: 1,
    paddingRight: 16,
  },

  title: {
    color: "#16324f",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#718087",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },

  addButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#17a398",
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "400",
    lineHeight: 32,
  },

  summaryContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 4,
  },

  summaryNumber: {
    color: "#d97706",
    fontSize: 22,
    fontWeight: "800",
  },

  overdueNumber: {
    color: "#dc2626",
  },

  paidNumber: {
    color: "#16a34a",
  },

  summaryLabel: {
    color: "#718087",
    fontSize: 12,
    marginTop: 3,
  },

  receivableCard: {
    backgroundColor: "#ffffff",
    borderRadius: 17,
    padding: 18,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  cardTitleArea: {
    flex: 1,
    paddingRight: 12,
  },

  clientName: {
    color: "#16324f",
    fontSize: 17,
    fontWeight: "800",
  },

  description: {
    color: "#718087",
    fontSize: 14,
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  amount: {
    color: "#17a398",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  dueDate: {
    color: "#60727a",
    fontSize: 12,
  },

  installment: {
    color: "#60727a",
    fontSize: 12,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    alignItems: "center",
    padding: 28,
    marginTop: 20,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#e4f6f4",
    color: "#17a398",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 64,
  },

  emptyTitle: {
    color: "#16324f",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 18,
  },

  emptyDescription: {
    color: "#718087",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },

  emptyButton: {
    backgroundColor: "#17a398",
    borderRadius: 13,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 20,
  },

  emptyButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
