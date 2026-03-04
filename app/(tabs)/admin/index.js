import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../firebaseConfig';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('routes'); // 'routes', 'sites', 'sectors', 'topos', 'edits'
  
  const [pendingRoutes, setPendingRoutes] = useState([]);
  const [pendingSites, setPendingSites] = useState([]);
  const [pendingSectors, setPendingSectors] = useState([]);
  const [pendingTopos, setPendingTopos] = useState([]);
  const [pendingEdits, setPendingEdits] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchAllPending();
    }, [])
  );

  const fetchAllPending = async () => {
    setLoading(true);
    try {
        const routesSnap = await getDocs(collection(db, "pending_routes"));
        setPendingRoutes(routesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const sitesSnap = await getDocs(collection(db, "pending_sites"));
        setPendingSites(sitesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const sectorsSnap = await getDocs(collection(db, "pending_sectors"));
        setPendingSectors(sectorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const toposSnap = await getDocs(collection(db, "pending_topos"));
        setPendingTopos(toposSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // 5. EDITS (Nouveau)
        const editsSnap = await getDocs(collection(db, "pending_edits"));
        setPendingEdits(editsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- VALIDATION LOGICS ---
  
  const validateRoute = async (item) => {
    try {
        const topoRef = doc(db, "sites", item.siteId, "secteurs", item.sectorId, "topos", item.topoId);
        const topoSnap = await getDoc(topoRef);
        if (!topoSnap.exists()) return Alert.alert("Erreur", "Topo introuvable");
        const currentRoutes = topoSnap.data().routes || [];
        const newRoute = { id: Date.now().toString(), nom: item.nom, cotation: item.cotation, path: item.path };
        await updateDoc(topoRef, { routes: [...currentRoutes, newRoute] });
        await deleteDoc(doc(db, "pending_routes", item.id));
        fetchAllPending();
    } catch (e) { Alert.alert("Erreur", e.message); }
  };

  const validateSite = async (item) => {
      try {
          await addDoc(collection(db, "sites"), {
              nom: item.nom, type: item.type, imageUrl: item.imageUrl || null, location: item.location, lat: item.lat, lng: item.lng, createdAt: serverTimestamp(), status: 'published'
          });
          await deleteDoc(doc(db, "pending_sites", item.id));
          fetchAllPending();
      } catch (e) { Alert.alert("Erreur", e.message); }
  };

  const validateSector = async (item) => {
      try {
          await addDoc(collection(db, "sites", item.siteId, "secteurs"), {
              nom: item.nom, siteId: item.siteId, imageUrl: item.imageUrl || null, createdAt: serverTimestamp()
          });
          await deleteDoc(doc(db, "pending_sectors", item.id));
          fetchAllPending();
      } catch (e) { Alert.alert("Erreur", e.message); }
  };
  
  const validateTopo = async (item) => {
      try {
          await addDoc(collection(db, "sites", item.siteId, "secteurs", item.sectorId, "topos"), {
              imageUrl: item.imageUrl, imageWidth: item.imageWidth, imageHeight: item.imageHeight, routes: [], addedBy: 'user', createdAt: serverTimestamp()
          });
          await deleteDoc(doc(db, "pending_topos", item.id));
          fetchAllPending();
      } catch (e) { Alert.alert("Erreur", e.message); }
  };

  // --- NOUVEAU : Validation des MODIFS ---
  const validateEdit = async (item) => {
      try {
          if (item.type === 'photo_update') {
              // Si c'est un Site
              if (item.targetCollection === 'sites') {
                  const docRef = doc(db, "sites", item.targetId);
                  await updateDoc(docRef, { imageUrl: item.newImageUrl });
              }
              // Si c'est un Secteur (On suppose qu'on a reçu parentSiteId dans propose-edit)
              else if (item.parentSiteId) {
                  const docRef = doc(db, "sites", item.parentSiteId, "secteurs", item.targetId);
                  await updateDoc(docRef, { imageUrl: item.newImageUrl });
              }
          } 
          else if (item.type === 'approach_update') {
              // Mise à jour de l'approche
              const sectorRef = doc(db, "sites", item.parentSiteId, "secteurs", item.targetId);
              await updateDoc(sectorRef, { approachData: item.approachData });
          }

          await deleteDoc(doc(db, "pending_edits", item.id));
          fetchAllPending();
          Alert.alert("Succès", "Modification appliquée !");
      } catch (e) { Alert.alert("Erreur", e.message); }
  };

  const rejectItem = async (collectionName, id) => {
      try { await deleteDoc(doc(db, collectionName, id)); fetchAllPending(); } 
      catch (e) { Alert.alert("Erreur", e.message); }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
        <View style={{flex:1}}>
            <Text style={styles.title}>{item.nom || item.targetName}</Text>
            {activeTab === 'edits' && <Text style={styles.sub}>Type: {item.type}</Text>}
            {/* Aperçu image si dispo */}
            {(item.imageUrl || item.newImageUrl) && (
                <Image source={{uri: item.imageUrl || item.newImageUrl}} style={{width:50, height:50, marginTop:5, borderRadius:4}} />
            )}
        </View>

        <View style={{flexDirection:'row', gap: 10}}>
            <TouchableOpacity onPress={() => {
                if(activeTab === 'routes') rejectItem('pending_routes', item.id);
                if(activeTab === 'sites') rejectItem('pending_sites', item.id);
                if(activeTab === 'sectors') rejectItem('pending_sectors', item.id);
                if(activeTab === 'topos') rejectItem('pending_topos', item.id);
                if(activeTab === 'edits') rejectItem('pending_edits', item.id);
            }} style={styles.rejectBtn}><Ionicons name="trash" size={20} color="#fff" /></TouchableOpacity>

            <TouchableOpacity onPress={() => {
                if(activeTab === 'routes') validateRoute(item);
                if(activeTab === 'sites') validateSite(item);
                if(activeTab === 'sectors') validateSector(item);
                if(activeTab === 'topos') validateTopo(item);
                if(activeTab === 'edits') validateEdit(item);
            }} style={styles.validateBtn}><Ionicons name="checkmark" size={20} color="#000" /></TouchableOpacity>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Administration</Text>
      
      {/* ScrollView horizontal pour les onglets */}
      <View style={{height: 50, marginBottom: 10}}>
        <FlatList 
            horizontal showsHorizontalScrollIndicator={false}
            data={['routes', 'sites', 'sectors', 'topos', 'edits']}
            keyExtractor={i => i}
            renderItem={({item}) => (
                <TouchableOpacity onPress={() => setActiveTab(item)} style={[styles.tab, activeTab === item && styles.activeTab]}>
                    <Text style={[styles.tabText, activeTab === item && {color:'#000'}]}>
                        {item.toUpperCase()} 
                    </Text>
                </TouchableOpacity>
            )}
        />
      </View>

      <FlatList 
        data={
            activeTab === 'routes' ? pendingRoutes : 
            activeTab === 'sites' ? pendingSites : 
            activeTab === 'sectors' ? pendingSectors : 
            activeTab === 'topos' ? pendingTopos : pendingEdits
        }
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{paddingBottom:50}}
        ListEmptyComponent={<Text style={{color:'#666', textAlign:'center', marginTop:20}}>Rien en attente.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 50 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  tab: { paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center', borderRadius: 20, backgroundColor: '#222', marginRight: 10 },
  activeTab: { backgroundColor: '#FFD700' },
  tabText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  card: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#333' },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sub: { color: '#aaa', fontSize: 12, marginTop: 4 },
  validateBtn: { backgroundColor: '#FFD700', padding: 10, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#FF3B30', padding: 10, borderRadius: 8 }
});