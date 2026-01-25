import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'; // 👈 Ajout de useFocusEffect
import { collection, getDocs } from 'firebase/firestore';
import { useCallback, useState } from 'react'; // 👈 Ajout de useCallback
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

export default function TopoListScreen() {
  const router = useRouter();
  const { cragId } = useLocalSearchParams();
  const [topos, setTopos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 👇 REMPLACEMENT DE useEffect PAR useFocusEffect
  // Cela permet de recharger la liste à chaque fois qu'on revient sur cet écran
  useFocusEffect(
    useCallback(() => {
      const fetchTopos = async () => {
        setLoading(true); // On remet le loading pour montrer que ça rafraichit
        try {
          const q = collection(db, "secteurs", cragId, "topos");
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTopos(list);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };

      if (cragId) fetchTopos();

      // Fonction de nettoyage (optionnelle ici)
      return () => {};
    }, [cragId])
  );

  const goToEditor = (topoData) => {
    const jsonParams = topoData ? JSON.stringify(topoData) : null;
    router.push({
      pathname: "/admin/editor",
      params: { 
        cragId: cragId,
        topoDataJson: jsonParams 
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.title}>Gérer les Topos</Text>
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={() => goToEditor(null)}>
        <Ionicons name="camera" size={20} color="#fff" />
        <Text style={styles.newBtnText}>Ajouter une nouvelle photo</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>Ou modifier un existant :</Text>

      {loading ? <ActivityIndicator size="large" color="#007AFF" style={{marginTop:20}} /> : (
          <FlatList
            data={topos}
            keyExtractor={item => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => goToEditor(item)}>
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
                <View style={{padding:5}}>
                    <Text style={styles.cardText}>
                        {item.routes ? item.routes.length : 0} voies tracées
                    </Text>
                    {/* On affiche la date ou un petit ID pour debug visuel */}
                    <Text style={{fontSize:10, color:'#999', textAlign:'center'}}>
                         Modifié : {item.routes && item.routes.length > 0 ? new Date(item.routes[item.routes.length-1].createdAt).toLocaleTimeString() : '-'}
                    </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color:'#999'}}>Aucun topo pour ce secteur.</Text>}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  newBtn: { flexDirection: 'row', backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  newBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#666' },
  card: { flex: 0.5, margin: 5, backgroundColor: '#fff', borderRadius: 10, padding: 0, elevation: 2, overflow:'hidden' },
  thumb: { width: '100%', height: 120, backgroundColor: '#eee' },
  cardText: { textAlign: 'center', fontWeight:'bold', fontSize: 14, color: '#333' }
});