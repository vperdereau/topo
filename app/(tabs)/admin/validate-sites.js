import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { db } from '../../../firebaseConfig'; // Ajuste le chemin

export default function AdminSitesScreen() {
  const [pendingSites, setPendingSites] = useState([]);

  const fetchPending = async () => {
    // On cherche tout ce qui est "pending"
    const q = query(collection(db, "sites"), where("status", "==", "pending"));
    const snap = await getDocs(q);
    setPendingSites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id) => {
    await updateDoc(doc(db, "sites", id), { status: "published" });
    Alert.alert("Succès", "Site publié !");
    fetchPending(); // Rafraichir la liste
  };

  const handleDelete = async (id) => {
    Alert.alert("Confirmer", "Supprimer cette proposition ?", [
        { text: "Annuler" },
        { text: "Supprimer", style: 'destructive', onPress: async () => {
            await deleteDoc(doc(db, "sites", id));
            fetchPending();
        }}
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Validations en attente</Text>
      
      {pendingSites.length === 0 && <Text style={{color:'#666', marginTop:20}}>Aucune demande.</Text>}

      <FlatList 
        data={pendingSites}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <View style={styles.card}>
                <View style={{flex:1}}>
                    <Text style={styles.siteName}>{item.nom}</Text>
                    <Text style={styles.coords}>{item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.btn, {backgroundColor: COLORS.danger}]}>
                        <Ionicons name="trash" size={20} color="#fff"/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleApprove(item.id)} style={[styles.btn, {backgroundColor: COLORS.success}]}>
                        <Ionicons name="checkmark" size={20} color="#fff"/>
                    </TouchableOpacity>
                </View>
            </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  siteName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  coords: { color: '#888', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});