import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../lib/supabase";

type BudgetStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

type BudgetFilter = "all" | BudgetStatus;

type BudgetClient = {
  id: string;
  name: string;
};

type BudgetItemSummary = {
  total: number | string;
};

type Budget = {
  id: string;
  code: string;
  title: string;
  status: BudgetStatus;
  issue_date: string;
  valid_until: string | null;
  discount: number | string;
  created_at: string;
  client: BudgetClient | null;
  items: BudgetItemSummary[];
};

const statusConfig: Record<
  BudgetStatus,
  {
    label: string;
    backgroundColor: string;
    color: string;
  }
> = {
  draft: {
    label: "Rascunho",
    backgroundColor: "#eceff1",
    color: "#60727a",
  },

  sent: {
    label: "Enviado",
    backgroundColor: "#e3f2fd",
    color: "#2471a3",
  },

  approved: {
    label: "Aprovado",
    backgroundColor: "#dff5f1",
    color: "#137c74",
  },

  rejected: {
    label: "Recusado",
    backgroundColor: "#fdecea",
    color: "#c0392b",
  },

  expired: {
    label: "Vencido",
    backgroundColor: "#fff3cd",
    color: "#9a6700",
  },

  cancelled: {
    label: "Cancelado",
    backgroundColor: "#eceff1",
    color: "#546e7a",
  },
};

