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

type BudgetFormScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "OrcamentoFormulario"
>;

type Client = {
  id: string;
  name: string;
  active: boolean;
};

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function obterDataAtual() {
  const data = new Date();

  const ano = data.getFullYear();

  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function dataBancoParaTela(data: string | null) {
  if (!data) {
    return "";
  }

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

function formatarCampoData(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 8);

  if (numeros.length <= 2) {
    return numeros;
  }

  if (numeros.length <= 4) {
    return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  }

  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

function dataTelaParaBanco(valor: string): string | null | undefined {
  const valorFormatado = valor.trim();

  if (!valorFormatado) {
    return null;
  }

  const resultado = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valorFormatado);

  if (!resultado) {
    return undefined;
  }

  const dia = Number(resultado[1]);
  const mes = Number(resultado[2]);
  const ano = Number(resultado[3]);

  const data = new Date(ano, mes - 1, dia);

  const dataValida =
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia;

  if (!dataValida) {
    return undefined;
  }

  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(
    2,
    "0",
  )}`;
}

function converterDinheiro(valor: string) {
  const valorLimpo = valor.trim().replace(/\s/g, "");

  if (!valorLimpo) {
    return 0;
  }

  if (valorLimpo.includes(",")) {
    return Number(valorLimpo.replace(/\./g, "").replace(",", "."));
  }

  return Number(valorLimpo);
}

export function BudgetFormScreen({ route, navigation }: BudgetFormScreenProps) {
  const budgetId = route.params?.budgetId;

  const editando = Boolean(budgetId);

  const [clientes, setClientes] = useState<Client[]>([]);

  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<
    string | null
  >(null);

  const [titulo, setTitulo] = useState("");

  const [descricao, setDescricao] = useState("");

  const [validade, setValidade] = useState("");

  const [desconto, setDesconto] = useState("0,00");

  const [observacoes, setObservacoes] = useState("");

  const [dataEmissao, setDataEmissao] = useState(obterDataAtual());

  const [seletorClienteAberto, setSeletorClienteAberto] = useState(false);

  const [buscaCliente, setBuscaCliente] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [salvando, setSalvando] = useState(false);

  const clienteSelecionado = useMemo(
    () =>
      clientes.find((cliente) => cliente.id === clienteSelecionadoId) ?? null,
    [clienteSelecionadoId, clientes],
  );

  const clientesFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaCliente.trim());

    return clientes.filter(
      (cliente) =>
        cliente.active &&
        (termo.length === 0 || normalizarTexto(cliente.name).includes(termo)),
    );
  }, [buscaCliente, clientes]);

  useEffect(() => {
    let telaAtiva = true;

    async function carregarDados() {
      try {
        setCarregando(true);

        const { data: clientesData, error: clientesError } = await supabase
          .from("clients")
          .select(
            `
            id,
            name,
            active
          `,
          )
          .order("name", {
            ascending: true,
          });

        if (clientesError) {
          throw clientesError;
        }

        if (!telaAtiva) {
          return;
        }

        setClientes((clientesData ?? []) as Client[]);

        if (!budgetId) {
          return;
        }

        const { data: orcamento, error: orcamentoError } = await supabase
          .from("budgets")
          .select(
            `
            id,
            client_id,
            title,
            description,
            issue_date,
            valid_until,
            discount,
            notes
          `,
          )
          .eq("id", budgetId)
          .single();

        if (orcamentoError) {
          throw orcamentoError;
        }

        if (!telaAtiva) {
          return;
        }

        setClienteSelecionadoId(orcamento.client_id);

        setTitulo(orcamento.title);

        setDescricao(orcamento.description ?? "");

        setDataEmissao(orcamento.issue_date);

        setValidade(dataBancoParaTela(orcamento.valid_until));

        setDesconto(Number(orcamento.discount).toFixed(2).replace(".", ","));

        setObservacoes(orcamento.notes ?? "");
      } catch (error) {
        if (!telaAtiva) {
          return;
        }

        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o formulário.";

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
  }, [budgetId, navigation]);

  async function salvar() {
    const tituloFormatado = titulo.trim();

    if (!clienteSelecionadoId) {
      Alert.alert("Cliente obrigatório", "Selecione o cliente do orçamento.");

      return;
    }

    if (!tituloFormatado) {
      Alert.alert("Título obrigatório", "Informe um título para o orçamento.");

      return;
    }

    const validadeBanco = dataTelaParaBanco(validade);

    if (validadeBanco === undefined) {
      Alert.alert("Data inválida", "Informe a validade no formato DD/MM/AAAA.");

      return;
    }

    if (validadeBanco && validadeBanco < dataEmissao) {
      Alert.alert(
        "Validade inválida",
        "A validade não pode ser anterior à data de emissão.",
      );

      return;
    }

    const descontoConvertido = converterDinheiro(desconto);

    if (!Number.isFinite(descontoConvertido) || descontoConvertido < 0) {
      Alert.alert(
        "Desconto inválido",
        "Informe um desconto válido. Use zero quando não houver desconto.",
      );

      return;
    }

    const dadosDoOrcamento = {
      client_id: clienteSelecionadoId,

      title: tituloFormatado,

      description: descricao.trim() || null,

      issue_date: dataEmissao,

      valid_until: validadeBanco,

      discount: descontoConvertido,

      notes: observacoes.trim() || null,

      updated_at: new Date().toISOString(),
    };

    try {
      setSalvando(true);

      if (budgetId) {
        const { data, error } = await supabase
          .from("budgets")
          .update(dadosDoOrcamento)
          .eq("id", budgetId)
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "O orçamento não foi encontrado ou você não possui permissão.",
          );
        }
      } else {
        const { data, error } = await supabase
          .from("budgets")
          .insert({
            ...dadosDoOrcamento,
            status: "draft",
          })
          .select("id, code")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("O orçamento não foi cadastrado.");
        }
      }

      Alert.alert(
        "Sucesso",
        editando ? "Orçamento atualizado." : "Orçamento criado como rascunho.",
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
          : "Não foi possível salvar o orçamento.";

      Alert.alert("Erro ao salvar", mensagem);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando formulário...</Text>
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
          <Text style={styles.introduction}>
            {editando
              ? "Altere as informações principais do orçamento."
              : "Preencha as informações principais. Os serviços serão adicionados depois."}
          </Text>

          <Text style={styles.label}>
            Cliente
            <Text style={styles.required}> *</Text>
          </Text>

          <Pressable
            style={styles.selectButton}
            onPress={() => setSeletorClienteAberto(true)}
            disabled={salvando}
          >
            <View style={styles.selectText}>
              <Text
                style={
                  clienteSelecionado
                    ? styles.selectedClient
                    : styles.placeholder
                }
                numberOfLines={1}
              >
                {clienteSelecionado
                  ? clienteSelecionado.name
                  : "Selecione um cliente"}
              </Text>
            </View>

            <Text style={styles.selectArrow}>›</Text>
          </Pressable>

          <Text style={styles.label}>
            Título do orçamento
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex.: Reforma do banheiro"
            placeholderTextColor="#87959d"
            autoCapitalize="sentences"
            maxLength={120}
            editable={!salvando}
          />

          <Text style={styles.label}>Descrição</Text>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Descrição geral do trabalho"
            placeholderTextColor="#87959d"
            multiline
            textAlignVertical="top"
            maxLength={500}
            editable={!salvando}
          />

          <Text style={styles.label}>Data de emissão</Text>

          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>
              {dataBancoParaTela(dataEmissao)}
            </Text>
          </View>

          <Text style={styles.label}>Validade</Text>

          <TextInput
            style={styles.input}
            value={validade}
            onChangeText={(valor) => setValidade(formatarCampoData(valor))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#87959d"
            keyboardType="number-pad"
            maxLength={10}
            editable={!salvando}
          />

          <Text style={styles.label}>Desconto em reais</Text>

          <TextInput
            style={styles.input}
            value={desconto}
            onChangeText={setDesconto}
            placeholder="Ex.: 100,00"
            placeholderTextColor="#87959d"
            keyboardType="decimal-pad"
            editable={!salvando}
          />

          <Text style={styles.label}>Observações</Text>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Condições, formas de pagamento ou informações adicionais"
            placeholderTextColor="#87959d"
            multiline
            textAlignVertical="top"
            maxLength={1000}
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
                {editando ? "Salvar alterações" : "Criar orçamento"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={seletorClienteAberto}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSeletorClienteAberto(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar cliente</Text>

            <Pressable onPress={() => setSeletorClienteAberto(false)}>
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.modalSearch}
            value={buscaCliente}
            onChangeText={setBuscaCliente}
            placeholder="Buscar cliente..."
            placeholderTextColor="#87959d"
            autoCorrect={false}
          />

          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.clientsList,
              clientesFiltrados.length === 0 && styles.emptyClientsList,
            ]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.clientOption}
                onPress={() => {
                  setClienteSelecionadoId(item.id);

                  setSeletorClienteAberto(false);

                  setBuscaCliente("");
                }}
              >
                <Text style={styles.clientOptionName}>{item.name}</Text>

                {clienteSelecionadoId === item.id && (
                  <Text style={styles.selectedMark}>Selecionado</Text>
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyClients}>
                <Text style={styles.emptyClientsTitle}>
                  Nenhum cliente ativo
                </Text>

                <Text style={styles.emptyClientsText}>
                  Cadastre ou reative um cliente antes de criar o orçamento.
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

  introduction: {
    color: "#60727a",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
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
    minHeight: 105,
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

  selectText: {
    flex: 1,
  },

  selectedClient: {
    color: "#263238",
    fontSize: 16,
    fontWeight: "700",
  },

  placeholder: {
    color: "#87959d",
    fontSize: 16,
  },

  selectArrow: {
    color: "#17a398",
    fontSize: 28,
    marginLeft: 10,
  },

  readOnlyField: {
    minHeight: 52,
    backgroundColor: "#e9eef0",
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  readOnlyText: {
    color: "#60727a",
    fontSize: 16,
    fontWeight: "700",
  },

  saveButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
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
    fontSize: 15,
    marginTop: 12,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },

  modalTitle: {
    color: "#16324f",
    fontSize: 22,
    fontWeight: "800",
  },

  closeText: {
    color: "#17a398",
    fontSize: 15,
    fontWeight: "800",
  },

  modalSearch: {
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

  clientsList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  emptyClientsList: {
    flexGrow: 1,
  },

  clientOption: {
    minHeight: 62,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  clientOptionName: {
    flex: 1,
    color: "#16324f",
    fontSize: 16,
    fontWeight: "700",
  },

  selectedMark: {
    color: "#17a398",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 10,
  },

  emptyClients: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  emptyClientsTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
  },

  emptyClientsText: {
    color: "#60727a",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
});
