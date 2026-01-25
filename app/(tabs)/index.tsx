import { createStackNavigator } from '@react-navigation/stack';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';

// --- IMPORTS ---
import HomeScreen from '../../HomeScreen';
import LoginScreen from '../../LoginScreen';
import MapScreen from '../../MapScreen';
import RouteSocialScreen from '../../RouteSocialScreen';
import TopoScreen from '../../TopoScreen';
import ProposeRouteScreen from '../propose-route';
import TopoEditor from './admin/editor';


// 👇 1. AJOUTE CET IMPORT (Vérifie le chemin selon où tu as créé le fichier)
import SiteDetailsScreen from '../../SiteDetailsScreen';

const Stack = createStackNavigator();
const auth = getAuth();

export default function AppStack() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ 
      headerStyle: { backgroundColor: '#121212' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}>
      {user ? (
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }} 
          />

          {/* 👇 2. AJOUTE CETTE ROUTE OBLIGATOIREMENT */}
          <Stack.Screen 
            name="SiteDetails" 
            component={SiteDetailsScreen} 
            options={{ headerShown: false }} // On gère le header dans le composant
          />
          
          <Stack.Screen 
            name="Topo" 
            component={TopoScreen} 
            options={{ headerShown: false }} 
          />

          <Stack.Screen 
            name="Map" 
            component={MapScreen} 
            options={{ headerShown: false }} 
          />
          
          <Stack.Screen 
            name="RouteSocial" 
            component={RouteSocialScreen} 
            options={{ title: 'Détails Voie', headerShown: false }} 
          />
          
          <Stack.Screen 
            name="TopoEditor" 
            component={TopoEditor} 
            options={{ title: 'Création de Topo', headerShown: false }} 
          />
          <Stack.Screen 
  name="ProposeRoute" 
  component={ProposeRouteScreen} 
  options={{ headerShown: false }} // On gère le header nous-mêmes
/>
        </>
      ) : (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
      )}
    </Stack.Navigator>
  );
}