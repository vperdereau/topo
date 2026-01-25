import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where } from 'firebase/firestore'; // Import des filtres
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ImageBackground, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Assure-toi que ces chemins sont corrects par rapport à ton dossier
import { COLORS, SIZES } from './constants/theme';
import { db } from './firebaseConfig';
//import MigrationButton from './MigrationButton';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        // REQUÊTE : On cherche la collection "sites"
        // FILTRE : On ne prend que ceux qui sont "published" (validés par admin)
        const q = query(collection(db, "sites"), where("status", "==", "published"));
        
        const querySnapshot = await getDocs(q);

        const data = querySnapshot.docs.map(doc => ({
           id: doc.id, 
           ...doc.data(),
           // Image de fallback stylée si pas d'image en base
           coverUrl: doc.data().imageUrl || 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=1000&auto=format&fit=crop'
        }))
        // Sécurité supplémentaire : on vire les docs sans nom (fantômes)
        .filter(item => item.nom && item.nom.trim() !== "");

        setSites(data);
      } catch (e) { 
        console.error("Erreur fetch sites:", e); 
      } finally { 
        setLoading(false); 
      }
    };

    fetchSites();
  }, []);

  const renderSite = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      // NAVIGATION : On va vers le niveau 2 (Détail du Site / Liste des secteurs)
      onPress={() => navigation.navigate('SiteDetails', { siteId: item.id, siteName: item.nom })}
      style={styles.cardContainer}
    >
      <ImageBackground 
        source={{ uri: item.coverUrl }} 
        style={styles.cardImage} 
        imageStyle={{ borderRadius: SIZES.radius }}
      >
        {/* Dégradé pour lisibilité du texte */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.nom}</Text>
            
            <View style={styles.cardInfoRow}>
                <View style={styles.infoBadge}>
                    <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.cardSubtitle}> {item.localisation || "France"}</Text>
                </View>

                <View style={styles.infoBadge}>
                    <Ionicons name="layers-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.cardSubtitle}> {item.routesCount || "?"} voies</Text>
                </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>Explorateur</Text>
            <Text style={styles.headerSubtitle}>Découvrez les meilleurs spots</Text>
        </View>
        
        {/* Bouton vers la Carte Interactive */}
        <TouchableOpacity onPress={() => navigation.navigate('Map')} style={styles.iconBtn}>
            <Ionicons name="map-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* CONTENU */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={sites}
          keyExtractor={item => item.id}
          renderItem={renderSite}
          contentContainerStyle={{ padding: SIZES.padding, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{alignItems:'center', marginTop: 50}}>
                <Text style={{color: '#666'}}>Aucun site publié pour le moment.</Text>
                <Text style={{color: '#444', fontSize:12, marginTop:5}}>(Allez sur la carte pour en proposer un)</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{height: 20}} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  header: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 60, // Ajuster selon ton safe area
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 32, fontWeight: '800', color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  iconBtn: { 
    width: 44, height: 44, 
    backgroundColor: COLORS.card, 
    borderRadius: 22, 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333'
  },
  
  // Styles des Cartes
  cardContainer: {
    height: 240, // Hauteur de la carte
    width: '100%',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5,
  },
  cardImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  cardGradient: {
    height: '100%', width: '100%', justifyContent: 'flex-end', padding: 20, borderRadius: SIZES.radius
  },
  cardTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  
  infoBadge: { flexDirection: 'row', alignItems: 'center' },
  cardSubtitle: { fontSize: 14, color: '#ddd', fontWeight: '500', marginLeft: 4 }
});