import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants';
import { useRole } from '../context';
import { AccountScreen, RiderLiveScreen, RecipientLiveScreen, RoleSelectScreen } from '../screens';

const Tab = createBottomTabNavigator();

function RecipientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Delivery') iconName = focused ? 'cube' : 'cube-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 4, borderTopColor: Colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Delivery" component={RecipientLiveScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function RiderTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Delivery') iconName = focused ? 'bicycle' : 'bicycle-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 4, borderTopColor: Colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Delivery" component={RiderLiveScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { role, isLoggedIn, login } = useRole();

  if (!isLoggedIn) {
    return <RoleSelectScreen onSelect={(selectedRole) => login(selectedRole)} />;
  }

  return (
    <NavigationContainer>
      {role === 'buyer' ? <RecipientTabs /> : <RiderTabs />}
    </NavigationContainer>
  );
}
