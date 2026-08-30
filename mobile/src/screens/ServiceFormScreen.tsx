import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

type ServiceFormScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ServicoFormulario"
>;

const unidadesSugeridas = [
  "serviço",
  "unidade",
  "m²",
  "m³",
  "metro",
  "hora",
  "diária",
];

function converterPreco(valor: string) {
  const valorLimpo = valor.trim().replace(/\s/g, "");

  if (!valorLimpo) {
    return Number.NaN;
  }

  if (valorLimpo.includes(",")) {
    return Number(valorLimpo.replace(/\./g, "").replace(",", "."));
  }

  return Number(valorLimpo);
}

export function ServiceFormScreen({
  route,
  navigation,
}: ServiceFormScreenProps) {
  const serviceId = route.params?.serviceId;

  const editando = Boolean(serviceId);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidade, setUnidade] = useState("serviço");
  const [preco, setPreco] = useState("");

  const [carregando, setCarregando] = useState(editando);

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!serviceId) {
      return;
    }

    let telaAtiva = true;

    async function carregarServico() {
      try {
        setCarregando(true);

        const { data, error } = await supabase
          .from("services")
          .select(
            `
              id,
              name,
              description,
              category,
              unit,
              unit_price
            `,
          )
          .eq("id", serviceId)
          .single();

        if (error) {
          throw error;
        }

        if (!telaAtiva) {
          return;
        }

        setNome(data.name);
        setDescricao(data.description ?? "");
        setCategoria(data.category ?? "");
        setUnidade(data.unit);

        setPreco(Number(data.unit_price).toFixed(2).replace(".", ","));
      } catch (error) {
        if (!telaAtiva) {
          return;
        }

        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o serviço.";

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

    void carregarServico();

    return () => {
      telaAtiva = false;
    };
  }, [navigation, serviceId]);

  async function salvar() {
    const nomeFormatado = nome.trim();
    const unidadeFormatada = unidade.trim();
    const categoriaFormatada = categoria.trim();
    const descricaoFormatada = descricao.trim();

    const precoConvertido = converterPreco(preco);

    if (!nomeFormatado) {
      Alert.alert("Nome obrigatório", "Informe o nome do serviço.");

      return;
    }

    if (!unidadeFormatada) {
      Alert.alert(
        "Unidade obrigatória",
        "Informe como o serviço será calculado.",
      );

      return;
    }

    if (!Number.isFinite(precoConvertido) || precoConvertido <= 0) {
      Alert.alert(
        "Preço inválido",
        "Informe um valor maior que zero. Exemplo: 45,50.",
      );

      return;
    }

    const dadosDoServico = {
      name: nomeFormatado,
      description: descricaoFormatada || null,
      category: categoriaFormatada || null,
      unit: unidadeFormatada,
      unit_price: precoConvertido,
    };

    try {
      setSalvando(true);

      if (serviceId) {
        const { data, error } = await supabase
          .from("services")
          .update(dadosDoServico)
          .eq("id", serviceId)
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
      } else {
        const { data, error } = await supabase
          .from("services")
          .insert({
            ...dadosDoServico,
            active: true,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("O serviço não foi cadastrado.");
        }
      }

      Alert.alert(
        "Sucesso",
        editando
          ? "Serviço atualizado com sucesso."
          : "Serviço cadastrado com sucesso.",
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
          : "Não foi possível salvar o serviço.";

      Alert.alert("Erro ao salvar", mensagem);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando serviço...</Text>
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
              ? "Altere as informações do serviço."
              : "Cadastre um serviço para utilizá-lo nos futuros orçamentos."}
          </Text>

          <Text style={styles.label}>
            Nome do serviço
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Assentamento de piso"
            placeholderTextColor="#87959d"
            autoCapitalize="sentences"
            maxLength={100}
            editable={!salvando}
          />

          <Text style={styles.label}>Categoria</Text>

          <TextInput
            style={styles.input}
            value={categoria}
            onChangeText={setCategoria}
            placeholder="Ex.: Revestimento"
            placeholderTextColor="#87959d"
            autoCapitalize="sentences"
            maxLength={60}
            editable={!salvando}
          />

          <Text style={styles.label}>Descrição</Text>

          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Descreva o que está incluído no serviço"
            placeholderTextColor="#87959d"
            autoCapitalize="sentences"
            multiline
            textAlignVertical="top"
            maxLength={500}
            editable={!salvando}
          />

          <Text style={styles.label}>
            Unidade de cobrança
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={unidade}
            onChangeText={setUnidade}
            placeholder="Ex.: m²"
            placeholderTextColor="#87959d"
            maxLength={30}
            editable={!salvando}
          />

          <View style={styles.unitsContainer}>
            {unidadesSugeridas.map((item) => {
              const selecionada = unidade === item;

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.unitOption,
                    selecionada && styles.unitOptionSelected,
                  ]}
                  onPress={() => setUnidade(item)}
                  disabled={salvando}
                >
                  <Text
                    style={[
                      styles.unitOptionText,
                      selecionada && styles.unitOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>
            Preço
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            style={[styles.input, styles.priceInput]}
            value={preco}
            onChangeText={setPreco}
            placeholder="Ex.: 45,50"
            placeholderTextColor="#87959d"
            keyboardType="decimal-pad"
            editable={!salvando}
          />

          <Text style={styles.helpText}>
            Informe o preço cobrado por uma unidade do serviço.
          </Text>

          <Pressable
            style={[styles.saveButton, salvando && styles.buttonDisabled]}
            onPress={salvar}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editando ? "Salvar alterações" : "Cadastrar serviço"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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

  descriptionInput: {
    minHeight: 110,
    paddingTop: 14,
  },

  unitsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: -8,
    marginBottom: 18,
  },

  unitOption: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
  },

  unitOptionSelected: {
    backgroundColor: "#dff5f1",
    borderColor: "#17a398",
  },

  unitOptionText: {
    color: "#60727a",
    fontSize: 13,
    fontWeight: "700",
  },

  unitOptionTextSelected: {
    color: "#137c74",
  },

  priceInput: {
    marginBottom: 6,
  },

  helpText: {
    color: "#718087",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 26,
  },

  saveButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
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
