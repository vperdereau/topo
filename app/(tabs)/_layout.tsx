import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF', headerShown: false }}>
      
      {/* 1. Onglet CARTE (Home) */}
      <Tabs.Screen
        name="index" // Correspond à app/index.tsx
        options={{
          title: 'Carte',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />

      {/* 2. Onglet CARNET (Logbook) */}
      <Tabs.Screen
        name="logbook" // Correspond à app/logbook.tsx
        options={{
          title: 'Carnet',
          tabBarIcon: ({ color }) => <Ionicons name="book" size={24} color={color} />,
        }}
      />

      {/* 3. NOUVEL ONGLET : ADMIN */}
      <Tabs.Screen
        name="admin" // Correspond au dossier app/admin/ (et son fichier index.js)
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => <Ionicons name="construct" size={24} color={color} />,
          // On peut cacher cet onglet plus tard pour les non-admins si besoin
        }}
      />
      
    </Tabs>
  );
}