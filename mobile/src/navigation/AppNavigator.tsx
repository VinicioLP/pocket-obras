import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Session } from "@supabase/supabase-js";

import { ClientFormScreen } from "../screens/ClientFormScreen";
import { ClientsScreen } from "../screens/ClientScreen";
import { HomeScreen } from "../screens/HomeScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

type AppNavigatorProps = {
  session: Session;
};

export function AppNavigator({ session }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTintColor: "#ffffff",
          headerStyle: {
            backgroundColor: "#16324f",
          },
          contentStyle: {
            backgroundColor: "#f4f7f6",
          },
        }}
      >
        <Stack.Screen
          name="Home"
          options={{
            headerShown: false,
          }}
        >
          {(navigationProps) => (
            <HomeScreen {...navigationProps} session={session} />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="Clientes"
          component={ClientsScreen}
          options={{
            title: "Clientes",
          }}
        />

        <Stack.Screen
          name="ClienteFormulario"
          component={ClientFormScreen}
          options={({ route }) => ({
            title: route.params?.clientId ? "Editar cliente" : "Novo cliente",
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
