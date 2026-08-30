import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "@react-native-vector-icons/ionicons";
import type { Session } from "@supabase/supabase-js";

import { ClientFormScreen } from "../screens/ClientsFormScreen";
import { ClientsScreen } from "../screens/ClientsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ServicesScreen } from "../screens/ServicesScreen";
import { ServiceFormScreen } from "../screens/ServiceFormScreen";
import { BudgetsScreen } from "../screens/BudgetsScreen";
import { BudgetFormScreen } from "../screens/BudgetFormScreen";

import type { MainTabParamList, RootStackParamList } from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons = {
  Inicio: {
    active: "home",
    inactive: "home-outline",
  },

  Clientes: {
    active: "people",
    inactive: "people-outline",
  },

  Servicos: {
    active: "hammer",
    inactive: "hammer-outline",
  },

  Perfil: {
    active: "person",
    inactive: "person-outline",
  },

  Orcamentos: {
    active: "document-text",
    inactive: "document-text-outline",
  },
} as const;

type MainTabsProps = {
  session: Session;
};

function MainTabs({ session }: MainTabsProps) {
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: "#17a398",
        tabBarInactiveTintColor: "#87959d",

        tabBarHideOnKeyboard: true,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },

        tabBarItemStyle: {
          paddingVertical: 4,
        },

        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#d7e0e3",
          borderTopWidth: 1,
        },

        sceneStyle: {
          backgroundColor: "#f4f7f6",
        },

        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIcons[route.name];

          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Inicio"
        options={{
          tabBarLabel: "Início",
        }}
      >
        {(props) => <HomeScreen {...props} session={session} />}
      </Tab.Screen>

      <Tab.Screen name="Clientes" component={ClientsScreen} />

      <Tab.Screen
        name="Orcamentos"
        component={BudgetsScreen}
        options={{
          tabBarLabel: "Orçamentos",
        }}
      />

      <Tab.Screen
        name="Servicos"
        component={ServicesScreen}
        options={{
          tabBarLabel: "Serviços",
        }}
      />

      <Tab.Screen
        name="Perfil"
        options={{
          tabBarLabel: "Perfil",
        }}
      >
        {(props) => <ProfileScreen {...props} session={session} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

type AppNavigatorProps = {
  session: Session;
};

export function AppNavigator({ session }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#16324f",
          },

          headerTintColor: "#ffffff",

          headerTitleStyle: {
            fontWeight: "800",
          },

          contentStyle: {
            backgroundColor: "#f4f7f6",
          },
        }}
      >
        <RootStack.Screen
          name="Principal"
          options={{
            headerShown: false,
          }}
        >
          {() => <MainTabs session={session} />}
        </RootStack.Screen>

        <RootStack.Screen
          name="ClienteFormulario"
          component={ClientFormScreen}
          options={({ route }) => ({
            title: route.params?.clientId ? "Editar cliente" : "Novo cliente",
          })}
        />

        <RootStack.Screen
          name="ServicoFormulario"
          component={ServiceFormScreen}
          options={({ route }) => ({
            title: route.params?.serviceId ? "Editar serviço" : "Novo serviço",
          })}
        />

        <RootStack.Screen
          name="OrcamentoFormulario"
          component={BudgetFormScreen}
          options={({ route }) => ({
            title: route.params?.budgetId
              ? "Editar orçamento"
              : "Novo orçamento",
          })}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
