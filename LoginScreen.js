import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, Platform,
  StyleSheet, Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';

// --- IMPORTS FIREBASE ---
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// --- IMPORTS EXPO AUTH ---
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- CONFIGURATION GOOGLE ---
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Remplace par tes vrais IDs créés dans Google Cloud Console
    clientId: 'TON_ID_WEB.apps.googleusercontent.com', 
    iosClientId: 'TON_ID_IOS.apps.googleusercontent.com', // Optionnel pour l'instant mais recommandé
    androidClientId: 'TON_ID_ANDROID.apps.googleusercontent.com', // Optionnel pour l'instant mais recommandé
  });


  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          const user = userCredential.user;
          // Création ou mise à jour du user
          await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            pseudo: user.displayName || "Grimpeur Google",
            photoUrl: user.photoURL, // On récupère aussi la photo Google c'est sympa
            lastLogin: new Date()
          }, { merge: true });
        })
        .catch((error) => {
          console.error("Firebase Auth Error:", error);
          Alert.alert("Erreur Google", error.message);
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
        console.error("Google Auth Error:", response.error);
        Alert.alert("Erreur", "Connexion Google échouée.");
    }
  }, [response]);

  // ... LE RESTE DE TON CODE (handleAuthAction, return JSX...) reste identique
  
  // Juste une petite correction dans le JSX pour le bouton Google
  // Assure-toi que request est bien chargé avant de cliquer
  /* 
     <TouchableOpacity 
        style={[styles.googleButton, !request && { opacity: 0.5 }]} // Visuel désactivé si pas prêt
        disabled={!request} 
        onPress={() => promptAsync()}
     >
  */
 
  // ...
  
  // (Je remets la partie handleAuthAction et le return pour que le fichier soit complet si tu fais un copier-coller)
  const handleAuthAction = async () => {
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert("Erreur", "Merci de remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          createdAt: new Date(),
          pseudo: "Grimpeur Anonyme",
          niveau: "Non renseigné"
        });
        Alert.alert("Bienvenue !", "Compte créé avec succès.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Oups", error.message); // Affiche le message brut pour débugger
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        
        <Text style={styles.title}>Climbing Topo</Text>
        <Text style={styles.subtitle}>
          {isLoginMode ? "Connecte-toi pour accéder aux topos" : "Crée ton compte grimpeur"}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity style={styles.mainButton} onPress={handleAuthAction} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.mainButtonText}>
              {isLoginMode ? "Se connecter" : "S'inscrire"} via Email
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>OU</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity 
          style={[styles.googleButton, !request && { opacity: 0.6 }]} 
          disabled={!request} 
          onPress={() => promptAsync()}
        >
          <Ionicons name="logo-google" size={20} color="white" style={{ marginRight: 10 }} />
          <Text style={styles.googleButtonText}>Continuer avec Google</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton} 
          onPress={() => setIsLoginMode(!isLoginMode)}
        >
          <Text style={styles.switchText}>
            {isLoginMode 
              ? "Pas encore de compte ? Créer un compte" 
              : "Déjà un compte ? Me connecter"}
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  innerContainer: { paddingHorizontal: 30, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#007AFF', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  inputContainer: { width: '100%', marginBottom: 10 },
  input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  mainButton: { backgroundColor: '#007AFF', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  mainButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#eee' },
  orText: { marginHorizontal: 10, color: '#aaa', fontWeight: 'bold' },
  googleButton: { flexDirection: 'row', backgroundColor: '#DB4437', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  googleButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switchButton: { marginTop: 20, padding: 10 },
  switchText: { color: '#007AFF', fontWeight: '600' }
});