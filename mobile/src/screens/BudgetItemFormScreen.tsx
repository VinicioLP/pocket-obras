import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/types";

type BudgetItemFormScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "OrcamentoItemFormulario"
>;

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  unit_price: number | string;
  active: boolean;
};

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function converterNumero(valor: string) {
  const limpo = valor.trim().replace(/\s/g, "");

  if (!limpo) {
    return Number.NaN;
  }

  if (limpo.includes(",")) {
    return Number(limpo.replace(/\./g, "").replace(",", "."));
  }

  return Number(limpo);
}

function numeroParaCampo(valor: number | string, casas: number) {
  return Number(valor).toFixed(casas).replace(".", ",");
}

export function BudgetItemFormScreen({
  route,
  navigation,
}: BudgetItemFormScreenProps) {
  const { budgetId, itemId } = route.params;

  const editando = Boolean(itemId);

  const [servicos, setServicos] = useState<Service[]>([]);

  const [servicoSelecionadoId, setServicoSelecionadoId] = useState<
    string | null
  >(null);

  const [nome, setNome] = useState("");

  const [descricao, setDescricao] = useState("");

  const [unidade, setUnidade] = useState("");

  const [quantidade, setQuantidade] = useState("1");

  const [preco, setPreco] = useState("");

  const [seletorAberto, setSeletorAberto] = useState(false);

  const [busca, setBusca] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [salvando, setSalvando] = useState(false);

  const servicosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return servicos.filter(
      (servico) =>
        servico.active &&
        (termo.length === 0 ||
          normalizarTexto(`${servico.name} ${servico.category ?? ""}`).includes(
            termo,
          )),
    );
  }, [busca, servicos]);

  useEffect(() => {
    let telaAtiva = true;

    async function carregarDados() {
      try {
        setCarregando(true);

        const { data: servicosData, error: servicosError } = await supabase
          .from("services")
          .select(
            `
            id,
            name,
            description,
            category,
            unit,
            unit_price,
            active
          `,
          )
          .order("name", {
            ascending: true,
          });

        if (servicosError) {
          throw servicosError;
        }

        if (!telaAtiva) {
          return;
        }

        setServicos((servicosData ?? []) as Service[]);

        if (!itemId) {
          return;
        }

        const { data: item, error: itemError } = await supabase
          .from("budget_items")
          .select(
            `
            id,
            service_id,
            name,
            description,
            unit,
            quantity,
            unit_price
          `,
          )
          .eq("id", itemId)
          .single();

        if (itemError) {
          throw itemError;
        }

        if (!telaAtiva) {
          return;
        }

        setServicoSelecionadoId(item.service_id);

        setNome(item.name);

        setDescricao(item.description ?? "");

        setUnidade(item.unit);

        setQuantidade(numeroParaCampo(item.quantity, 3));

        setPreco(numeroParaCampo(item.unit_price, 2));
      } catch (error) {
        if (!telaAtiva) {
          return;
        }

        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o item.";

        Alert.alert("Erro ao carregar", mensagem, [
          {
            text: "Voltar",
            onPress: () => navigation.goBack(),
          },
        ]);
      } finally {
        if (telaAtiva) {
          setCarregando(false);
        }
      }
    }

    void carregarDados();

    return () => {
      telaAtiva = false;
    };
  }, [itemId, navigation]);

  function selecionarServico(servico: Service) {
    setServicoSelecionadoId(servico.id);

    setNome(servico.name);

    setDescricao(servico.description ?? "");

    setUnidade(servico.unit);

    setPreco(numeroParaCampo(servico.unit_price, 2));

    setSeletorAberto(false);
    setBusca("");
  }

  async function salvar() {
    if (!servicoSelecionadoId && !editando) {
      Alert.alert("Serviço obrigatório", "Selecione um serviço.");

      return;
    }

    if (!nome.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome do item.");

      return;
    }

    if (!unidade.trim()) {
      Alert.alert("Unidade obrigatória", "Informe a unidade de cobrança.");

      return;
    }

    const quantidadeConvertida = converterNumero(quantidade);

    const precoConvertido = converterNumero(preco);

    if (!Number.isFinite(quantidadeConvertida) || quantidadeConvertida <= 0) {
      Alert.alert(
        "Quantidade inválida",
        "A quantidade deve ser maior que zero.",
      );

      return;
    }

    if (!Number.isFinite(precoConvertido) || precoConvertido < 0) {
      Alert.alert("Preço inválido", "Informe um preço válido.");

      return;
    }

    const dadosDoItem = {
      service_id: servicoSelecionadoId,

      name: nome.trim(),

      description: descricao.trim() || null,

      unit: unidade.trim(),

      quantity: quantidadeConvertida,

      unit_price: precoConvertido,
    };

    try {
      setSalvando(true);

      if (itemId) {
        const { data, error } = await supabase
          .from("budget_items")
          .update(dadosDoItem)
          .eq("id", itemId)
          .select("id, total")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("O item não foi atualizado.");
        }
      } else {
        const { data: ultimoItem, error: ordemError } = await supabase
          .from("budget_items")
          .select("sort_order")
          .eq("budget_id", budgetId)
          .order("sort_order", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (ordemError) {
          throw ordemError;
        }

        const proximaOrdem = (ultimoItem?.sort_order ?? -1) + 1;

        const { data, error } = await supabase
          .from("budget_items")
          .insert({
            budget_id: budgetId,
            ...dadosDoItem,
            sort_order: proximaOrdem,
          })
          .select("id, total")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("O item não foi cadastrado.");
        }
      }

      Alert.alert(
        "Sucesso",
        editando ? "Item atualizado." : "Serviço adicionado ao orçamento.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o item.";

      Alert.alert("Erro ao salvar", mensagem);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>
            Serviço
            <Text style={styles.required}> *</Text>
          </Text>

          <Pressable
            style={styles.selectButton}
            onPress={() => setSeletorAberto(true)}
            disabled={salvando}
          >
            <Text
              style={nome ? styles.selectedText : styles.placeholder}
              numberOfLines={1}
            >
              {nome || "Selecionar serviço"}
            </Text>

            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Text style={styles.label}>Nome no orçamento</Text>

          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Nome do serviço"
            placeholderTextColor="#87959d"
            editable={!salvando}
          />

          <Text style={styles.label}>Descrição</Text>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Descrição opcional"
            placeholderTextColor="#87959d"
            multiline
            textAlignVertical="top"
            editable={!salvando}
          />

          <Text style={styles.label}>Unidade</Text>

          <TextInput
            style={styles.input}
            value={unidade}
            onChangeText={setUnidade}
            placeholder="Ex.: m²"
            placeholderTextColor="#87959d"
            editable={!salvando}
          />

          <Text style={styles.label}>
            Quantidade
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={quantidade}
            onChangeText={setQuantidade}
            placeholder="Ex.: 15"
            placeholderTextColor="#87959d"
            keyboardType="decimal-pad"
            editable={!salvando}
          />

          <Text style={styles.label}>
            Preço unitário
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={preco}
            onChangeText={setPreco}
            placeholder="Ex.: 50,00"
            placeholderTextColor="#87959d"
            keyboardType="decimal-pad"
            editable={!salvando}
          />

          <Pressable
            style={[styles.saveButton, salvando && styles.buttonDisabled]}
            onPress={salvar}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editando ? "Salvar alterações" : "Adicionar ao orçamento"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={seletorAberto}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSeletorAberto(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar serviço</Text>

            <Pressable onPress={() => setSeletorAberto(false)}>
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.searchInput}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar serviço..."
            placeholderTextColor="#87959d"
          />

          <FlatList
            data={servicosFiltrados}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.servicesList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.serviceOption}
                onPress={() => selecionarServico(item)}
              >
                <View style={styles.serviceText}>
                  <Text style={styles.serviceName}>{item.name}</Text>

                  <Text style={styles.serviceDetails}>
                    {item.category ?? "Sem categoria"} • {item.unit}
                  </Text>
                </View>

                <Text style={styles.servicePrice}>
                  {Number(item.unit_price).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nenhum serviço ativo</Text>

                <Text style={styles.emptyText}>
                  Cadastre ou reative um serviço antes de continuar.
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  keyboardContainer: {
    flex: 1,
  },

  content: {
    padding: 24,
    paddingBottom: 40,
  },

  label: {
    color: "#263238",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  required: {
    color: "#c0392b",
  },

  input: {
    minHeight: 52,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    color: "#263238",
    fontSize: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  multilineInput: {
    minHeight: 95,
    paddingTop: 14,
  },

  selectButton: {
    minHeight: 54,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  selectedText: {
    flex: 1,
    color: "#263238",
    fontSize: 16,
    fontWeight: "700",
  },

  placeholder: {
    flex: 1,
    color: "#87959d",
    fontSize: 16,
  },

  arrow: {
    color: "#17a398",
    fontSize: 28,
  },

  saveButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.6,
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

  modalContainer: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },

  modalTitle: {
    color: "#16324f",
    fontSize: 22,
    fontWeight: "800",
  },

  closeText: {
    color: "#17a398",
    fontWeight: "800",
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
    marginHorizontal: 20,
    marginBottom: 12,
  },

  servicesList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  serviceOption: {
    minHeight: 70,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
  },

  serviceText: {
    flex: 1,
    paddingRight: 12,
  },

  serviceName: {
    color: "#16324f",
    fontSize: 16,
    fontWeight: "800",
  },

  serviceDetails: {
    color: "#60727a",
    fontSize: 13,
    marginTop: 4,
  },

  servicePrice: {
    color: "#17a398",
    fontSize: 14,
    fontWeight: "800",
  },

  empty: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    color: "#60727a",
    textAlign: "center",
    marginTop: 8,
  },
});
