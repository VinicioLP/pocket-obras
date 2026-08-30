import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../lib/supabase";

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  unit_price: number;
  active: boolean;
  created_at: string;
};

type FilterType = "ativos" | "arquivados";

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ServicesScreen() {
  const [servicos, setServicos] = useState<Service[]>([]);

  const [busca, setBusca] = useState("");

  const [filtro, setFiltro] = useState<FilterType>("ativos");

  const [carregando, setCarregando] = useState(true);

  const [atualizando, setAtualizando] = useState(false);

  const [alterandoId, setAlterandoId] = useState<string | null>(null);

  const [erro, setErro] = useState<string | null>(null);

  const carregarServicos = useCallback(async (mostrarCarregamento = true) => {
    if (mostrarCarregamento) {
      setCarregando(true);
    }

    setErro(null);

    try {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
              id,
              name,
              description,
              category,
              unit,
              unit_price,
              active,
              created_at
            `,
        )
        .order("name", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setServicos(data ?? []);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os serviços.";

      setErro(mensagem);
    } finally {
      if (mostrarCarregamento) {
        setCarregando(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarServicos();
    }, [carregarServicos]),
  );

  const atualizarLista = useCallback(async () => {
    setAtualizando(true);

    await carregarServicos(false);

    setAtualizando(false);
  }, [carregarServicos]);

  const servicosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return servicos.filter((servico) => {
      const correspondeStatus =
        filtro === "ativos" ? servico.active : !servico.active;

      const correspondeBusca =
        termo.length === 0 ||
        servico.name.toLowerCase().includes(termo) ||
        (servico.category ?? "").toLowerCase().includes(termo) ||
        (servico.description ?? "").toLowerCase().includes(termo);

      return correspondeStatus && correspondeBusca;
    });
  }, [busca, filtro, servicos]);

  async function alterarStatus(servico: Service) {
    const novoStatus = !servico.active;

    try {
      setAlterandoId(servico.id);

      const { data, error } = await supabase
        .from("services")
        .update({
          active: novoStatus,
        })
        .eq("id", servico.id)
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "O serviço não foi encontrado ou você não possui permissão.",
        );
      }

      setServicos((listaAtual) =>
        listaAtual.map((item) =>
          item.id === servico.id
            ? {
                ...item,
                active: novoStatus,
              }
            : item,
        ),
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o serviço.";

      Alert.alert("Erro ao alterar serviço", mensagem);
    } finally {
      setAlterandoId(null);
    }
  }

  function confirmarAlteracao(servico: Service) {
    const vaiReativar = !servico.active;

    Alert.alert(
      vaiReativar ? "Reativar serviço?" : "Arquivar serviço?",
      vaiReativar
        ? `Deseja reativar "${servico.name}"?`
        : `Deseja arquivar "${servico.name}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: vaiReativar ? "Reativar" : "Arquivar",
          style: vaiReativar ? "default" : "destructive",
          onPress: () => {
            void alterarStatus(servico);
          },
        },
      ],
    );
  }

  function renderizarServico({ item }: { item: Service }) {
    const estaAlterando = alterandoId === item.id;

    return (
      <View style={styles.serviceCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInformation}>
            <Text style={styles.serviceName}>{item.name}</Text>

            <Text style={styles.category}>
              {item.category || "Sem categoria"}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatarMoeda(item.unit_price)}</Text>

            <Text style={styles.unit}>por {item.unit}</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View
            style={[
              styles.statusBadge,
              item.active ? styles.activeBadge : styles.archivedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.active ? styles.activeText : styles.archivedText,
              ]}
            >
              {item.active ? "Ativo" : "Arquivado"}
            </Text>
          </View>

          <Pressable
            style={[
              styles.statusButton,
              estaAlterando && styles.buttonDisabled,
            ]}
            onPress={() => confirmarAlteracao(item)}
            disabled={estaAlterando}
          >
            {estaAlterando ? (
              <ActivityIndicator size="small" color="#16324f" />
            ) : (
              <Text style={styles.statusButtonText}>
                {item.active ? "Arquivar" : "Reativar"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando serviços...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Serviços</Text>

        <Text style={styles.subtitle}>
          Serviços utilizados na criação dos orçamentos.
        </Text>

        <TextInput
          style={styles.searchInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar serviço..."
          placeholderTextColor="#87959d"
          autoCorrect={false}
        />

        <View style={styles.filters}>
          <Pressable
            style={[
              styles.filterButton,
              filtro === "ativos" && styles.filterButtonSelected,
            ]}
            onPress={() => setFiltro("ativos")}
          >
            <Text
              style={[
                styles.filterText,
                filtro === "ativos" && styles.filterTextSelected,
              ]}
            >
              Ativos
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              filtro === "arquivados" && styles.filterButtonSelected,
            ]}
            onPress={() => setFiltro("arquivados")}
          >
            <Text
              style={[
                styles.filterText,
                filtro === "arquivados" && styles.filterTextSelected,
              ]}
            >
              Arquivados
            </Text>
          </Pressable>
        </View>
      </View>

      {erro ? (
        <View style={styles.messageContainer}>
          <Text style={styles.errorTitle}>Não foi possível carregar</Text>

          <Text style={styles.errorMessage}>{erro}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              void carregarServicos();
            }}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={servicosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderizarServico}
          contentContainerStyle={[
            styles.listContent,
            servicosFiltrados.length === 0 && styles.emptyListContent,
          ]}
          keyboardShouldPersistTaps="handled"
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
              <Text style={styles.emptyTitle}>Nenhum serviço encontrado</Text>

              <Text style={styles.emptyDescription}>
                {busca.trim()
                  ? "Tente pesquisar usando outro nome ou categoria."
                  : filtro === "ativos"
                    ? "Você ainda não possui serviços ativos."
                    : "Você não possui serviços arquivados."}
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
    fontSize: 16,
    paddingHorizontal: 16,
  },

  filters: {
    flexDirection: "row",
    backgroundColor: "#e6ecee",
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
  },

  filterButton: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonSelected: {
    backgroundColor: "#ffffff",
  },

  filterText: {
    color: "#60727a",
    fontSize: 14,
    fontWeight: "700",
  },

  filterTextSelected: {
    color: "#17a398",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  serviceCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardInformation: {
    flex: 1,
    paddingRight: 12,
  },

  serviceName: {
    color: "#16324f",
    fontSize: 17,
    fontWeight: "800",
  },

  category: {
    color: "#60727a",
    fontSize: 13,
    marginTop: 4,
  },

  priceContainer: {
    alignItems: "flex-end",
  },

  price: {
    color: "#17a398",
    fontSize: 16,
    fontWeight: "800",
  },

  unit: {
    color: "#87959d",
    fontSize: 12,
    marginTop: 2,
  },

  description: {
    color: "#60727a",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#edf1f2",
    paddingTop: 14,
    marginTop: 16,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  activeBadge: {
    backgroundColor: "#dff5f1",
  },

  archivedBadge: {
    backgroundColor: "#eceff1",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  activeText: {
    color: "#137c74",
  },

  archivedText: {
    color: "#60727a",
  },

  statusButton: {
    minWidth: 84,
    minHeight: 38,
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  statusButtonText: {
    color: "#16324f",
    fontSize: 13,
    fontWeight: "700",
  },

  buttonDisabled: {
    opacity: 0.5,
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
    textAlign: "center",
    lineHeight: 20,
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
