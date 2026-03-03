import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router'; // <--- Utilise expo-router
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { db } from '../../firebaseConfig';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INITIAL_REGION = {
  latitude: 46.603354, longitude: 1.888334, latitudeDelta: 6, longitudeDelta: 6,
};

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [sites, setSites] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState(null);

  // 1. Géoloc
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation.coords);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
            latitudeDelta: 2, longitudeDelta: 2,
        }, 1000);
      }
    })();
  }, []);

  // 2. Chargement des sites (On utilise useFocusEffect si tu veux que ça recharge au retour, mais useEffect suffit pour l'instant)
  useEffect(() => {
    const fetchSites = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "sites"));
            const sitesData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const loc = data.location || {}; 
                return {
                    id: doc.id,
                    ...data,
                    lat: parseFloat(loc.latitude || data.lat || 0),
                    lng: parseFloat(loc.longitude || data.lng || 0),
                    type: data.type || 'falaise' // Par défaut falaise
                };
            }).filter(s => s.lat !== 0 && s.lng !== 0);
            setSites(sitesData);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchSites();
  }, []); // Tu pourras ajouter un "refresh" listener plus tard

  const handleMarkerPress = (site) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSite(site);
    mapRef.current?.animateToRegion({
        latitude: site.lat, longitude: site.lng, latitudeDelta: 0.5, longitudeDelta: 0.5,
    }, 500);
  };

  const navigateToDetails = () => {
    if (!selectedSite) return;
    router.push({
        pathname: '/site-details',
        params: { siteId: selectedSite.id, siteName: selectedSite.name || selectedSite.nom }
    });
  };

  const renderCluster = (cluster, onPress) => {
    const { pointCount, coordinate, id } = cluster;
    if (!coordinate) return null;
    const size = 40 + (pointCount > 50 ? 20 : pointCount > 10 ? 10 : 0);
    return (
      <Marker coordinate={coordinate} onPress={onPress} key={`cluster-${id}`} zIndex={100}>
        <View style={[styles.clusterContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.clusterText}>{pointCount}</Text>
        </View>
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="hybrid"
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        loadingEnabled={true}
        renderCluster={renderCluster}
        onPress={() => setSelectedSite(null)}
      >
        {sites.map((site) => {
            // --- COULEUR DYNAMIQUE ---
            const color = site.type === 'bloc' ? '#FFD700' : '#FF3B30'; // Jaune vs Rouge
            
            return (
                <Marker
                    key={site.id}
                    coordinate={{ latitude: site.lat, longitude: site.lng }}
                    onPress={() => handleMarkerPress(site)}
                    zIndex={1}
                >
                    <View style={styles.markerContainer}>
                        <Ionicons 
                            name="location" 
                            size={selectedSite?.id === site.id ? 45 : 35} 
                            color={selectedSite?.id === site.id ? "#fff" : color} 
                        />
                    </View>
                </Marker>
            );
        })}
      </ClusteredMapView>

      {/* BOUTON FLOTTANT: AJOUTER UN SITE */}
      <TouchableOpacity 
        style={styles.addSiteBtn}
        onPress={() => router.push('/add-site')}
      >
          <Ionicons name="add" size={30} color="#000" />
      </TouchableOpacity>

      {/* MINI CARTE (BOTTOM SHEET) */}
      {selectedSite && (
          <View style={styles.bottomSheet}>
              <View style={styles.drawerHandle} />
              <View style={styles.sheetContentRow}>
                <View style={[styles.typeIcon, { backgroundColor: selectedSite.type === 'bloc' ? '#FFD700' : '#FF3B30' }]}>
                    <Ionicons name={selectedSite.type === 'bloc' ? "cube" : "stats-chart"} size={24} color="#fff" />
                </View>
                <View style={{flex: 1, marginLeft: 15}}>
                    <Text style={styles.sheetTitle}>{selectedSite.name || selectedSite.nom}</Text>
                    <Text style={styles.sheetSubtitle}>
                        {selectedSite.type === 'bloc' ? "Bloc" : "Falaise"}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedSite(null)}>
                    <Ionicons name="close-circle" size={26} color="#ccc" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={navigateToDetails}>
                  <Text style={styles.actionBtnText}>Voir le site</Text>
              </TouchableOpacity>
          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { width: '100%', height: '100%' },
  clusterContainer: { backgroundColor: 'rgba(255, 215, 0, 0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  clusterText: { color: '#000', fontWeight: 'bold' },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  
  // Bouton Ajouter Site
  addSiteBtn: {
      position: 'absolute', top: 50, right: 20,
      backgroundColor: '#FFD700', width: 50, height: 50, borderRadius: 25,
      justifyContent: 'center', alignItems: 'center',
      elevation: 5, zIndex: 10
  },

  bottomSheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: 40, elevation: 20
  },
  drawerHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  sheetContentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  typeIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sheetSubtitle: { color: '#bbb', fontSize: 14 },
  actionBtn: { backgroundColor: '#FFD700', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});