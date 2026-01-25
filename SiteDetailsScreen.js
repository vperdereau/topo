// SiteDetailsScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from './constants/theme';
import { db } from './firebaseConfig';

export default function SiteDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { siteId, siteName } = route.params; // On récupère l'ID du site (ex: Faron)

  const [sectors, setSectors] = useState([]);

  useEffect(() => {
    const fetchSectors = async () => {
      // On va chercher dans la sous-collection "secteurs" du site choisi
      const q = collection(db, "sites", siteId, "secteurs");
      const snap = await getDocs(q);
      setSectors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchSectors();
  }, [siteId]);

  const renderSectorItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.itemContainer}
        // C'est ICI qu'on part vers le TopoScreen (Niveau 3)
        // Note : TopoScreen devra être adapté pour lire le chemin complet
        onPress={() => navigation.navigate('Topo', { 
            siteId: siteId,     // On passe l'ID du parent
            cragId: item.id,    // L'ID du secteur
            cragName: item.nom 
        })}
    >
        <View style={styles.iconBox}>
            <Ionicons name="map" size={24} color={COLORS.primary} />
        </View>
        <View style={{flex:1}}>
            <Text style={styles.itemTitle}>{item.nom}</Text>
            <Text style={styles.itemSub}>{item.routesCount || "?"} voies</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigation.goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{siteName}</Text>
      </View>

      <Text style={styles.sectionTitle}>Secteurs disponibles</Text>

      <FlatList 
        data={sectors}
        renderItem={renderSectorItem}
        keyExtractor={i => i.id}
        contentContainerStyle={{padding: 20}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  sectionTitle: { fontSize: 18, color: COLORS.textSecondary, marginLeft: 20, marginBottom: 10 },
  
  itemContainer: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
      padding: 15, borderRadius: 12, marginBottom: 10
  },
  iconBox: {
      width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 215, 0, 0.1)',
      justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  itemTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  itemSub: { color: COLORS.textSecondary, fontSize: 12 }
});