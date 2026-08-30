import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";

import { supabase } from "../lib/supabase";

type ScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "OrcamentoDetalhes"
>;

type BudgetStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

type Budget = {
  id: string;
  code: string;
  client_id: string;
  title: string;
  description: string | null;
  status: BudgetStatus;
  issue_date: string;
  valid_until: string | null;
  discount: number;
  notes: string | null;
};

type Client = {
  id: string;
  name: string;
};

type BudgetItem = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
};

type StatusOption = {
  value: BudgetStatus;
  label: string;
  backgroundColor: string;
  textColor: string;
};

const statusOptions: StatusOption[] = [
  {
    value: "draft",
    label: "Rascunho",
    backgroundColor: "#e8edf0",
    textColor: "#46555c",
  },
  {
    value: "sent",
    label: "Enviado",
    backgroundColor: "#dbeafe",
    textColor: "#1d4ed8",
  },
  {
    value: "approved",
    label: "Aprovado",
    backgroundColor: "#dcfce7",
    textColor: "#15803d",
  },
  {
    value: "rejected",
    label: "Recusado",
    backgroundColor: "#fee2e2",
    textColor: "#b91c1c",
  },
  {
    value: "expired",
    label: "Vencido",
    backgroundColor: "#fef3c7",
    textColor: "#a16207",
  },
  {
    value: "cancelled",
    label: "Cancelado",
    backgroundColor: "#f1f5f9",
    textColor: "#64748b",
  },
];

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarQuantidade(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(valor);
}

