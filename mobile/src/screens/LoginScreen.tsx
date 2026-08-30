import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../lib/supabase";

type LoginScreenProps = {
  onCriarConta: () => void;
};

export function LoginScreen({ onCriarConta }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    const emailFormatado = email.trim().toLowerCase();

    if (!emailFormatado || !senha) {
      Alert.alert("Campos obrigatórios", "Preencha o e-mail e a senha.");

      return;
    }

    if (!emailFormatado.includes("@")) {
      Alert.alert("E-mail inválido", "Informe um endereço de e-mail válido.");

      return;
    }

    try {
      setCarregando(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: emailFormatado,
        password: senha,
      });

      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          Alert.alert("Não foi possível entrar", "E-mail ou senha incorretos.");

          return;
        }

        throw error;
      }
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.";

      Alert.alert("Erro", mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>OC</Text>
          </View>

          <Text style={styles.title}>Bem-vindo</Text>

          <Text style={styles.subtitle}>
            Entre para gerenciar seus clientes, orçamentos e obras.
          </Text>

          <Text style={styles.label}>E-mail</Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="exemplo@email.com"
            placeholderTextColor="#87959d"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!carregando}
          />

          <Text style={styles.label}>Senha</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={senha}
              onChangeText={setSenha}
              placeholder="Digite sua senha"
              placeholderTextColor="#87959d"
              secureTextEntry={!mostrarSenha}
              autoCapitalize="none"
              editable={!carregando}
              onSubmitEditing={entrar}
            />

            <Pressable
              style={styles.eyeButton}
              onPress={() => setMostrarSenha((visivel) => !visivel)}
              accessibilityRole="button"
              accessibilityLabel={
                mostrarSenha ? "Esconder senha" : "Mostrar senha"
              }
              disabled={carregando}
            >
              <Ionicons
                name={mostrarSenha ? "eye-off-outline" : "eye-outline"}
                size={23}
                color="#60727a"
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, carregando && styles.buttonDisabled]}
            onPress={entrar}
            disabled={carregando}
          >
            {carregando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>

          <Pressable onPress={onCriarConta} disabled={carregando}>
            <Text style={styles.linkText}>Ainda não tenho uma conta</Text>
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
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#16324f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  logoText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
  },

  title: {
    color: "#16324f",
    fontSize: 32,
    fontWeight: "800",
  },

  subtitle: {
    color: "#60727a",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 32,
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

  passwordContainer: {
    position: "relative",
    marginBottom: 20,
  },

  passwordInput: {
    height: 54,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 14,
    color: "#263238",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingRight: 52,
  },

  eyeButton: {
    position: "absolute",
    right: 8,
    top: 7,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  button: {
    height: 56,
    backgroundColor: "#17a398",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  linkText: {
    color: "#16324f",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
  },
});
