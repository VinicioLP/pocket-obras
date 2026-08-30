import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/types";

type BudgetItemsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "OrcamentoItens"
>;

type BudgetSummary = {
  id: string;
  code: string;
  title: string;
  discount: number | string;
  client: {
    name: string;
  } | null;
};

type BudgetItem = {
  id: string;
  service_id: string | null;
  name: string;
  description: string | null;
  unit: string;
  quantity: number | string;
  unit_price: number | string;
  total: number | string;
  sort_order: number;
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarQuantidade(valor: number | string) {
  return Number(valor).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

export function BudgetItemsScreen({
  route,
  navigation,
}: BudgetItemsScreenProps) {
  const { budgetId } = route.params;

  const [orcamento, setOrcamento] = useState<BudgetSummary | null>(null);

  const [itens, setItens] = useState<BudgetItem[]>([]);

  const [carregando, setCarregando] = useState(true);

  const [atualizando, setAtualizando] = useState(false);

  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(
    async (mostrarCarregamento = true) => {
      if (mostrarCarregamento) {
        setCarregando(true);
      }

      setErro(null);

      try {
        const { data: orcamentoData, error: orcamentoError } = await supabase
          .from("budgets")
          .select(
            `
            id,
            code,
            title,
            discount,

            client:clients!budgets_client_id_fkey (
              name
            )
          `,
          )
          .eq("id", budgetId)
          .single();

        if (orcamentoError) {
          throw orcamentoError;
        }

        const { data: itensData, error: itensError } = await supabase
          .from("budget_items")
          .select(
            `
            id,
            service_id,
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
          });

        if (itensError) {
          throw itensError;
        }

        const orcamentoFormatado = {
          ...orcamentoData,
          client: Array.isArray(orcamentoData.client)
            ? (orcamentoData.client[0] ?? null)
            : orcamentoData.client,
        } as BudgetSummary;

        setOrcamento(orcamentoFormatado);

        setItens((itensData ?? []) as BudgetItem[]);
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os itens.";

        setErro(mensagem);
      } finally {
        if (mostrarCarregamento) {
          setCarregando(false);
        }
      }
    },
    [budgetId],
  );

  useFocusEffect(
    useCallback(() => {
      void carregarDados();
    }, [carregarDados]),
  );

  async function atualizarLista() {
    setAtualizando(true);

    await carregarDados(false);

    setAtualizando(false);
  }

  async function removerItem(item: BudgetItem) {
    try {
      setRemovendoId(item.id);

      const { data, error } = await supabase
        .from("budget_items")
        .delete()
        .eq("id", item.id)
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "O item não foi encontrado ou você não possui permissão.",
        );
      }

      setItens((listaAtual) =>
        listaAtual.filter((registro) => registro.id !== item.id),
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível remover o item.";

      Alert.alert("Erro ao remover", mensagem);
    } finally {
      setRemovendoId(null);
    }
  }

  function confirmarRemocao(item: BudgetItem) {
    Alert.alert(
      "Remover item?",
      `Deseja remover "${item.name}" do orçamento?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            void removerItem(item);
          },
        },
      ],
    );
  }

  const subtotal = itens.reduce(
    (soma, item) => soma + Number(item.total ?? 0),
    0,
  );

  const desconto = Number(orcamento?.discount ?? 0);

  const total = Math.max(subtotal - desconto, 0);

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando itens...</Text>
      </View>
    );
  }

  if (erro || !orcamento) {
    return (
      <SafeAreaView style={styles.messageContainer} edges={["bottom"]}>
        <Text style={styles.errorTitle}>Não foi possível carregar</Text>

        <Text style={styles.errorMessage}>
          {erro ?? "Orçamento não encontrado."}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => {
            void carregarDados();
          }}
        >
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.code}>{orcamento.code}</Text>

        <Text style={styles.title}>{orcamento.title}</Text>

        <Text style={styles.client}>
          Cliente: {orcamento.client?.name ?? "Indisponível"}
        </Text>

        <Pressable
          style={styles.newButton}
          onPress={() =>
            navigation.navigate("OrcamentoItemFormulario", {
              budgetId,
            })
          }
        >
          <Text style={styles.newButtonText}>+ Adicionar serviço</Text>
        </Pressable>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          itens.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizarLista}
            colors={["#17a398"]}
            tintColor="#17a398"
          />
        }
        renderItem={({ item }) => {
          const removendo = removendoId === item.id;

          return (
            <View style={styles.itemCard}>
              <Text style={styles.itemName}>{item.name}</Text>

              <Text style={styles.calculation}>
                {formatarQuantidade(item.quantity)} {item.unit} ×{" "}
                {formatarMoeda(Number(item.unit_price))}
              </Text>

              <Text style={styles.itemTotal}>
                {formatarMoeda(Number(item.total))}
              </Text>

              <View style={styles.itemActions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate("OrcamentoItemFormulario", {
                      budgetId,
                      itemId: item.id,
                    })
                  }
                  disabled={removendo}
                >
                  <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.removeButton,
                    removendo && styles.buttonDisabled,
                  ]}
                  onPress={() => confirmarRemocao(item)}
                  disabled={removendo}
                >
                  {removendo ? (
                    <ActivityIndicator size="small" color="#c0392b" />
                  ) : (
                    <Text style={styles.removeButtonText}>Remover</Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Nenhum item adicionado</Text>

            <Text style={styles.emptyDescription}>
              Adicione os serviços que serão realizados.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>

              <Text style={styles.totalValue}>{formatarMoeda(subtotal)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Desconto</Text>

              <Text style={styles.discountValue}>
                - {formatarMoeda(desconto)}
              </Text>
            </View>

            <View style={styles.totalDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.finalLabel}>Total</Text>

              <Text style={styles.finalValue}>{formatarMoeda(total)}</Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  header: {
    padding: 20,
    paddingBottom: 12,
  },

  code: {
    color: "#17a398",
    fontSize: 13,
    fontWeight: "800",
  },

  title: {
    color: "#16324f",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },

  client: {
    color: "#60727a",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
  },

  newButton: {
    height: 50,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  newButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  itemCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  itemName: {
    color: "#16324f",
    fontSize: 17,
    fontWeight: "800",
  },

  calculation: {
    color: "#60727a",
    fontSize: 14,
    marginTop: 8,
  },

  itemTotal: {
    color: "#17a398",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },

  itemActions: {
    flexDirection: "row",
    marginTop: 16,
  },

  editButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#17a398",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  editButtonText: {
    color: "#137c74",
    fontSize: 14,
    fontWeight: "800",
  },

  removeButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#e6b0aa",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  removeButtonText: {
    color: "#c0392b",
    fontSize: 14,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 45,
  },

  emptyTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
  },

  emptyDescription: {
    color: "#60727a",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },

  totalsCard: {
    backgroundColor: "#16324f",
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  totalLabel: {
    color: "#c8d5dc",
    fontSize: 14,
  },

  totalValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  discountValue: {
    color: "#f5b7b1",
    fontSize: 14,
    fontWeight: "700",
  },

  totalDivider: {
    height: 1,
    backgroundColor: "#486176",
    marginBottom: 16,
  },

  finalLabel: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },

  finalValue: {
    color: "#5ce0d2",
    fontSize: 20,
    fontWeight: "800",
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#f4f7f6",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#60727a",
    marginTop: 12,
  },

  messageContainer: {
    flex: 1,
    backgroundColor: "#f4f7f6",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  errorTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
  },

  errorMessage: {
    color: "#60727a",
    textAlign: "center",
    marginTop: 8,
  },

  retryButton: {
    backgroundColor: "#16324f",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },

  retryText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
