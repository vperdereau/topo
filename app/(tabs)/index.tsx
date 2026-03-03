import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

// Activer les animations sur Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INITIAL_REGION = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [sites, setSites] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState(null);

  // 1. GÉOLOCALISATION (Une seule fois au démarrage)
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
              latitudeDelta: 2,
              longitudeDelta: 2,
          }, 1000);
      }
    })();
  }, []);

  // 2. CHARGEMENT DES SITES (A chaque fois qu'on affiche l'écran)
  useFocusEffect(
    useCallback(() => {
      const fetchSites = async () => {
        try {
            // On récupère les sites validés
            const querySnapshot = await getDocs(collection(db, "sites"));
            
            const sitesData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const loc = data.location || {}; 
                return {
                    id: doc.id,
                    ...data,
                    lat: parseFloat(loc.latitude || data.lat || 0),
                    lng: parseFloat(loc.longitude || data.lng || 0),
                    type: data.type || 'falaise',
                    imageUrl: data.imageUrl || null
                };
            }).filter(s => s.lat !== 0 && s.lng !== 0);

            setSites(sitesData);
        } catch (error) {
            console.error("Erreur chargement sites:", error);
        } finally {
            setLoading(false);
        }
      };

      fetchSites();
    }, [])
  );

  // --- ACTIONS ---

  const handleMarkerPress = (site) => {
    console.log("Site cliqué :", site);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSite(site);
    // On centre la carte sur le site
    mapRef.current?.animateToRegion({
        latitude: site.lat,
        longitude: site.lng,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
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
      
      {/* CARTE */}
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="hybrid"
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        showsMyLocationButton={false} 
        loadingEnabled={true}
        renderCluster={renderCluster}
        onPress={() => setSelectedSite(null)} // Ferme la fiche si on clique ailleurs
        animationEnabled={false} 
      >
        {sites.map((site) => {
            // Couleur : Jaune pour Bloc, Rouge pour Falaise
            const color = site.type === 'bloc' ? '#FFD700' : '#FF3B30';
            
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

      {/* BOUTON FLOTTANT : AJOUTER UN SITE */}
      <TouchableOpacity 
        style={styles.addSiteBtn}
        onPress={() => router.push('/add-site')}
      >
          <Ionicons name="add" size={30} color="#000" />
      </TouchableOpacity>

      {/* BOUTON RECENTRER */}
      <TouchableOpacity 
        style={[styles.recenterBtn, selectedSite && { bottom: 220 }]}
        onPress={() => {
            if(!location) return;
            mapRef.current.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.1, longitudeDelta: 0.1,
            }, 1000);
        }}
      >
          <Ionicons name="navigate" size={24} color="#000" />
      </TouchableOpacity>

      {/* MINI CARTE (BOTTOM SHEET) */}
      {selectedSite && (
          <View style={styles.bottomSheet}>
              <View style={styles.drawerHandle} />
              
              <View style={styles.sheetContentRow}>
                {/* Image ou Icône */}
                {selectedSite.imageUrl ? (
                     <Image 
                        source={{ uri: selectedSite.imageUrl }} 
                        style={{ width: 60, height: 60, borderRadius: 12, backgroundColor:'#333', marginRight: 15 }} 
                        resizeMode="cover"
                     />
                ) : (
                    <View style={[styles.typeIcon, { backgroundColor: selectedSite.type === 'bloc' ? '#FFD700' : '#FF3B30' }]}>
                        <Ionicons name={selectedSite.type === 'bloc' ? "cube" : "stats-chart"} size={24} color="#fff" />
                    </View>
                )}

                <View style={{flex: 1}}>
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
                  <Ionicons name="arrow-forward" size={20} color="#000" style={{marginLeft: 10}}/>
              </TouchableOpacity>
          </View>
      )}

      {loading && (
          <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#FFD700" /></View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { width: '100%', height: '100%' },
  
  clusterContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  clusterText: { color: '#000', fontWeight: 'bold' },
  
  markerContainer: { alignItems: 'center', justifyContent: 'center' },

  // Bouton Ajouter
  addSiteBtn: {
      position: 'absolute', top: 60, right: 20,
      backgroundColor: '#FFD700', width: 50, height: 50, borderRadius: 25,
      justifyContent: 'center', alignItems: 'center',
      elevation: 5, zIndex: 10
  },

  // Bouton Recentrer
  recenterBtn: {
      position: 'absolute', bottom: 30, right: 20,
      backgroundColor: '#fff', padding: 12, borderRadius: 30,
      elevation: 5, zIndex: 10,
  },

  // Bottom Sheet
  bottomSheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: '#1a1a1a', 
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: 40,
      elevation: 20, zIndex: 20
  },
  drawerHandle: {
      width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 15
  },
  sheetContentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  typeIcon: { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sheetSubtitle: { color: '#bbb', fontSize: 14, marginTop: 2 },
  
  actionBtn: {
      backgroundColor: '#FFD700',
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      paddingVertical: 14, borderRadius: 12,
  },
  actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  loadingOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 50
  }
});