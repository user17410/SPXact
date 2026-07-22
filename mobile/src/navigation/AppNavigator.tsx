import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants';
import { useRole } from '../context';
import {
  HomeScreen,
  ServicesScreen,
  ActivityScreen,
  AccountScreen,
  RiderHomeScreen,
  RiderDeliveriesScreen,
  RiderEarningsScreen,
  LoginScreen,
  DemoFlowScreen,
} from '../screens';

const Tab = createBottomTabNavigator();

function BuyerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Services') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Demo') iconName = focused ? 'flash' : 'flash-outline';
          else if (route.name === 'Activity') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 4, borderTopColor: Colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Demo" component={DemoFlowScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
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
          if (route.name === 'Dashboard') iconName = focused ? 'speedometer' : 'speedometer-outline';
          else if (route.name === 'Deliveries') iconName = focused ? 'bicycle' : 'bicycle-outline';
          else if (route.name === 'Demo') iconName = focused ? 'flash' : 'flash-outline';
          else if (route.name === 'Earnings') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 4, borderTopColor: Colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Dashboard" component={RiderHomeScreen} />
      <Tab.Screen name="Deliveries" component={RiderDeliveriesScreen} />
      <Tab.Screen name="Demo" component={DemoFlowScreen} />
      <Tab.Screen name="Earnings" component={RiderEarningsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { role, isLoggedIn, login } = useRole();

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(selectedRole) => login(selectedRole)} />;
  }

  return (
    <NavigationContainer>
      {role === 'buyer' ? <BuyerTabs /> : <RiderTabs />}
    </NavigationContainer>
  );
}