const filtros: Array<{
  value: BudgetFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "Todos",
  },
  {
    value: "draft",
    label: "Rascunhos",
  },
  {
    value: "sent",
    label: "Enviados",
  },
  {
    value: "approved",
    label: "Aprovados",
  },
  {
    value: "rejected",
    label: "Recusados",
  },
  {
    value: "expired",
    label: "Vencidos",
  },
  {
    value: "cancelled",
    label: "Cancelados",
  },
];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string | null) {
  if (!data) {
    return "Sem validade";
  }

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calcularTotal(orcamento: Budget) {
  const subtotal = (orcamento.items ?? []).reduce(
    (soma, item) => soma + Number(item.total ?? 0),
    0,
  );

  const desconto = Number(orcamento.discount ?? 0);

  return Math.max(subtotal - desconto, 0);
}

export function BudgetsScreen() {
  const [orcamentos, setOrcamentos] = useState<Budget[]>([]);

  const [busca, setBusca] = useState("");

  const [filtro, setFiltro] = useState<BudgetFilter>("all");

  const [carregando, setCarregando] = useState(true);

  const [atualizando, setAtualizando] = useState(false);

  const [erro, setErro] = useState<string | null>(null);

  const carregarOrcamentos = useCallback(async (mostrarCarregamento = true) => {
    if (mostrarCarregamento) {
      setCarregando(true);
    }

    setErro(null);

    try {
      const { data, error } = await supabase
        .from("budgets")
        .select(
          `
                id,
                code,
                title,
                status,
                issue_date,
                valid_until,
                discount,
                created_at,

                client:clients!budgets_client_id_fkey (
                  id,
                  name
                ),

                items:budget_items (
                  total
                )
              `,
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const orcamentosFormatados = (data ?? []).map((item: any) => ({
        ...item,
        client: Array.isArray(item.client)
          ? (item.client[0] ?? null)
          : item.client,
      })) as Budget[];

      setOrcamentos(orcamentosFormatados);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os orçamentos.";

      setErro(mensagem);
    } finally {
      if (mostrarCarregamento) {
        setCarregando(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarOrcamentos();
    }, [carregarOrcamentos]),
  );

  const atualizarLista = useCallback(async () => {
    setAtualizando(true);

    await carregarOrcamentos(false);

    setAtualizando(false);
  }, [carregarOrcamentos]);

  const orcamentosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return orcamentos.filter((orcamento) => {
      const correspondeStatus = filtro === "all" || orcamento.status === filtro;

      const textoDoOrcamento = normalizarTexto(
        [orcamento.code, orcamento.title, orcamento.client?.name ?? ""].join(
          " ",
        ),
      );

      const correspondeBusca =
        termo.length === 0 || textoDoOrcamento.includes(termo);

      return correspondeStatus && correspondeBusca;
    });
  }, [busca, filtro, orcamentos]);

  function renderizarOrcamento({ item }: { item: Budget }) {
    const configuracao = statusConfig[item.status];

    const total = calcularTotal(item);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.code}>{item.code}</Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: configuracao.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: configuracao.color,
                },
              ]}
            >
              {configuracao.label}
            </Text>
          </View>
        </View>

        <Text style={styles.budgetTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.clientName}>
          Cliente: {item.client?.name ?? "Cliente indisponível"}
        </Text>

        <View style={styles.divider} />

        <View style={styles.informationRow}>
          <View style={styles.information}>
            <Text style={styles.informationLabel}>Emissão</Text>

            <Text style={styles.informationValue}>
              {formatarData(item.issue_date)}
            </Text>
          </View>

          <View style={styles.information}>
            <Text style={styles.informationLabel}>Validade</Text>

            <Text style={styles.informationValue}>
              {formatarData(item.valid_until)}
            </Text>
          </View>

          <View style={[styles.information, styles.totalInformation]}>
            <Text style={styles.informationLabel}>Total</Text>

            <Text style={styles.total}>{formatarMoeda(total)}</Text>
          </View>
        </View>

        <Text style={styles.itemsCount}>
          {item.items?.length ?? 0}{" "}
          {(item.items?.length ?? 0) === 1 ? "item" : "itens"}
        </Text>
      </View>
    );
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando orçamentos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Orçamentos</Text>

        <Text style={styles.subtitle}>
          Consulte propostas e acompanhe suas situações.
        </Text>

        <TextInput
          style={styles.searchInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por código, título ou cliente"
          placeholderTextColor="#87959d"
          autoCorrect={false}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {filtros.map((item) => {
            const selecionado = filtro === item.value;

            return (
              <Pressable
                key={item.value}
                style={[
                  styles.filterButton,
                  selecionado && styles.filterButtonSelected,
                ]}
                onPress={() => setFiltro(item.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selecionado && styles.filterTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {erro ? (
        <View style={styles.messageContainer}>
          <Text style={styles.errorTitle}>Não foi possível carregar</Text>

          <Text style={styles.errorMessage}>{erro}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              void carregarOrcamentos();
            }}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orcamentosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderizarOrcamento}
          contentContainerStyle={[
            styles.listContent,
            orcamentosFiltrados.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={atualizarLista}
              colors={["#17a398"]}
              tintColor="#17a398"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Nenhum orçamento encontrado</Text>

              <Text style={styles.emptyDescription}>
                {busca.trim() || filtro !== "all"
                  ? "Altere a busca ou selecione outro filtro."
                  : "Você ainda não possui orçamentos cadastrados."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#f4f7f6",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#60727a",
    fontSize: 15,
    marginTop: 12,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  title: {
    color: "#16324f",
    fontSize: 30,
    fontWeight: "800",
  },

  subtitle: {
    color: "#60727a",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 20,
  },

  searchInput: {
    height: 50,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    color: "#263238",
    fontSize: 15,
    paddingHorizontal: 16,
  },

  filters: {
    paddingTop: 12,
    paddingBottom: 4,
  },

  filterButton: {
    backgroundColor: "#e6ecee",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginRight: 8,
  },

  filterButtonSelected: {
    backgroundColor: "#17a398",
  },

  filterText: {
    color: "#60727a",
    fontSize: 13,
    fontWeight: "700",
  },

  filterTextSelected: {
    color: "#ffffff",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  code: {
    color: "#17a398",
    fontSize: 13,
    fontWeight: "800",
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  budgetTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    marginTop: 14,
  },

  clientName: {
    color: "#60727a",
    fontSize: 14,
    marginTop: 6,
  },

  divider: {
    height: 1,
    backgroundColor: "#edf1f2",
    marginVertical: 16,
  },

  informationRow: {
    flexDirection: "row",
  },

  information: {
    flex: 1,
  },

  totalInformation: {
    alignItems: "flex-end",
  },

  informationLabel: {
    color: "#87959d",
    fontSize: 12,
    fontWeight: "700",
  },

  informationValue: {
    color: "#263238",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },

  total: {
    color: "#17a398",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 3,
  },

  itemsCount: {
    color: "#87959d",
    fontSize: 12,
    marginTop: 14,
  },

  messageContainer: {
    flex: 1,
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
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 14,
    fontWeight: "800",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  emptyTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyDescription: {
    color: "#60727a",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
});
