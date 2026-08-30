import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/types";

type ClientsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Clientes"
>;

type ClientListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  active: boolean;
  created_at: string;
};

type FiltroStatus = "ativos" | "arquivados";

function normalizarTexto(valor: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function ClientsScreen({ navigation }: ClientsScreenProps) {
  const [clientes, setClientes] = useState<ClientListItem[]>([]);

  const [busca, setBusca] = useState("");

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("ativos");

  const [carregando, setCarregando] = useState(true);

  const [atualizando, setAtualizando] = useState(false);

  const [alterandoId, setAlterandoId] = useState<string | null>(null);

  const carregarClientes = useCallback(async (atualizacaoManual = false) => {
    try {
      if (atualizacaoManual) {
        setAtualizando(true);
      } else {
        setCarregando(true);
      }

      const { data, error } = await supabase
        .from("clients")
        .select(
          `
              id,
              name,
              phone,
              email,
              document,
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

      setClientes((data ?? []) as ClientListItem[]);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os clientes.";

      Alert.alert("Erro ao carregar clientes", mensagem);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarClientes();
    }, [carregarClientes]),
  );

  const clientesVisiveis = useMemo(() => {
    const termo = normalizarTexto(busca);

    return clientes.filter((cliente) => {
      const correspondeAoStatus =
        filtroStatus === "ativos" ? cliente.active : !cliente.active;

      if (!correspondeAoStatus) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const camposPesquisaveis = [
        cliente.name,
        cliente.phone,
        cliente.email,
        cliente.document,
      ];

      return camposPesquisaveis.some((campo) =>
        normalizarTexto(campo).includes(termo),
      );
    });
  }, [busca, clientes, filtroStatus]);

  function abrirCadastro() {
    navigation.navigate("ClienteFormulario");
  }

  function abrirEdicao(clientId: string) {
    navigation.navigate("ClienteFormulario", {
      clientId,
    });
  }

  async function alterarStatusCliente(cliente: ClientListItem) {
    const novoStatus = !cliente.active;

    try {
      setAlterandoId(cliente.id);

      const { data, error } = await supabase
        .from("clients")
        .update({
          active: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cliente.id)
        .select("id, active")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "O cliente não foi encontrado ou não pode ser alterado.",
        );
      }

      setClientes((clientesAtuais) =>
        clientesAtuais.map((item) =>
          item.id === cliente.id
            ? {
                ...item,
                active: data.active,
              }
            : item,
        ),
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o cliente.";

      Alert.alert("Erro", mensagem);
    } finally {
      setAlterandoId(null);
    }
  }

  function confirmarAlteracaoStatus(cliente: ClientListItem) {
    const vaiArquivar = cliente.active;

    Alert.alert(
      vaiArquivar ? "Arquivar cliente?" : "Restaurar cliente?",
      vaiArquivar
        ? `${cliente.name} deixará de aparecer na lista de clientes ativos.`
        : `${cliente.name} voltará para a lista de clientes ativos.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: vaiArquivar ? "Arquivar" : "Restaurar",
          style: vaiArquivar ? "destructive" : "default",
          onPress: () => alterarStatusCliente(cliente),
        },
      ],
    );
  }

  function renderizarCliente({ item }: { item: ClientListItem }) {
    const primeiraLetra = item.name.charAt(0).toUpperCase();

    const alterando = alterandoId === item.id;

    return (
      <View style={styles.card}>
        <Pressable
          style={({ pressed }) => [
            styles.cardMain,
            pressed && styles.cardMainPressed,
          ]}
          onPress={() => abrirEdicao(item.id)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{primeiraLetra}</Text>
          </View>

          <View style={styles.clientInfo}>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.name}
            </Text>

            {item.phone ? (
              <Text style={styles.clientDetail} numberOfLines={1}>
                {item.phone}
              </Text>
            ) : null}

            {item.email ? (
              <Text style={styles.clientDetail} numberOfLines={1}>
                {item.email}
              </Text>
            ) : null}
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <View style={styles.cardFooter}>
          <Text
            style={[
              styles.statusText,
              item.active ? styles.activeStatusText : styles.archivedStatusText,
            ]}
          >
            {item.active ? "Ativo" : "Arquivado"}
          </Text>

          <Pressable
            style={[
              styles.statusButton,
              item.active ? styles.archiveButton : styles.restoreButton,
              alterando && styles.disabledButton,
            ]}
            onPress={() => confirmarAlteracaoStatus(item)}
            disabled={alterando}
          >
            {alterando ? (
              <ActivityIndicator size="small" color="#60727a" />
            ) : (
              <Text
                style={[
                  styles.statusButtonText,
                  item.active
                    ? styles.archiveButtonText
                    : styles.restoreButtonText,
                ]}
              >
                {item.active ? "Arquivar" : "Restaurar"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  const buscando = busca.trim().length > 0;

  const tituloVazio = buscando
    ? "Nenhum resultado encontrado"
    : filtroStatus === "ativos"
      ? "Nenhum cliente ativo"
      : "Nenhum cliente arquivado";

  const descricaoVazia = buscando
    ? "Tente pesquisar usando outro nome, telefone, e-mail ou documento."
    : filtroStatus === "ativos"
      ? "Cadastre um cliente para começar."
      : "Os clientes arquivados aparecerão aqui.";

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando clientes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Clientes</Text>

          <Text style={styles.counter}>
            {clientesVisiveis.length}{" "}
            {clientesVisiveis.length === 1 ? "resultado" : "resultados"}
          </Text>
        </View>

        <Pressable style={styles.addButton} onPress={abrirCadastro}>
          <Text style={styles.addButtonText}>+ Novo</Text>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Pesquisar clientes..."
          placeholderTextColor="#87959d"
          autoCorrect={false}
          returnKeyType="search"
        />

        {busca ? (
          <Pressable style={styles.clearButton} onPress={() => setBusca("")}>
            <Text style={styles.clearButtonText}>Limpar</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filters}>
        <Pressable
          style={[
            styles.filterButton,
            filtroStatus === "ativos" && styles.filterButtonSelected,
          ]}
          onPress={() => setFiltroStatus("ativos")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filtroStatus === "ativos" && styles.filterButtonTextSelected,
            ]}
          >
            Ativos
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterButton,
            filtroStatus === "arquivados" && styles.filterButtonSelected,
          ]}
          onPress={() => setFiltroStatus("arquivados")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filtroStatus === "arquivados" && styles.filterButtonTextSelected,
            ]}
          >
            Arquivados
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={clientesVisiveis}
        keyExtractor={(item) => item.id}
        renderItem={renderizarCliente}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          clientesVisiveis.length === 0 && styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => carregarClientes(true)}
            colors={["#17a398"]}
            tintColor="#17a398"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{tituloVazio}</Text>

            <Text style={styles.emptyDescription}>{descricaoVazia}</Text>

            {!buscando && filtroStatus === "ativos" ? (
              <Pressable style={styles.emptyButton} onPress={abrirCadastro}>
                <Text style={styles.emptyButtonText}>Cadastrar cliente</Text>
              </Pressable>
            ) : null}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    color: "#16324f",
    fontSize: 26,
    fontWeight: "800",
  },

  counter: {
    color: "#60727a",
    fontSize: 14,
    marginTop: 4,
  },

  addButton: {
    backgroundColor: "#17a398",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  addButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  searchContainer: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    color: "#263238",
    fontSize: 16,
    paddingHorizontal: 16,
  },

  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },

  clearButtonText: {
    color: "#178f87",
    fontSize: 13,
    fontWeight: "700",
  },

  filters: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#e8eeef",
    borderRadius: 12,
    padding: 4,
  },

  filterButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },

  filterButtonSelected: {
    backgroundColor: "#ffffff",
  },

  filterButtonText: {
    color: "#60727a",
    fontSize: 14,
    fontWeight: "700",
  },

  filterButtonTextSelected: {
    color: "#16324f",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7e9",
    borderRadius: 16,
    overflow: "hidden",
  },

  cardMain: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },

  cardMainPressed: {
    backgroundColor: "#f1f6f5",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#dff4f2",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#178f87",
    fontSize: 20,
    fontWeight: "800",
  },

  clientInfo: {
    flex: 1,
    marginLeft: 14,
  },

  clientName: {
    color: "#263238",
    fontSize: 17,
    fontWeight: "800",
  },

  clientDetail: {
    color: "#60727a",
    fontSize: 14,
    marginTop: 3,
  },

  arrow: {
    color: "#87959d",
    fontSize: 30,
    marginLeft: 8,
  },

  cardFooter: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#edf1f2",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },

  activeStatusText: {
    color: "#178f87",
  },

  archivedStatusText: {
    color: "#87959d",
  },

  statusButton: {
    minWidth: 88,
    minHeight: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  archiveButton: {
    backgroundColor: "#fff0ed",
  },

  restoreButton: {
    backgroundColor: "#dff4f2",
  },

  statusButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  archiveButtonText: {
    color: "#b44736",
  },

  restoreButtonText: {
    color: "#178f87",
  },

  disabledButton: {
    opacity: 0.6,
  },

  separator: {
    height: 12,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  emptyTitle: {
    color: "#16324f",
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyDescription: {
    color: "#60727a",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },

  emptyButton: {
    backgroundColor: "#17a398",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },

  emptyButtonText: {
    color: "#ffffff",
    fontSize: 15,
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
    fontSize: 15,
    marginTop: 12,
  },
});
