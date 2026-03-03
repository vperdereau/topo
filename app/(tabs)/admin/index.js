import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../firebaseConfig';

export default function AdminDashboard() {
  // 3 Onglets : 'routes' | 'sites' | 'sectors'
  const [activeTab, setActiveTab] = useState('routes');
  
  const [pendingRoutes, setPendingRoutes] = useState([]);
  const [pendingSites, setPendingSites] = useState([]);
  const [pendingSectors, setPendingSectors] = useState([]);
  const [pendingTopos, setPendingTopos] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Chargement des données à chaque fois qu'on vient sur l'écran
  useFocusEffect(
    useCallback(() => {
      fetchAllPending();
    }, [])
  );

  const fetchAllPending = async () => {
    setLoading(true);
    try {
        // 1. Voies
        const routesSnap = await getDocs(collection(db, "pending_routes"));
        setPendingRoutes(routesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 2. Sites
        const sitesSnap = await getDocs(collection(db, "pending_sites"));
        setPendingSites(sitesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 3. Secteurs
        const sectorsSnap = await getDocs(collection(db, "pending_sectors"));
        setPendingSectors(sectorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 4. topos
        const toposSnap = await getDocs(collection(db, "pending_topos"));
      setPendingTopos(toposSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- LOGIQUE VALIDATION VOIES ---
  const validateRoute = async (item) => {
    try {
        if (!item.siteId || !item.sectorId) return Alert.alert("Erreur", "Données manquantes (Site/Secteur)");
        
        // Chemin : sites > siteId > secteurs > sectorId > topos > topoId
        const topoRef = doc(db, "sites", item.siteId, "secteurs", item.sectorId, "topos", item.topoId);
        const topoSnap = await getDoc(topoRef);

        if (!topoSnap.exists()) return Alert.alert("Erreur", "Le topo parent n'existe plus");

        const currentRoutes = topoSnap.data().routes || [];
        const newRoute = {
            id: Date.now().toString(),
            nom: item.nom,
            cotation: item.cotation,
            path: item.path,
            height: item.height || null,
            quickdraws: item.quickdraws || null,
            addedBy: 'user'
        };

        await updateDoc(topoRef, { routes: [...currentRoutes, newRoute] });
        await deleteDoc(doc(db, "pending_routes", item.id));
        fetchAllPending();
        Alert.alert("Succès", "Voie validée !");
    } catch (e) { Alert.alert("Erreur", e.message); }
  };

  // --- LOGIQUE VALIDATION SITES ---
  const validateSite = async (item) => {
      try {
          console.log("Validation site avec image :", item.imageUrl); // Debug

          await addDoc(collection(db, "sites"), {
              nom: item.nom,
              type: item.type,
              // 👇 C'EST ICI LA CORRECTION IMPORTANTE 👇
              imageUrl: item.imageUrl || null, 
              // 👆 On s'assure de récupérer l'URL du pending_site
              
              location: item.location,
              lat: item.lat,
              lng: item.lng,
              createdAt: item.createdAt || serverTimestamp(),
              status: 'published'
          });
          
          await deleteDoc(doc(db, "pending_sites", item.id));
          fetchAllPending();
          Alert.alert("Succès", "Site publié avec son image !");
      } catch (e) { Alert.alert("Erreur", e.message); }
  };

// --- LOGIQUE VALIDATION SECTEURS ---
  const validateSector = async (item) => {
      try {
          await addDoc(collection(db, "sites", item.siteId, "secteurs"), {
              nom: item.nom,
              siteId: item.siteId,
              // 👇 CORRECTION ICI AUSSI 👇
              imageUrl: item.imageUrl || null,
              
              createdAt: serverTimestamp()
          });
          
          await deleteDoc(doc(db, "pending_sectors", item.id));
          fetchAllPending();
          Alert.alert("Succès", "Secteur validé avec image !");
      } catch (e) { Alert.alert("Erreur", e.message); }
  };
  const validateTopo = async (item) => {
      try {
          // On ajoute le topo dans : sites/{siteId}/secteurs/{sectorId}/topos
          await addDoc(collection(db, "sites", item.siteId, "secteurs", item.sectorId, "topos"), {
              imageUrl: item.imageUrl,
              imageWidth: item.imageWidth,
              imageHeight: item.imageHeight,
              routes: [],
              nom: "Topo User", // Tu peux demander un nom si tu veux
              addedBy: 'user',
              createdAt: serverTimestamp()
          });
          
          await deleteDoc(doc(db, "pending_topos", item.id));
          fetchAllPending();
          Alert.alert("Succès", "Topo validé !");
      } catch (e) { Alert.alert("Erreur", e.message); }
  };

  // --- LOGIQUE REFUS (Commun) ---
  const rejectItem = async (collectionName, id) => {
      try {
          await deleteDoc(doc(db, collectionName, id));
          fetchAllPending();
      } catch (e) { Alert.alert("Erreur", e.message); }
  };

  // --- RENDER ITEM ---
  const renderItem = ({ item }) => (
    <View style={styles.card}>
        <View style={{flex:1}}>
            <Text style={styles.title}>{item.nom}</Text>
            
            {/* Infos spécifiques selon le type */}
            {activeTab === 'routes' && (
                <Text style={styles.sub}>Cotation: {item.cotation} • {item.height ? item.height+'m' : ''}</Text>
            )}
            {activeTab === 'sites' && (
                <Text style={styles.sub}>Type: {item.type} • Lat: {item.lat?.toFixed(2)}</Text>
            )}
            {activeTab === 'sectors' && (
                <Text style={styles.sub}>Site parent: {item.siteName}</Text>
            )}
            {activeTab === 'topos' && (
      <View>
          <Text style={styles.sub}>Secteur: {item.sectorName}</Text>
          <Image source={{uri: item.imageUrl}} style={{width: 50, height: 50, borderRadius: 5, marginTop: 5}} />
      </View>
  )}
        </View>

        <View style={{flexDirection:'row', gap: 10}}>
            <TouchableOpacity onPress={() => {
                if(activeTab === 'routes') rejectItem('pending_routes', item.id);
                if(activeTab === 'sites') rejectItem('pending_sites', item.id);
                if(activeTab === 'sectors') rejectItem('pending_sectors', item.id);
                if(activeTab === 'topos') rejectItem('pending_topos', item.id);
            }} style={styles.rejectBtn}>
                <Ionicons name="trash" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
                if(activeTab === 'routes') validateRoute(item);
                if(activeTab === 'sites') validateSite(item);
                if(activeTab === 'sectors') validateSector(item);
                 if(activeTab === 'topos') validateTopo(item);
            }} style={styles.validateBtn}>
                <Ionicons name="checkmark" size={20} color="#000" />
            </TouchableOpacity>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Administration</Text>
      
      {/* TABS */}
      <View style={styles.tabsContainer}>
          <TouchableOpacity onPress={() => setActiveTab('routes')} style={[styles.tab, activeTab === 'routes' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'routes' && {color:'#000'}]}>Voies ({pendingRoutes.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('sites')} style={[styles.tab, activeTab === 'sites' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'sites' && {color:'#000'}]}>Sites ({pendingSites.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('sectors')} style={[styles.tab, activeTab === 'sectors' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'sectors' && {color:'#000'}]}>Secteurs ({pendingSectors.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('topos')} style={[styles.tab, activeTab === 'topos' && styles.activeTab]}>
      <Text style={[styles.tabText, activeTab === 'topos' && {color:'#000'}]}>Topos ({pendingTopos.length})</Text>
  </TouchableOpacity>
      </View>

      {/* LISTE */}
      {loading ? <ActivityIndicator color="#FFD700" style={{marginTop:20}}/> : (
          <FlatList 
            data={
                activeTab === 'routes' ? pendingRoutes : 
                activeTab === 'sites' ? pendingSites : 
                activeTab === 'sectors' ? pendingSectors : pendingTopos // <---
            }
            keyExtractor={i => i.id}
            renderItem={renderItem}
            contentContainerStyle={{paddingBottom:50}}
            ListEmptyComponent={<Text style={{color:'#666', textAlign:'center', marginTop:20}}>Aucune demande en attente.</Text>}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 50 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  
  tabsContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#222', borderRadius: 10, padding: 5 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#FFD700' },
  tabText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  card: { 
      backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, marginBottom: 10, 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderWidth: 1, borderColor: '#333'
  },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sub: { color: '#aaa', fontSize: 12, marginTop: 4 },

  validateBtn: { backgroundColor: '#FFD700', padding: 10, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#FF3B30', padding: 10, borderRadius: 8 }
});