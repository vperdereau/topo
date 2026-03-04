import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'; // <--- AJOUT getDoc/doc
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList, Image,
    ImageBackground,
    StatusBar,
    StyleSheet, Text,
    TouchableOpacity, View
} from 'react-native';
import { db } from '../firebaseConfig';

const SCREEN_WIDTH = Dimensions.get('window').width;

// --- SOUS-COMPOSANT : GRIMPEURS (Inchangé) ---
const RecentClimbers = ({ siteId }) => {
    // ... (Tu peux garder ton code existant ici ou le simplifier comme ci-dessous pour l'exemple)
    return null; // Je le masque pour alléger le code ici, mais tu peux remettre ton composant
};

export default function SiteDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { siteId, siteName } = params;

  const [sectors, setSectors] = useState([]);
  const [siteData, setSiteData] = useState(null); // <--- Pour stocker l'image du site
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!siteId) return;
      setLoading(true);
      try {
        // 1. On récupère les infos du SITE (pour l'image)
        const siteRef = doc(db, "sites", siteId);
        const siteSnap = await getDoc(siteRef);
        if (siteSnap.exists()) {
            setSiteData(siteSnap.data());
        }

        // 2. On récupère les SECTEURS
        const q = collection(db, "sites", siteId, "secteurs");
        const sectorSnap = await getDocs(q);
        
        // 3. On compte les voies (Promise.all)
        const sectorsWithCount = await Promise.all(sectorSnap.docs.map(async (doc) => {
            const sectorData = doc.data();
            const toposQ = collection(db, "sites", siteId, "secteurs", doc.id, "topos");
            const toposSnap = await getDocs(toposQ);
            
            let realCount = 0;
            toposSnap.forEach(t => {
                const routes = t.data().routes;
                if (routes && Array.isArray(routes)) realCount += routes.length;
            });

            return { id: doc.id, ...sectorData, realRoutesCount: realCount };
        }));

        setSectors(sectorsWithCount);
      } catch (e) { console.error("Erreur chargement:", e); } 
      finally { setLoading(false); }
    };

    fetchData();
  }, [siteId]);

  const renderSectorItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.itemContainer}
        onPress={() => {
            router.push({
                pathname: '/topo',
                params: { 
                    siteId: siteId,
                    sectorId: item.id,
                    cragName: item.nom 
                }
            });
        }}
    >
        {/* Miniature du secteur si elle existe, sinon icône */}
        <View style={styles.iconBox}>
            {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={{width:'100%', height:'100%'}} />
            ) : (
                <Ionicons name="map" size={24} color="#FFD700" />
            )}
        </View>
        
        <View style={{flex:1}}>
            <Text style={styles.itemTitle}>{item.nom}</Text>
            <Text style={styles.itemSub}>{item.realRoutesCount !== undefined ? item.realRoutesCount : "?"} voies</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

