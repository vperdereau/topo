import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'; // Utilisation de expo-router
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig'; // Vérifie le chemin (../ car on est dans app/)

// Tu peux remettre ton import de couleurs si tu l'as, sinon voici des valeurs par défaut
const COLORS = { primary: '#FFD700', background: '#000', card: '#1a1a1a', text: '#fff', textSecondary: '#aaa' };

// --- SOUS-COMPOSANT : BULLES DES GRIMPEURS ---
const RecentClimbers = ({ siteId }) => {
  const [climbers, setClimbers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClimbers = async () => {
      try {
        const q = query(collection(db, "ascents"), where("siteId", "==", siteId), limit(10));
        const snap = await getDocs(q);
        const uniqueUsers = {};
        snap.forEach(doc => {
            const data = doc.data();
            if (data.userId && !uniqueUsers[data.userId]) uniqueUsers[data.userId] = data.photoURL;
        });
        setClimbers(Object.values(uniqueUsers).slice(0, 5));
      } catch (error) { console.log("Erreur grimpeurs (optionnel)", error); } 
      finally { setLoading(false); }
    };
    if (siteId) fetchClimbers();
  }, [siteId]);

  if (climbers.length === 0) return null;

  return (
    <View style={styles.climbersContainer}>
      <Text style={styles.climbersLabel}>Grimpeurs récents</Text>
      <View style={styles.climbersRow}>
        {climbers.map((url, index) => (
          <Image key={index} source={{ uri: url || "https://via.placeholder.com/40" }} style={[styles.climberBubble, { marginLeft: index === 0 ? 0 : -12 }]} />
        ))}
      </View>
    </View>
  );
};

// --- ECRAN PRINCIPAL ---
export default function SiteDetailsScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  
  // Récupération des paramètres via Expo Router
  const params = useLocalSearchParams();
  const { siteId, siteName } = params;

  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  // LOGIQUE DE CHARGEMENT
  useEffect(() => {
    const fetchSectorsWithCounts = async () => {
      if (!siteId) return;
      setLoading(true);
      try {
        // 1. On récupère les secteurs du site
        const q = collection(db, "sites", siteId, "secteurs");
        const sectorSnap = await getDocs(q);
        
        // 2. On compte les voies
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
      } catch (e) { console.error("Erreur chargement secteurs:", e); } 
      finally { setLoading(false); }
    };

    fetchSectorsWithCounts();
  }, [siteId]);

  const renderSectorItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.itemContainer}
        onPress={() => {
            // NAVIGATION VERS LE TOPO
            // On passe siteId (parent) ET sectorId (enfant)
            router.push({
                pathname: '/topo',
                params: { 
                    siteId: siteId,
                    sectorId: item.id, // ID du secteur cliqué
                    cragName: item.nom // Nom du secteur pour le titre
                }
            });
        }}
    >
        <View style={styles.iconBox}><Ionicons name="map" size={24} color={COLORS.primary} /></View>
        <View style={{flex:1}}>
            <Text style={styles.itemTitle}>{item.nom}</Text>
            <Text style={styles.itemSub}>{item.realRoutesCount !== undefined ? item.realRoutesCount : "?"} voies</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{siteName}</Text>
      </View>

      {/* LISTE */}
      {loading ? (
        <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList 
            data={sectors}
            renderItem={renderSectorItem}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
            ListHeaderComponent={
    <View>
        <RecentClimbers siteId={siteId} />
        
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 15, marginTop: 10}}>
            <Text style={styles.sectionTitle}>Secteurs</Text>
            
            {/* BOUTON AJOUTER SECTEUR */}
            <TouchableOpacity 
                style={{flexDirection:'row', alignItems:'center', backgroundColor:'#333', padding: 8, borderRadius: 8}}
                onPress={() => router.push({
                    pathname: '/add-sector',
                    params: { siteId: siteId, siteName: siteName }
                })}
            >
                <Ionicons name="add-circle" size={18} color="#FFD700" style={{marginRight:5}} />
                <Text style={{color:'#fff', fontWeight:'bold', fontSize:12}}>Ajouter</Text>
            </TouchableOpacity>
        </View>
    </View>
  }
            ListEmptyComponent={
                <Text style={{color:'#666', textAlign:'center', marginTop: 20}}>Aucun secteur trouvé pour ce site.</Text>
            }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212' },
  backBtn: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  sectionTitle: { fontSize: 18, color: COLORS.textSecondary, marginBottom: 15, marginTop: 10, fontWeight:'600' },
  itemContainer: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
      padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333'
  },
  iconBox: {
      width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 215, 0, 0.1)',
      justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  itemTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  itemSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  climbersContainer: { marginBottom: 25 },
  climbersLabel: { color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  climbersRow: { flexDirection: 'row', alignItems: 'center' },
  climberBubble: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: COLORS.background },
});