import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Session } from "@supabase/supabase-js";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/types";

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home"> & {
  session: Session;
};

export function HomeScreen({ navigation, session }: HomeScreenProps) {
  async function sair() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Erro", "Não foi possível encerrar a sessão.");
    }
  }

  function abrirClientes() {
    navigation.navigate("Clientes");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>

        <Text style={styles.welcome}>Usuário conectado:</Text>

        <Text style={styles.email}>{session.user.email}</Text>

        <Pressable style={styles.primaryButton} onPress={abrirClientes}>
          <Text style={styles.primaryButtonText}>Gerenciar clientes</Text>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={sair}>
          <Text style={styles.logoutButtonText}>Sair da conta</Text>
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
    justifyContent: "center",
  },

  title: {
    color: "#16324f",
    fontSize: 32,
    fontWeight: "800",
  },

  welcome: {
    color: "#60727a",
    fontSize: 16,
    marginTop: 12,
  },

  email: {
    color: "#17a398",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 32,
  },

  primaryButton: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  logoutButton: {
    height: 52,
    borderWidth: 1,
    borderColor: "#16324f",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  logoutButtonText: {
    color: "#16324f",
    fontSize: 16,
    fontWeight: "700",
  },
});
