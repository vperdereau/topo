// SiteDetailsScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from './constants/theme';
import { db } from './firebaseConfig';

// --- SOUS-COMPOSANT : BULLES DES GRIMPEURS ---
const RecentClimbers = ({ siteId }) => {
  const [climbers, setClimbers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClimbers = async () => {
      try {
        // On suppose une collection 'ascents' contenant { siteId, userId, photoURL, timestamp }
        // Si tu n'as pas encore cette collection, cela ne plantera pas (tableau vide)
        const q = query(
          collection(db, "ascents"),
          where("siteId", "==", siteId),
          limit(10) // On en récupère un peu plus pour filtrer les doublons
        );

        const snap = await getDocs(q);
        
        const uniqueUsers = {};
        snap.forEach(doc => {
            const data = doc.data();
            // On dédoublonne par userId pour ne pas afficher 2 fois la même tête
            if (data.userId && !uniqueUsers[data.userId]) {
                uniqueUsers[data.userId] = data.photoURL;
            }
        });

        // On garde max 5 grimpeurs pour l'affichage
        setClimbers(Object.values(uniqueUsers).slice(0, 5));
      } catch (error) {
        console.log("Erreur chargement grimpeurs:", error);
      } finally {
        setLoading(false);
      }
    };

    if (siteId) fetchClimbers();
  }, [siteId]);

  if (loading) return <ActivityIndicator size="small" color={COLORS.primary} style={{marginVertical: 10}}/>;
  if (climbers.length === 0) return null;

  return (
    <View style={styles.climbersContainer}>
      <Text style={styles.climbersLabel}>Grimpeurs récents sur le site</Text>
      <View style={styles.climbersRow}>
        {climbers.map((url, index) => (
          <Image 
            key={index}
            source={{ uri: url || "https://via.placeholder.com/150" }} 
            style={[styles.climberBubble, { marginLeft: index === 0 ? 0 : -12 }]} 
          />
        ))}
        {climbers.length >= 5 && (
            <View style={[styles.climberBubble, styles.moreBubble, { marginLeft: -12 }]}>
                <Text style={styles.moreText}>+</Text>
            </View>
        )}
      </View>
    </View>
  );
};

// --- ECRAN PRINCIPAL ---
export default function SiteDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { siteId, siteName } = route.params;

  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const q = collection(db, "sites", siteId, "secteurs");
        const snap = await getDocs(q);
        setSectors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSectors();
  }, [siteId]);

  // Rendu d'un secteur (Item de la liste)
  const renderSectorItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.itemContainer}
        onPress={() => navigation.navigate('Topo', { 
            siteId: siteId,
            cragId: item.id,
            cragName: item.nom 
        })}
    >
        <View style={styles.iconBox}>
            <Ionicons name="map" size={24} color={COLORS.primary} />
        </View>
        <View style={{flex:1}}>
            <Text style={styles.itemTitle}>{item.nom}</Text>
            <Text style={styles.itemSub}>{item.routesCount ? `${item.routesCount} voies` : "Non répertorié"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER FIXE */}
      <View style={styles.header}>
        <TouchableOpacity onPress={navigation.goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{siteName}</Text>
      </View>

      {/* LISTE DES SECTEURS (Avec le Header Social intégré dedans) */}
      <FlatList 
        data={sectors}
        renderItem={renderSectorItem}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
        
        // C'est ici qu'on insère les bulles pour qu'elles scrollent avec la page
        ListHeaderComponent={
            <View>
                {/* Section Sociale */}
                <RecentClimbers siteId={siteId} />
                
                {/* Titre de la section secteurs */}
                <Text style={styles.sectionTitle}>Secteurs disponibles</Text>
            </View>
        }
        
        ListEmptyComponent={
            !loading && <Text style={{color:'#666', textAlign:'center', marginTop: 20}}>Aucun secteur trouvé.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212' },
  backBtn: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  
  // Section Titles
  sectionTitle: { fontSize: 18, color: COLORS.textSecondary, marginBottom: 15, marginTop: 10, fontWeight:'600' },
  
  // Item Secteur
  itemContainer: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
      padding: 15, borderRadius: 12, marginBottom: 10,
      borderWidth: 1, borderColor: '#333'
  },
  iconBox: {
      width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 215, 0, 0.1)',
      justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  itemTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  itemSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  // Styles Social / Bulles
  climbersContainer: { marginBottom: 25 },
  climbersLabel: { color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  climbersRow: { flexDirection: 'row', alignItems: 'center' },
  climberBubble: { 
      width: 40, height: 40, borderRadius: 20, 
      borderWidth: 2, borderColor: COLORS.background 
  },
  moreBubble: { 
      backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' 
  },
  moreText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});