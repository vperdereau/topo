import { Stack } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import LoginScreen from '../LoginScreen'; // Chemin vers la racine

export default function RootLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <View style={{flex:1, backgroundColor:'#000'}}><ActivityIndicator /></View>;

  // Si pas d'utilisateur, on retourne DIRECTEMENT le LoginScreen.
  // Comme on ne rend pas le <Stack>, aucune navigation n'est chargée -> Pas d'onglets.
  if (!user) {
    return <LoginScreen />;
  }

  // Si utilisateur connecté, on rend la Stack qui contient les (tabs)
  return (
    <Stack screenOptions={{ headerShown: false, headerStyle:{backgroundColor:'#121212'}, headerTintColor:'#fff' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* Tes autres écrans globaux */}
      <Stack.Screen name="SiteDetails" />
      <Stack.Screen name="Topo" /> 
      {/* Note: Pour que ça marche avec Expo Router, idéalement tes fichiers SiteDetails, Topo, etc. 
          devraient être dans le dossier app/ (ex: app/topo.js) 
          Si tu veux garder tes imports manuels 'component={TopoScreen}', 
          tu devras peut-être garder ton ancienne méthode, mais c'est moins "Expo Router".
      */}
    </Stack>
  );
}