import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
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
  "PagamentoFormulario"
>;

const methods = [
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  {
    value: "credit_card",
    label: "Cartão de crédito",
  },
  {
    value: "debit_card",
    label: "Cartão de débito",
  },
  {
    value: "bank_transfer",
    label: "Transferência",
  },
  { value: "other", label: "Outro" },
] as const;

type PaymentMethod = (typeof methods)[number]["value"];

function dataAtual() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function converterValor(value: string) {
  const cleaned = value.replace("R$", "").replace(/\s/g, "");

  if (cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }

  return Number(cleaned);
}

function formatarMoeda(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function dataValida(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function PaymentFormScreen({ route, navigation }: ScreenProps) {
  const { receivableId } = route.params;

  const [description, setDescription] = useState("");

  const [remainingAmount, setRemainingAmount] = useState(0);

  const [amount, setAmount] = useState("");

  const [paymentDate, setPaymentDate] = useState(dataAtual());

  const [method, setMethod] = useState<PaymentMethod>("pix");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    async function carregarResumo() {
      try {
        const [receivableResult, paymentsResult] = await Promise.all([
          supabase
            .from("receivables")
            .select("id, description, amount, status")
            .eq("id", receivableId)
            .single(),

          supabase
            .from("payments")
            .select("amount")
            .eq("receivable_id", receivableId),
        ]);

        if (receivableResult.error) {
          throw receivableResult.error;
        }

        if (paymentsResult.error) {
          throw paymentsResult.error;
        }

        if (receivableResult.data.status === "cancelled") {
          throw new Error("Esta cobrança está cancelada.");
        }

        const paid = (paymentsResult.data ?? []).reduce(
          (total, payment) => total + Number(payment.amount),
          0,
        );

        const remaining = Math.max(
          Number(receivableResult.data.amount) - paid,
          0,
        );

        setDescription(receivableResult.data.description);

        setRemainingAmount(remaining);

        setAmount(remaining.toFixed(2).replace(".", ","));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a cobrança.";

        Alert.alert("Erro", message);
      } finally {
        setLoading(false);
      }
    }

    void carregarResumo();
  }, [receivableId]);

  const selectedMethod = useMemo(() => {
    return methods.find((item) => item.value === method);
  }, [method]);

  async function salvar() {
    const numericAmount = converterValor(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Valor inválido", "Informe um valor maior que zero.");

      return;
    }

    if (numericAmount > remainingAmount) {
      Alert.alert(
        "Valor muito alto",
        `O saldo restante é ${formatarMoeda(remainingAmount)}.`,
      );

      return;
    }

    if (!dataValida(paymentDate)) {
      Alert.alert("Data inválida", "Use o formato AAAA-MM-DD.");

      return;
    }

    try {
      setSaving(true);

      const paidAt = new Date(`${paymentDate}T12:00:00`).toISOString();

      const { error } = await supabase.from("payments").insert({
        receivable_id: receivableId,

        amount: numericAmount,

        paid_at: paidAt,

        method,

        notes: notes.trim() || null,
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Pagamento registrado",
        numericAmount === remainingAmount
          ? "A cobrança foi totalmente paga."
          : "O pagamento parcial foi registrado.",
        [
          {
            text: "Continuar",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o pagamento.";

      Alert.alert("Erro ao registrar", message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summaryCard}>
          <Text style={styles.description}>{description}</Text>

          <Text style={styles.remainingLabel}>Saldo restante</Text>

          <Text style={styles.remainingValue}>
            {formatarMoeda(remainingAmount)}
          </Text>
        </View>

        <Text style={styles.label}>Valor recebido</Text>

        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0,00"
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <Text style={styles.label}>Data do pagamento</Text>

        <TextInput
          style={styles.input}
          value={paymentDate}
          onChangeText={setPaymentDate}
          placeholder="AAAA-MM-DD"
          maxLength={10}
          editable={!saving}
        />

        <Text style={styles.label}>Forma de pagamento</Text>

        <Pressable
          style={styles.selectionField}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.selectionText}>{selectedMethod?.label}</Text>

          <Text style={styles.arrow}>▼</Text>
        </Pressable>

        <Text style={styles.label}>Observações</Text>

        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Informações adicionais..."
          multiline
          textAlignVertical="top"
          editable={!saving}
        />

        <Pressable
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={salvar}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Confirmar pagamento</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Forma de pagamento</Text>

            {methods.map((item) => (
              <Pressable
                key={item.value}
                style={styles.methodOption}
                onPress={() => {
                  setMethod(item.value);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.methodText}>{item.label}</Text>

                {method === item.value ? (
                  <Text style={styles.check}>✓</Text>
                ) : null}
              </Pressable>
            ))}

            <Pressable
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f7f6",
  },

  summaryCard: {
    backgroundColor: "#16324f",
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
  },

  description: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },

  remainingLabel: {
    color: "#aebdc5",
    fontSize: 13,
    marginTop: 20,
  },

  remainingValue: {
    color: "#7ce0d7",
    fontSize: 29,
    fontWeight: "800",
    marginTop: 4,
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

  notesInput: {
    minHeight: 110,
    paddingTop: 15,
  },

  selectionField: {
    height: 54,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  selectionText: {
    flex: 1,
    color: "#263238",
    fontSize: 16,
  },

  arrow: {
    color: "#60727a",
    fontSize: 11,
  },

  saveButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  modalBackground: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: 24,
  },

  modalCard: {
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

  methodOption: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f2",
  },

  methodText: {
    flex: 1,
    color: "#263238",
    fontSize: 15,
    fontWeight: "600",
  },

  check: {
    color: "#17a398",
    fontSize: 19,
    fontWeight: "800",
  },

  closeButton: {
    alignItems: "center",
    paddingTop: 18,
  },

  closeText: {
    color: "#60727a",
    fontSize: 15,
    fontWeight: "700",
  },
});
