import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { arrayUnion, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { db } from '../../../firebaseConfig';
import { getGradeColor } from '../../../utils/gradeColors';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('routes'); // 'routes', 'secteurs', 'sites'
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pour la prévisualisation
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Charger les données selon l'onglet
  const fetchPending = async () => {
    setLoading(true);
    try {
        let colName = "pending_routes";
        if (activeTab === 'secteurs') colName = "pending_sectors";
        if (activeTab === 'sites') colName = "pending_crags";

        const q = collection(db, colName);
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPendingItems(items);
    } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Impossible de charger les propositions.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [activeTab]);

  // --- ACTIONS DE VALIDATION ---

  const handleApprove = async () => {
    if (!selectedItem) return;

    try {
        if (activeTab === 'routes') {
            // 1. Référence vers le VRAI topo
            const topoRef = doc(db, "secteurs", selectedItem.cragId, "topos", selectedItem.topoId);
            
            // 2. Ajouter la voie au tableau 'routes' du topo existant
            const newRoute = {
                id: Date.now().toString(), // Générer un ID unique
                nom: selectedItem.nom,
                cotation: selectedItem.cotation,
                path: selectedItem.path,
                addedBy: 'community' // Optionnel : pour savoir d'où ça vient
            };

            await updateDoc(topoRef, {
                routes: arrayUnion(newRoute)
            });

            // 3. Supprimer de la liste d'attente
            await deleteDoc(doc(db, "pending_routes", selectedItem.id));
            
            Alert.alert("Validé", "La voie a été ajoutée au topo officiel.");
            setSelectedItem(null);
            fetchPending(); // Rafraîchir la liste
        }
        // Ajouter ici la logique pour 'sites' et 'secteurs' plus tard...
    } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Échec de la validation : " + e.message);
    }
  };

  const handleReject = async () => {
      if (!selectedItem) return;
      Alert.alert(
          "Refuser", 
          "Supprimer définitivement cette proposition ?",
          [
              { text: "Annuler", style: "cancel" },
              { text: "Supprimer", style: 'destructive', onPress: async () => {
                  try {
                    await deleteDoc(doc(db, `pending_${activeTab}`, selectedItem.id));
                    setSelectedItem(null);
                    fetchPending();
                  } catch(e) { Alert.alert("Erreur", e.message); }
              }}
          ]
      );
  };

  // Récupérer l'image du topo original pour la preview
  const openPreview = async (item) => {
      // Pour afficher le tracé, il nous faut l'image de fond. 
      // Idéalement, on stocke l'URL de l'image dans la proposition (ce que tu fais déjà via topoId, mais c'est mieux de passer l'URL directement dans propose-route.js ou de la fetcher ici).
      // Pour simplifier, supposons qu'on doive aller chercher l'image du topo parent :
      try {
          if (activeTab === 'routes') {
             // Astuce : Dans propose-route.js, ajoute `imageUrl` dans le addDoc pending_routes pour éviter de refaire un fetch ici !
             // Si tu ne l'as pas fait, il faudra faire un getDoc(topoRef) ici.
             // On va supposer que tu vas l'ajouter (voir note plus bas).
             setSelectedItem(item);
          }
      } catch (e) { console.log(e); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openPreview(item)}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.nom}</Text>
            <View style={[styles.badge, { backgroundColor: getGradeColor(item.cotation) }]}>
                <Text style={styles.badgeText}>{item.cotation}</Text>
            </View>
        </View>
        <Text style={styles.subText}>ID Topo: ...{item.topoId.slice(-5)}</Text>
        <Text style={styles.dateText}>Le {new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back}><Ionicons name="arrow-back" size={24} color="#333"/></TouchableOpacity>
        <Text style={styles.headerTitle}>Administration</Text>
        <View style={{width:24}}/>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
          {['routes', 'secteurs', 'sites'].map(tab => (
              <TouchableOpacity 
                key={tab} 
                onPress={() => setActiveTab(tab)}
                style={[styles.tabItem, activeTab === tab && styles.tabActive]}
              >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
              </TouchableOpacity>
          ))}
      </View>

      {/* Liste */}
      {loading ? <ActivityIndicator size="large" style={{marginTop:20}}/> : (
          <FlatList 
            data={pendingItems}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune validation en attente.</Text>}
            contentContainerStyle={{ padding: 20 }}
          />
      )}

      {/* MODAL DE VALIDATION (PREVIEW) */}
      <Modal visible={!!selectedItem} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Valider : {selectedItem?.nom}</Text>
                  
                  {/* Prévisualisation Visuelle */}
                  <View style={styles.previewContainer}>
                      {/* Note : Pour que ça marche parfaitement, assure-toi d'enregistrer l'URL de l'image dans pending_routes */}
                      {/* Si l'image n'est pas dispo, affiche un placeholder */}
                      <View style={{width: '100%', height: 300, backgroundColor: '#333', justifyContent:'center', alignItems:'center'}}>
                          {/* Calque SVG du tracé proposé */}
                          <Svg height="100%" width="100%" viewBox={`0 0 ${selectedItem?.imageDimensions?.width || SCREEN_WIDTH} ${selectedItem?.imageDimensions?.height || 300}`}>
                             <Path 
                                d={selectedItem?.path} 
                                stroke={getGradeColor(selectedItem?.cotation)} 
                                strokeWidth="5" 
                                fill="none" 
                             />
                          </Svg>
                          <Text style={{position:'absolute', bottom: 10, color:'white', opacity:0.5}}>
                              (Image de fond non chargée pour rapidité)
                          </Text>
                      </View>
                  </View>

                  <View style={styles.infoRow}>
                      <Text>Cotation proposée : </Text>
                      <Text style={{fontWeight:'bold', fontSize:18}}>{selectedItem?.cotation}</Text>
                  </View>

                  <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#ff4444'}]} onPress={handleReject}>
                          <Ionicons name="trash" size={20} color="#fff"/>
                          <Text style={styles.btnText}>Rejeter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#00C851'}]} onPress={handleApprove}>
                          <Ionicons name="checkmark" size={20} color="#fff"/>
                          <Text style={styles.btnText}>Valider</Text>
                      </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedItem(null)}>
                      <Text style={{color:'#666'}}>Fermer</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', justifyContent:'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    tabs: { flexDirection: 'row', backgroundColor: '#fff', padding: 10 },
    tabItem: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#007AFF' },
    tabText: { color: '#999' },
    tabTextActive: { color: '#007AFF', fontWeight: 'bold' },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    subText: { color: '#666', fontSize: 12, marginTop: 5 },
    dateText: { color: '#999', fontSize: 10, marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
    
    // Modal
    modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    previewContainer: { width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: 20, backgroundColor: '#000' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    actionRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    actionBtn: { flex: 0.48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
    closeBtn: { marginTop: 20, padding: 10 }
});