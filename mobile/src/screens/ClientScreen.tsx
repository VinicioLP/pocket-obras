import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
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
  created_at: string;
};

export function ClientsScreen({ navigation }: ClientsScreenProps) {
  const [clientes, setClientes] = useState<ClientListItem[]>([]);

  const [carregando, setCarregando] = useState(true);

  const [atualizando, setAtualizando] = useState(false);

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
              created_at
            `,
        )
        .eq("active", true)
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

  function abrirCadastro() {
    navigation.navigate("ClienteFormulario");
  }

  function abrirEdicao(clientId: string) {
    navigation.navigate("ClienteFormulario", {
      clientId,
    });
  }

  function renderizarCliente({ item }: { item: ClientListItem }) {
    const primeiraLetra = item.name.charAt(0).toUpperCase();

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
    );
  }

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
          <Text style={styles.title}>Clientes cadastrados</Text>

          <Text style={styles.counter}>
            {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={abrirCadastro}
        >
          <Text style={styles.addButtonText}>+ Novo</Text>
        </Pressable>
      </View>

      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id}
        renderItem={renderizarCliente}
        contentContainerStyle={[
          styles.listContent,
          clientes.length === 0 && styles.emptyListContent,
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
            <Text style={styles.emptyTitle}>Nenhum cliente cadastrado</Text>

            <Text style={styles.emptyDescription}>
              Cadastre o primeiro cliente para começar a criar orçamentos e
              obras.
            </Text>

            <Pressable style={styles.emptyButton} onPress={abrirCadastro}>
              <Text style={styles.emptyButtonText}>Cadastrar cliente</Text>
            </Pressable>
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
    paddingBottom: 16,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    color: "#16324f",
    fontSize: 24,
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

  addButtonPressed: {
    opacity: 0.8,
  },

  addButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  card: {
    minHeight: 82,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7e9",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },

  cardPressed: {
    opacity: 0.75,
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