function formatarData(data: string | null) {
  if (!data) {
    return "Não informada";
  }

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

export function BudgetDetailsScreen({ route, navigation }: ScreenProps) {
  const { budgetId } = route.params;

  const [budget, setBudget] = useState<Budget | null>(null);

  const [client, setClient] = useState<Client | null>(null);

  const [items, setItems] = useState<BudgetItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);

      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select(
          `
          id,
          code,
          client_id,
          title,
          description,
          status,
          issue_date,
          valid_until,
          discount,
          notes
        `,
        )
        .eq("id", budgetId)
        .single();

      if (budgetError) {
        throw budgetError;
      }

      const [clientResult, itemsResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name")
          .eq("id", budgetData.client_id)
          .maybeSingle(),

        supabase
          .from("budget_items")
          .select(
            `
            id,
            name,
            description,
            unit,
            quantity,
            unit_price,
            total,
            sort_order
          `,
          )
          .eq("budget_id", budgetId)
          .order("sort_order", {
            ascending: true,
          }),
      ]);

      if (clientResult.error) {
        throw clientResult.error;
      }

      if (itemsResult.error) {
        throw itemsResult.error;
      }

      setBudget(budgetData as Budget);
      setClient(clientResult.data as Client | null);
      setItems((itemsResult.data ?? []) as BudgetItem[]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o orçamento.";

      Alert.alert("Erro ao carregar", message);
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useFocusEffect(
    useCallback(() => {
      void carregarDados();
    }, [carregarDados]),
  );

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.total);
    }, 0);
  }, [items]);

  const discount = Number(budget?.discount ?? 0);

  const total = Math.max(subtotal - discount, 0);

  const currentStatus =
    statusOptions.find((option) => option.value === budget?.status) ??
    statusOptions[0];

  async function alterarStatus(newStatus: BudgetStatus) {
    if (!budget) {
      return;
    }

    if (newStatus === budget.status) {
      setStatusModalVisible(false);
      return;
    }

    try {
      setUpdatingStatus(true);

      const { data, error } = await supabase
        .from("budgets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", budgetId)
        .select("status")
        .single();

      if (error) {
        throw error;
      }

      setBudget((currentBudget) => {
        if (!currentBudget) {
          return currentBudget;
        }

        return {
          ...currentBudget,
          status: data.status as BudgetStatus,
        };
      });

      setStatusModalVisible(false);

      Alert.alert("Status atualizado", "O status do orçamento foi alterado.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status.";

      Alert.alert("Erro ao atualizar", message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading && !budget) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando orçamento...</Text>
      </SafeAreaView>
    );
  }

  if (!budget) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>Orçamento não encontrado</Text>

        <Pressable style={styles.retryButton} onPress={carregarDados}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.code}>{budget.code}</Text>

          <Text style={styles.title}>{budget.title}</Text>

          {budget.description ? (
            <Text style={styles.description}>{budget.description}</Text>
          ) : null}

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status atual</Text>

            <Pressable
              style={[
                styles.statusButton,
                {
                  backgroundColor: currentStatus.backgroundColor,
                },
              ]}
              onPress={() => setStatusModalVisible(true)}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  {
                    color: currentStatus.textColor,
                  },
                ]}
              >
                {currentStatus.label}
              </Text>

              <Text
                style={[
                  styles.statusArrow,
                  {
                    color: currentStatus.textColor,
                  },
                ]}
              >
                ▼
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cliente</Text>

          <Text style={styles.clientName}>
            {client?.name ?? "Cliente não encontrado"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datas</Text>

          <View style={styles.informationRow}>
            <Text style={styles.informationLabel}>Emissão</Text>

            <Text style={styles.informationValue}>
              {formatarData(budget.issue_date)}
            </Text>
          </View>

          <View style={styles.informationRow}>
            <Text style={styles.informationLabel}>Validade</Text>

            <Text style={styles.informationValue}>
              {formatarData(budget.valid_until)}
            </Text>
          </View>
        </View>

        <Text style={styles.itemsTitle}>Serviços do orçamento</Text>

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum serviço adicionado</Text>

            <Text style={styles.emptyDescription}>
              Adicione serviços para calcular o valor deste orçamento.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>

                <Text style={styles.itemTotal}>
                  {formatarMoeda(Number(item.total))}
                </Text>
              </View>

              {item.description ? (
                <Text style={styles.itemDescription}>{item.description}</Text>
              ) : null}

              <Text style={styles.itemCalculation}>
                {formatarQuantidade(Number(item.quantity))} {item.unit} ×{" "}
                {formatarMoeda(Number(item.unit_price))}
              </Text>
            </View>
          ))
        )}

        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>

            <Text style={styles.totalValue}>{formatarMoeda(subtotal)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Desconto</Text>

            <Text style={styles.discountValue}>
              - {formatarMoeda(discount)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.finalTotalLabel}>Total</Text>

            <Text style={styles.finalTotalValue}>{formatarMoeda(total)}</Text>
          </View>
        </View>

        {budget.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Observações</Text>

            <Text style={styles.notes}>{budget.notes}</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate("OrcamentoItens", {
              budgetId,
            })
          }
        >
          <Text style={styles.primaryButtonText}>Gerenciar serviços</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            navigation.navigate("OrcamentoFormulario", {
              budgetId,
            })
          }
        >
          <Text style={styles.secondaryButtonText}>
            Editar dados do orçamento
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Alterar status</Text>

            <Text style={styles.modalDescription}>
              Selecione a situação atual do orçamento.
            </Text>

            {statusOptions.map((option) => {
              const selected = option.value === budget.status;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.statusOption,
                    selected && styles.selectedStatusOption,
                  ]}
                  onPress={() => alterarStatus(option.value)}
                  disabled={updatingStatus}
                >
                  <View
                    style={[
                      styles.statusIndicator,
                      {
                        backgroundColor: option.backgroundColor,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusIndicatorCenter,
                        {
                          backgroundColor: option.textColor,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.statusOptionText,
                      {
                        color: option.textColor,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>

                  {selected ? (
                    <Text style={styles.selectedText}>Atual</Text>
                  ) : null}
                </Pressable>
              );
            })}

            {updatingStatus ? (
              <ActivityIndicator color="#17a398" style={styles.modalLoading} />
            ) : null}

            <Pressable
              style={styles.closeModalButton}
              onPress={() => setStatusModalVisible(false)}
              disabled={updatingStatus}
            >
              <Text style={styles.closeModalText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

  loadingContainer: {
    flex: 1,
    backgroundColor: "#f4f7f6",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    color: "#60727a",
    fontSize: 15,
    marginTop: 12,
  },

  errorTitle: {
    color: "#16324f",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: "#17a398",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },

  retryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },

  headerCard: {
    backgroundColor: "#16324f",
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },

  code: {
    color: "#88d8d2",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },

  title: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 8,
  },

  description: {
    color: "#d8e2e7",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
  },

  statusLabel: {
    color: "#d8e2e7",
    fontSize: 14,
  },

  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  statusButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  statusArrow: {
    fontSize: 10,
    marginLeft: 7,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    color: "#60727a",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 10,
  },

  clientName: {
    color: "#16324f",
    fontSize: 19,
    fontWeight: "800",
  },

  informationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  informationLabel: {
    color: "#718087",
    fontSize: 15,
  },

  informationValue: {
    color: "#263238",
    fontSize: 15,
    fontWeight: "700",
  },

  itemsTitle: {
    color: "#16324f",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 12,
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    color: "#16324f",
    fontSize: 17,
    fontWeight: "800",
  },

  emptyDescription: {
    color: "#718087",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },

  itemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 17,
    marginBottom: 10,
  },

  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  itemName: {
    flex: 1,
    color: "#263238",
    fontSize: 16,
    fontWeight: "800",
    paddingRight: 12,
  },

  itemTotal: {
    color: "#17a398",
    fontSize: 16,
    fontWeight: "800",
  },

  itemDescription: {
    color: "#718087",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },

  itemCalculation: {
    color: "#60727a",
    fontSize: 13,
    marginTop: 10,
  },

  totalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    marginBottom: 16,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },

  totalLabel: {
    color: "#60727a",
    fontSize: 15,
  },

  totalValue: {
    color: "#263238",
    fontSize: 15,
    fontWeight: "700",
  },

  discountValue: {
    color: "#b45309",
    fontSize: 15,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5eaec",
    marginVertical: 10,
  },

  finalTotalLabel: {
    color: "#16324f",
    fontSize: 19,
    fontWeight: "800",
  },

  finalTotalValue: {
    color: "#17a398",
    fontSize: 21,
    fontWeight: "800",
  },

  notes: {
    color: "#44545b",
    fontSize: 15,
    lineHeight: 22,
  },

  primaryButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    height: 56,
    borderWidth: 1,
    borderColor: "#16324f",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  secondaryButtonText: {
    color: "#16324f",
    fontSize: 16,
    fontWeight: "800",
  },

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
  },

  modalTitle: {
    color: "#16324f",
    fontSize: 22,
    fontWeight: "800",
  },

  modalDescription: {
    color: "#718087",
    fontSize: 14,
    marginTop: 5,
    marginBottom: 16,
  },

  statusOption: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5eaec",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 9,
  },

  selectedStatusOption: {
    borderColor: "#17a398",
    backgroundColor: "#f2fbfa",
  },

  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  statusIndicatorCenter: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  statusOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 12,
  },

  selectedText: {
    color: "#17a398",
    fontSize: 12,
    fontWeight: "800",
  },

  modalLoading: {
    marginTop: 4,
  },

  closeModalButton: {
    alignItems: "center",
    paddingVertical: 13,
    marginTop: 4,
  },

  closeModalText: {
    color: "#60727a",
    fontSize: 15,
    fontWeight: "700",
  },
});
