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

import type { RootStackParamList } from "../navigation/types";

import { supabase } from "../lib/supabase";

type ScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "CobrancaFormulario"
>;

type Client = {
  id: string;
  name: string;
};

function converterValor(value: string) {
  const cleaned = value.replace("R$", "").replace(/\s/g, "");

  if (cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }

  return Number(cleaned);
}

function dataValida(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function ReceivableFormScreen({ navigation }: ScreenProps) {
  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState("");

  const [description, setDescription] = useState("");

  const [amount, setAmount] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [installmentNumber, setInstallmentNumber] = useState("1");

  const [installmentTotal, setInstallmentTotal] = useState("1");

  const [notes, setNotes] = useState("");

  const [clientModalVisible, setClientModalVisible] = useState(false);

  const [loadingClients, setLoadingClients] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function carregarClientes() {
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .eq("active", true)
          .order("name", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        setClients((data ?? []) as Client[]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os clientes.";

        Alert.alert("Erro ao carregar clientes", message);
      } finally {
        setLoadingClients(false);
      }
    }

    void carregarClientes();
  }, []);

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === clientId);
  }, [clients, clientId]);

  async function salvar() {
    const numericAmount = converterValor(amount);

    const number = Number(installmentNumber);

    const total = Number(installmentTotal);

    if (!clientId) {
      Alert.alert("Cliente obrigatório", "Selecione o cliente da cobrança.");

      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Descrição obrigatória",
        "Informe o serviço ou motivo da cobrança.",
      );

      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Valor inválido", "Informe um valor maior que zero.");

      return;
    }

    if (!dataValida(dueDate)) {
      Alert.alert("Data inválida", "Informe a data no formato AAAA-MM-DD.");

      return;
    }

    if (
      !Number.isInteger(number) ||
      !Number.isInteger(total) ||
      number < 1 ||
      total < 1 ||
      number > total
    ) {
      Alert.alert(
        "Parcela inválida",
        "O número da parcela deve estar entre 1 e o total de parcelas.",
      );

      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from("receivables").insert({
        client_id: clientId,
        budget_id: null,
        description: description.trim(),
        amount: numericAmount,
        due_date: dueDate,
        status: "pending",
        installment_number: number,
        installment_total: total,
        notes: notes.trim() || null,
      });

      if (error) {
        throw error;
      }

      Alert.alert("Cobrança cadastrada", "A cobrança foi salva com sucesso.", [
        {
          text: "Continuar",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a cobrança.";

      Alert.alert("Erro ao salvar", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.introduction}>
            Informe quem deve pagar, o valor e a data de vencimento.
          </Text>

          <Text style={styles.label}>Cliente</Text>

          <Pressable
            style={styles.selectionField}
            onPress={() => setClientModalVisible(true)}
            disabled={loadingClients || saving}
          >
            {loadingClients ? (
              <ActivityIndicator color="#17a398" />
            ) : (
              <Text
                style={[
                  styles.selectionText,
                  !selectedClient && styles.placeholderText,
                ]}
              >
                {selectedClient?.name ?? "Selecione um cliente"}
              </Text>
            )}

            <Text style={styles.selectionArrow}>▼</Text>
          </Pressable>

          <Text style={styles.label}>Descrição</Text>

          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex.: Reforma do banheiro"
            placeholderTextColor="#87959d"
            editable={!saving}
          />

          <Text style={styles.label}>Valor</Text>

          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Ex.: 1500,00"
            placeholderTextColor="#87959d"
            keyboardType="decimal-pad"
            editable={!saving}
          />

          <Text style={styles.label}>Data de vencimento</Text>

          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#87959d"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!saving}
          />

          <View style={styles.installmentRow}>
            <View style={styles.installmentField}>
              <Text style={styles.label}>Número da parcela</Text>

              <TextInput
                style={styles.input}
                value={installmentNumber}
                onChangeText={setInstallmentNumber}
                keyboardType="number-pad"
                editable={!saving}
              />
            </View>

            <View style={styles.installmentSpace} />

            <View style={styles.installmentField}>
              <Text style={styles.label}>Total de parcelas</Text>

              <TextInput
                style={styles.input}
                value={installmentTotal}
                onChangeText={setInstallmentTotal}
                keyboardType="number-pad"
                editable={!saving}
              />
            </View>
          </View>

          <Text style={styles.helpText}>
            Se não houver parcelamento, deixe os dois campos com o valor 1.
          </Text>

          <Text style={styles.label}>Observações</Text>

          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Informações adicionais..."
            placeholderTextColor="#87959d"
            multiline
            textAlignVertical="top"
            editable={!saving}
          />

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={salvar}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar cobrança</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={clientModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClientModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecione o cliente</Text>

            <FlatList
              data={clients}
              keyExtractor={(item) => item.id}
              style={styles.clientList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.clientOption}
                  onPress={() => {
                    setClientId(item.id);

                    setClientModalVisible(false);
                  }}
                >
                  <Text style={styles.clientOptionText}>{item.name}</Text>

                  {clientId === item.id ? (
                    <Text style={styles.selectedClient}>✓</Text>
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.noClients}>
                  Nenhum cliente ativo foi encontrado.
                </Text>
              }
            />

            <Pressable
              style={styles.closeModalButton}
              onPress={() => setClientModalVisible(false)}
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
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  content: {
    padding: 20,
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

  input: {
    minHeight: 54,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    color: "#263238",
    fontSize: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  selectionField: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  selectionText: {
    flex: 1,
    color: "#263238",
    fontSize: 16,
  },

  placeholderText: {
    color: "#87959d",
  },

  selectionArrow: {
    color: "#60727a",
    fontSize: 11,
  },

  installmentRow: {
    flexDirection: "row",
  },

  installmentField: {
    flex: 1,
  },

  installmentSpace: {
    width: 12,
  },

  helpText: {
    color: "#718087",
    fontSize: 12,
    lineHeight: 18,
    marginTop: -10,
    marginBottom: 20,
  },

  notesInput: {
    minHeight: 110,
    paddingTop: 15,
  },

  saveButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#ffffff",
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
    maxHeight: "75%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    color: "#16324f",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 14,
  },

  clientList: {
    maxHeight: 380,
  },

  clientOption: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f2",
    paddingHorizontal: 4,
  },

  clientOptionText: {
    flex: 1,
    color: "#263238",
    fontSize: 16,
    fontWeight: "600",
  },

  selectedClient: {
    color: "#17a398",
    fontSize: 19,
    fontWeight: "800",
  },

  noClients: {
    color: "#718087",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 30,
  },

  closeModalButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },

  closeModalText: {
    color: "#60727a",
    fontSize: 15,
    fontWeight: "700",
  },
});
