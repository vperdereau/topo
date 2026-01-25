import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    // On définit une "Stack" (navigation par empilement) pour ce dossier
    // Cela regroupe tous les fichiers du dossier sous une seule bannière
    <Stack screenOptions={{ headerShown: false }}>
      
      {/* L'écran principal (ton Dashboard) */}
      <Stack.Screen name="index" options={{ title: 'Admin' }} />

      {/* L'éditeur (caché de la barre d'onglets, accessible via navigation) */}
      <Stack.Screen name="editor" options={{ presentation: 'modal' }} />

      {/* Tous les autres fichiers du dossier seront gérés automatiquement ici */}
    </Stack>
  );
}