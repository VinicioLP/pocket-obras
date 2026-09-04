import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect } from "@react-navigation/native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";

import { supabase } from "../lib/supabase";

type ScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "CobrancaDetalhes"
>;

type ClientRelation = {
  id: string;
  name: string;
};

type Receivable = {
  id: string;
  description: string;
  amount: number;
  due_date: string;

  status: "pending" | "partial" | "paid" | "cancelled";

  installment_number: number;
  installment_total: number;
  notes: string | null;

  client: ClientRelation | ClientRelation[] | null;
};

type Payment = {
  id: string;
  amount: number;
  paid_at: string;
  method: string;
  notes: string | null;
};

const methodLabels: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  bank_transfer: "Transferência",
  other: "Outro",
};

function formatarMoeda(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatarData(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatarDataBanco(value: string) {
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function obterNomeCliente(client: Receivable["client"]) {
  if (!client) {
    return "Cliente não encontrado";
  }

  if (Array.isArray(client)) {
    return client[0]?.name ?? "Cliente não encontrado";
  }

  return client.name;
}

export function ReceivableDetailsScreen({ route, navigation }: ScreenProps) {
  const { receivableId } = route.params;

  const [receivable, setReceivable] = useState<Receivable | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);

      const [receivableResult, paymentsResult] = await Promise.all([
        supabase
          .from("receivables")
          .select(
            `
              id,
              description,
              amount,
              due_date,
              status,
              installment_number,
              installment_total,
              notes,
              client:clients!receivables_client_id_fkey (
                id,
                name
              )
            `,
          )
          .eq("id", receivableId)
          .single(),

        supabase
          .from("payments")
          .select(
            `
              id,
              amount,
              paid_at,
              method,
              notes
            `,
          )
          .eq("receivable_id", receivableId)
          .order("paid_at", {
            ascending: false,
          }),
      ]);

      if (receivableResult.error) {
        throw receivableResult.error;
      }

      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      setReceivable(receivableResult.data as Receivable);

      setPayments((paymentsResult.data ?? []) as Payment[]);
    } catch (error) {
      console.error("Erro ao carregar cobrança:", error);
    } finally {
      setLoading(false);
    }
  }, [receivableId]);

  useFocusEffect(
    useCallback(() => {
      void carregarDados();
    }, [carregarDados]),
  );

  const paidAmount = useMemo(() => {
    return payments.reduce(
      (total, payment) => total + Number(payment.amount),
      0,
    );
  }, [payments]);

  const remainingAmount = Math.max(
    Number(receivable?.amount ?? 0) - paidAmount,
    0,
  );

  if (loading && !receivable) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />

        <Text style={styles.loadingText}>Carregando cobrança...</Text>
      </SafeAreaView>
    );
  }

  if (!receivable) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>Cobrança não encontrada</Text>
      </SafeAreaView>
    );
  }

  const paymentBlocked =
    receivable.status === "cancelled" || remainingAmount <= 0;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.clientLabel}>Cliente</Text>

          <Text style={styles.clientName}>
            {obterNomeCliente(receivable.client)}
          </Text>

          <Text style={styles.description}>{receivable.description}</Text>

          <Text style={styles.totalAmount}>
            {formatarMoeda(Number(receivable.amount))}
          </Text>

          <Text style={styles.installment}>
            Parcela {receivable.installment_number}/
            {receivable.installment_total}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Recebido</Text>

            <Text style={styles.paidValue}>{formatarMoeda(paidAmount)}</Text>
          </View>

          <View style={styles.summarySpace} />

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Restante</Text>

            <Text style={styles.remainingValue}>
              {formatarMoeda(remainingAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.informationCard}>
          <View style={styles.informationRow}>
            <Text style={styles.informationLabel}>Vencimento</Text>

            <Text style={styles.informationValue}>
              {formatarDataBanco(receivable.due_date)}
            </Text>
          </View>

          <View style={styles.informationRow}>
            <Text style={styles.informationLabel}>Status</Text>

            <Text style={styles.informationValue}>
              {receivable.status === "paid"
                ? "Pago"
                : receivable.status === "partial"
                  ? "Parcial"
                  : receivable.status === "cancelled"
                    ? "Cancelado"
                    : "Pendente"}
            </Text>
          </View>
        </View>

        {receivable.notes ? (
          <View style={styles.informationCard}>
            <Text style={styles.sectionTitle}>Observações</Text>

            <Text style={styles.notes}>{receivable.notes}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.paymentButton,
            paymentBlocked && styles.disabledButton,
          ]}
          disabled={paymentBlocked}
          onPress={() =>
            navigation.navigate("PagamentoFormulario", {
              receivableId,
            })
          }
        >
          <Text style={styles.paymentButtonText}>
            {remainingAmount <= 0
              ? "Cobrança totalmente paga"
              : "Registrar pagamento"}
          </Text>
        </Pressable>

        <Text style={styles.paymentsTitle}>Histórico de pagamentos</Text>

        {payments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum pagamento registrado.</Text>
          </View>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentMethod}>
                  {methodLabels[payment.method] ?? "Outro"}
                </Text>

                <Text style={styles.paymentValue}>
                  {formatarMoeda(Number(payment.amount))}
                </Text>
              </View>

              <Text style={styles.paymentDate}>
                Recebido em {formatarData(payment.paid_at)}
              </Text>

              {payment.notes ? (
                <Text style={styles.paymentNotes}>{payment.notes}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
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
    backgroundColor: "#f4f7f6",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#60727a",
    marginTop: 12,
  },

  errorTitle: {
    color: "#16324f",
    fontSize: 20,
    fontWeight: "800",
  },

  headerCard: {
    backgroundColor: "#16324f",
    borderRadius: 20,
    padding: 22,
  },

  clientLabel: {
    color: "#9bb0bc",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  clientName: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 5,
  },

  description: {
    color: "#d6e0e5",
    fontSize: 15,
    marginTop: 7,
  },

  totalAmount: {
    color: "#7ce0d7",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 22,
  },

  installment: {
    color: "#d6e0e5",
    fontSize: 13,
    marginTop: 5,
  },

  summaryRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  summarySpace: {
    width: 12,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
  },

  summaryLabel: {
    color: "#718087",
    fontSize: 13,
  },

  paidValue: {
    color: "#16a34a",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },

  remainingValue: {
    color: "#d97706",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },

  informationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginTop: 14,
  },

  informationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },

  informationLabel: {
    color: "#718087",
    fontSize: 14,
  },

  informationValue: {
    color: "#263238",
    fontSize: 14,
    fontWeight: "700",
  },

  sectionTitle: {
    color: "#16324f",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },

  notes: {
    color: "#60727a",
    fontSize: 14,
    lineHeight: 20,
  },

  paymentButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.5,
  },

  paymentButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  paymentsTitle: {
    color: "#16324f",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 28,
    marginBottom: 12,
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
  },

  emptyText: {
    color: "#718087",
    fontSize: 14,
  },

  paymentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 17,
    marginBottom: 10,
  },

  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  paymentMethod: {
    color: "#16324f",
    fontSize: 15,
    fontWeight: "800",
  },

  paymentValue: {
    color: "#16a34a",
    fontSize: 17,
    fontWeight: "800",
  },

  paymentDate: {
    color: "#718087",
    fontSize: 13,
    marginTop: 7,
  },

  paymentNotes: {
    color: "#60727a",
    fontSize: 13,
    marginTop: 7,
  },
});