// --- HEADER DYNAMIQUE ---
  const renderHeader = () => {
      // CAS 1 : Si on a une image (Bannière)
      if (siteData?.imageUrl) {
          return (
              <ImageBackground source={{ uri: siteData.imageUrl }} style={styles.headerImage}>
                  <View style={styles.headerOverlay}>
                      {/* Ligne du haut : Retour + Edit */}
                      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
                              <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>

                          {/* BOUTON CRAYON (Pour modifier l'image) */}
                          <TouchableOpacity 
                            style={styles.editPhotoBtn}
                            onPress={() => router.push({
                                pathname: '/propose-edit',
                                params: { 
                                    collectionName: 'sites', 
                                    docId: siteId, 
                                    currentName: siteData.nom 
                                }
                            })}
                          >
                              <Ionicons name="pencil" size={20} color="#000" />
                          </TouchableOpacity>
                      </View>
                      
                      {/* Titre et Badge en bas */}
                      <View style={styles.headerTextContainer}>
                          <Text style={styles.bigTitle}>{siteData.nom}</Text>
                          <View style={[styles.badge, {backgroundColor: siteData.type === 'bloc' ? '#FFD700' : '#FF3B30'}]}>
                              <Text style={styles.badgeText}>{siteData.type === 'bloc' ? "BLOC" : "FALAISE"}</Text>
                          </View>
                      </View>
                  </View>
              </ImageBackground>
          );
      }

      // CAS 2 : Pas d'image (Simple Header)
      return (
        <View style={styles.simpleHeader}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{siteName}</Text>
            </View>

            {/* Bouton pour AJOUTER une photo si y'en a pas */}
            <TouchableOpacity 
                onPress={() => router.push({
                    pathname: '/propose-edit',
                    params: { collectionName: 'sites', docId: siteId, currentName: siteName }
                })}
            >
                <Ionicons name="camera-outline" size={24} color="#FFD700" />
            </TouchableOpacity>
        </View>
      );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. HEADER (Image ou Simple) */}
      {renderHeader()}

      {/* 2. CONTENU */}
      {loading ? (
        <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color="#FFD700" /></View>
      ) : (
        <FlatList 
            data={sectors}
            renderItem={renderSectorItem}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
            ListHeaderComponent={
                <View>
                    {/* Infos sup du site (optionnel) */}
                    <View style={{flexDirection:'row', marginBottom: 20}}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{sectors.length}</Text>
                            <Text style={styles.statLabel}>Secteurs</Text>
                        </View>
                        <View style={[styles.statBox, {marginLeft:10}]}>
                            {/* Calcul total des voies */}
                            <Text style={styles.statNumber}>
                                {sectors.reduce((acc, curr) => acc + (curr.realRoutesCount || 0), 0)}
                            </Text>
                            <Text style={styles.statLabel}>Voies</Text>
                        </View>
                    </View>

                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 15}}>
                        <Text style={styles.sectionTitle}>Secteurs</Text>
                        <TouchableOpacity 
                            style={styles.addSectorBtn}
                            onPress={() => router.push({
                                pathname: '/add-sector',
                                params: { siteId: siteId, siteName: siteName }
                            })}
                        >
                            <Ionicons name="add" size={16} color="#000" />
                            <Text style={{color:'#000', fontWeight:'bold', fontSize:12, marginLeft:4}}>Ajouter</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            }
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 30}}>
                    <Ionicons name="map-outline" size={50} color="#333" />
                    <Text style={{color:'#666', marginTop: 10}}>Aucun secteur pour le moment.</Text>
                    <TouchableOpacity 
                        style={[styles.addSectorBtn, {marginTop: 20, paddingHorizontal: 20, paddingVertical: 12}]}
                        onPress={() => router.push({ pathname: '/add-sector', params: { siteId, siteName } })}
                    >
                        <Text style={{color:'#000', fontWeight:'bold'}}>Créer le premier secteur</Text>
                    </TouchableOpacity>
                </View>
            }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  // Header avec Image
  headerImage: { width: '100%', height: 250 },
  headerOverlay: { 
      flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', 
      justifyContent: 'space-between', padding: 20, paddingTop: 50 
  },
  backBtnCircle: { 
      width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', 
      justifyContent: 'center', alignItems: 'center' 
  },
  headerTextContainer: { marginBottom: 10 },
  bigTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', textShadowColor:'rgba(0,0,0,0.7)', textShadowRadius: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginTop: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // Header Simple (Fallback)
  simpleHeader: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

  // List Items
  sectionTitle: { fontSize: 18, color: '#aaa', fontWeight:'600' },
  itemContainer: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a',
      padding: 10, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333'
  },
  iconBox: {
      width: 60, height: 60, borderRadius: 8, backgroundColor: '#222',
      justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow:'hidden'
  },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemSub: { color: '#888', fontSize: 12, marginTop: 2 },

  // Stats
  statBox: { backgroundColor: '#222', padding: 15, borderRadius: 10, flex: 1, alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 12, textTransform: 'uppercase' },

  // Buttons
  addSectorBtn: { 
      flexDirection:'row', alignItems:'center', backgroundColor:'#FFD700', 
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 
  }
});