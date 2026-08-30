import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { supabase } from "../lib/supabase";
import type { MainTabParamList } from "../navigation/types";

type ProfileScreenProps = BottomTabScreenProps<MainTabParamList, "Perfil"> & {
  session: Session;
};

export function ProfileScreen({ session }: ProfileScreenProps) {
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    try {
      setSaindo(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a sessão.";

      Alert.alert("Erro ao sair", mensagem);
    } finally {
      setSaindo(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Perfil</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Usuário conectado</Text>

          <Text style={styles.email}>
            {session.user.email ?? "E-mail não disponível"}
          </Text>
        </View>

        <Pressable
          style={[styles.logoutButton, saindo && styles.buttonDisabled]}
          onPress={sair}
          disabled={saindo}
        >
          {saindo ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.logoutText}>Sair da conta</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f6",
  },

  container: {
    flex: 1,
    padding: 24,
  },

  title: {
    color: "#16324f",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 16,
    padding: 20,
  },

  label: {
    color: "#60727a",
    fontSize: 14,
    fontWeight: "700",
  },

  email: {
    color: "#16324f",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 6,
  },

  logoutButton: {
    height: 54,
    backgroundColor: "#c0392b",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  logoutText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});
