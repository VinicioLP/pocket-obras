import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/types";

type ClientFormScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ClienteFormulario"
>;

function valorOuNulo(valor: string) {
  const valorFormatado = valor.trim();

  return valorFormatado || null;
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ClientFormScreen({
  navigation,
  route,
}: ClientFormScreenProps) {
  const clientId = route.params?.clientId;
  const editando = Boolean(clientId);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [documento, setDocumento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [carregandoDados, setCarregandoDados] =
    useState(editando);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    let componenteAtivo = true;

    async function carregarCliente() {
      try {
        setCarregandoDados(true);

        const { data, error } = await supabase
          .from("clients")
          .select(
            `
              id,
              name,
              phone,
              email,
              document,
              address,
              notes
            `,
          )
          .eq("id", clientId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Cliente não encontrado ou você não possui acesso.",
          );
        }

        if (!componenteAtivo) {
          return;
        }

        setNome(data.name ?? "");
        setTelefone(data.phone ?? "");
        setEmail(data.email ?? "");
        setDocumento(data.document ?? "");
        setEndereco(data.address ?? "");
        setObservacoes(data.notes ?? "");
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o cliente.";

        Alert.alert("Erro", mensagem);
      } finally {
        if (componenteAtivo) {
          setCarregandoDados(false);
        }
      }
    }

    carregarCliente();

    return () => {
      componenteAtivo = false;
    };
  }, [clientId]);

  async function salvarCliente() {
    const nomeFormatado = nome.trim();
    const emailFormatado = email.trim().toLowerCase();

    if (nomeFormatado.length < 2) {
      Alert.alert(
        "Nome inválido",
        "O nome precisa ter pelo menos dois caracteres.",
      );

      return;
    }

    if (
      emailFormatado &&
      !emailValido(emailFormatado)
    ) {
      Alert.alert(
        "E-mail inválido",
        "Informe um endereço de e-mail válido.",
      );

      return;
    }

    const dadosCliente = {
      name: nomeFormatado,
      phone: valorOuNulo(telefone),
      email: valorOuNulo(emailFormatado),
      document: valorOuNulo(documento),
      address: valorOuNulo(endereco),
      notes: valorOuNulo(observacoes),
    };

    try {
      setSalvando(true);

      if (editando && clientId) {
        const { data, error } = await supabase
          .from("clients")
          .update({
            ...dadosCliente,
            updated_at: new Date().toISOString(),
          })
          .eq("id", clientId)
          .select("id")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "O cliente não foi encontrado ou não pode ser editado.",
          );
        }
      } else {
        const { error } = await supabase
          .from("clients")
          .insert(dadosCliente)
          .select("id")
          .single();

        if (error) {
          throw error;
        }
      }

      Alert.alert(
        "Sucesso",
        editando
          ? "Cliente atualizado com sucesso."
          : "Cliente cadastrado com sucesso.",
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
          : "Não foi possível salvar o cliente.";

      Alert.alert("Erro ao salvar", mensagem);
    } finally {
      setSalvando(false);
    }
  }

  if (carregandoDados) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#17a398"
        />

        <Text style={styles.loadingText}>
          Carregando cliente...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            {editando
              ? "Editar cliente"
              : "Novo cliente"}
          </Text>

          <Text style={styles.description}>
            Preencha as informações do cliente.
            Somente o nome é obrigatório.
          </Text>

          <Text style={styles.label}>
            Nome completo *
          </Text>

          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: João da Silva"
            placeholderTextColor="#87959d"
            autoCapitalize="words"
            editable={!salvando}
          />

          <Text style={styles.label}>
            Telefone ou WhatsApp
          </Text>

          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#87959d"
            keyboardType="phone-pad"
            editable={!salvando}
          />

          <Text style={styles.label}>E-mail</Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="cliente@email.com"
            placeholderTextColor="#87959d"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!salvando}
          />

          <Text style={styles.label}>
            CPF ou CNPJ
          </Text>

          <TextInput
            style={styles.input}
            value={documento}
            onChangeText={setDocumento}
            placeholder="Documento do cliente"
            placeholderTextColor="#87959d"
            keyboardType="numeric"
            editable={!salvando}
          />

          <Text style={styles.label}>Endereço</Text>

          <TextInput
            style={styles.multilineInput}
            value={endereco}
            onChangeText={setEndereco}
            placeholder="Rua, número, bairro e cidade"
            placeholderTextColor="#87959d"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!salvando}
          />

          <Text style={styles.label}>
            Observações
          </Text>

          <TextInput
            style={styles.multilineInput}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Informações adicionais"
            placeholderTextColor="#87959d"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!salvando}
          />

          <Pressable
            style={[
              styles.saveButton,
              salvando && styles.buttonDisabled,
            ]}
            onPress={salvarCliente}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editando
                  ? "Salvar alterações"
                  : "Cadastrar cliente"}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={salvando}
          >
            <Text style={styles.cancelButtonText}>
              Cancelar
            </Text>
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

  container: {
    padding: 24,
    paddingBottom: 48,
  },

  title: {
    color: "#16324f",
    fontSize: 28,
    fontWeight: "800",
  },

  description: {
    color: "#60727a",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 28,
  },

  label: {
    color: "#263238",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    height: 54,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    color: "#263238",
    fontSize: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  multilineInput: {
    minHeight: 90,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    color: "#263238",
    fontSize: 16,
    padding: 16,
    marginBottom: 20,
  },

  saveButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  cancelButton: {
    height: 52,
    borderWidth: 1,
    borderColor: "#16324f",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  cancelButtonText: {
    color: "#16324f",
    fontSize: 16,
    fontWeight: "700",
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
});