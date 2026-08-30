import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function ServicesScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Serviços</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Módulo de serviços</Text>

          <Text style={styles.description}>
            A navegação está pronta. Na próxima etapa, criaremos a listagem e o
            cadastro dos serviços.
          </Text>
        </View>
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

  cardTitle: {
    color: "#16324f",
    fontSize: 18,
    fontWeight: "800",
  },

  description: {
    color: "#60727a",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
});
