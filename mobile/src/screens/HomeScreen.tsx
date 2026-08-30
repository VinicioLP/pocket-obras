import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import type { MainTabParamList } from "../navigation/types";

type HomeScreenProps = BottomTabScreenProps<MainTabParamList, "Inicio"> & {
  session: Session;
};

export function HomeScreen({ session, navigation }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.greeting}>Bem-vindo</Text>

        <Text style={styles.email}>{session.user.email}</Text>

        <Text style={styles.title}>O que deseja fazer?</Text>

        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("Clientes")}
        >
          <Text style={styles.cardTitle}>Clientes</Text>

          <Text style={styles.cardDescription}>
            Consulte, cadastre e edite seus clientes.
          </Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("Orcamentos")}
        >
          <Text style={styles.cardTitle}>Orçamentos</Text>

          <Text style={styles.cardDescription}>
            Crie propostas e acompanhe aprovações.
          </Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("Servicos")}
        >
          <Text style={styles.cardTitle}>Serviços</Text>

          <Text style={styles.cardDescription}>
            Organize os serviços utilizados nos orçamentos.
          </Text>
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

  greeting: {
    color: "#16324f",
    fontSize: 30,
    fontWeight: "800",
  },

  email: {
    color: "#17a398",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 32,
  },

  title: {
    color: "#263238",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e0e3",
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },

  cardTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
  },

  cardDescription: {
    color: "#60727a",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
});
