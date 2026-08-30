import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "./src/lib/supabase";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SignUpScreen } from "./src/screens/SignUpScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [mostrando, setMostrando] = useState<"login" | "signup">("login");

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarSessao() {
      const { data, error } = await supabase.auth.getSession();

      if (!componenteAtivo) {
        return;
      }

      if (error) {
        console.error("Erro ao recuperar sessão:", error.message);
      }

      setSession(data.session);
      setVerificandoSessao(false);
    }

    carregarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      if (!componenteAtivo) {
        return;
      }

      setSession(novaSessao);
      setVerificandoSessao(false);
    });

    return () => {
      componenteAtivo = false;
      subscription.unsubscribe();
    };
  }, []);

  if (verificandoSessao) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17a398" />
      </View>
    );
  }

  if (session) {
    return <AppNavigator session={session} />;
  }

  if (mostrando === "login") {
    return <LoginScreen onCriarConta={() => setMostrando("signup")} />;
  }

  return <SignUpScreen onVoltarParaLogin={() => setMostrando("login")} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f4f7f6",
    alignItems: "center",
    justifyContent: "center",
  },
});
