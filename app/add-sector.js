import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

export default function AddSectorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { siteId, siteName } = params;

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);


const handleCreate = async () => {
    if (!name.trim()) return Alert.alert("Erreur", "Le nom du secteur est requis.");
    
    setLoading(true);
    try {
        await addDoc(collection(db, "pending_sectors"), {
            nom: name.trim(),
            siteId: siteId,
            siteName: siteName, // Utile pour l'admin pour savoir de quel site on parle
            createdAt: serverTimestamp(),
            status: 'pending'
        });

        Alert.alert(
            "Proposition envoyée", 
            "Le secteur sera visible après validation."
        );
        router.back();
    } catch (e) { 
        Alert.alert("Erreur", e.message); 
    } finally { 
        setLoading(false); 
    }
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau Secteur</Text>
        <View style={{width: 28}} />
      </View>

      <View style={styles.form}>
        <Text style={{color:'#aaa', marginBottom: 20, textAlign:'center'}}>
            Ajout d'un secteur au site : <Text style={{color:'#fff', fontWeight:'bold'}}>{siteName}</Text>
        </Text>

        <Text style={styles.label}>Nom du secteur</Text>
        <TextInput 
            placeholder="Ex: Face Nord, La Plage..." 
            placeholderTextColor="#666" 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            autoFocus={true}
        />

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#000"/> : <Text style={styles.createBtnText}>Ajouter ce secteur</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#1a1a1a' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  form: { padding: 20, paddingTop: 40 },
  label: { color: '#ccc', marginBottom: 8, fontWeight:'bold' },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 30, fontSize: 16 },
  createBtn: { backgroundColor: '#FFD700', padding: 15, borderRadius: 10, alignItems: 'center' },
  createBtnText: { fontWeight: 'bold', fontSize: 16, color: '#000' }
});