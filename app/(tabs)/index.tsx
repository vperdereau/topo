import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
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

const { width, height } = Dimensions.get('window');

const INITIAL_REGION = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 10,
  longitudeDelta: 10,
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

  // 2. Chargement
  useFocusEffect(
    useCallback(() => {
      const fetchSites = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "sites"));
            const sitesData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                let rawLat = data.location?.latitude ?? data.lat ?? data.latitude;
                let rawLng = data.location?.longitude ?? data.lng ?? data.longitude;
                let lat = parseFloat(rawLat);
                let lng = parseFloat(rawLng);

                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

                return {
                    id: doc.id,
                    ...data,
                    location: { latitude: lat, longitude: lng },
                    lat: lat,
                    lng: lng,
                    type: data.type || 'falaise',
                    imageUrl: data.imageUrl || data.image || null
                };
            }).filter(item => item !== null);

            setSites(sitesData);
        } catch (error) { console.error("❌ ERREUR:", error); } 
        finally { setLoading(false); }
      };
      fetchSites();
    }, [])
  );

  const handleMarkerPress = (site) => {
    if (!site.location?.latitude) return;
    setSelectedSite(site);
    mapRef.current?.animateToRegion({
        latitude: site.location.latitude,
        longitude: site.location.longitude,
        latitudeDelta: 0.1, longitudeDelta: 0.1,
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

    let size = 50;
    let color = '#FFD700'; // Jaune
    let textColor = '#000';

    if (pointCount >= 5) {
        size = 70;
        color = '#FF3B30'; // Rouge
        textColor = '#fff';
    }

    return (
      <Marker coordinate={coordinate} onPress={onPress} key={`cluster-${id}`} zIndex={200} tracksViewChanges={true}>
        <View style={[styles.clusterContainer, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
          <Text style={[styles.clusterText, { color: textColor }]}>{pointCount}</Text>
        </View>
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={{ width: width, height: height }}
        provider={PROVIDER_GOOGLE}
        mapType="hybrid"
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        loadingEnabled={true}
        
        // --- CONFIG CLUSTERING ---
        renderCluster={renderCluster}
        clusterRadius={200} // Force le regroupement de loin
        minPoints={2}
        extent={512}
        animationEnabled={false}
        
        onPress={() => setSelectedSite(null)}
      >
        {sites.map((site) => (
            <Marker
                key={site.id}
                coordinate={site.location}
                onPress={() => handleMarkerPress(site)}
                zIndex={10}
                tracksViewChanges={true}
            >
                <View style={styles.markerContainer}>
                    <Ionicons 
                        name="location" 
                        size={selectedSite?.id === site.id ? 50 : 40} 
                        color={selectedSite?.id === site.id ? "#fff" : (site.type === 'bloc' ? '#FFD700' : '#FF3B30')} 
                    />
                </View>
            </Marker>
        ))}
      </ClusteredMapView>

      <TouchableOpacity style={styles.addSiteBtn} onPress={() => router.push('/add-site')}>
          <Ionicons name="add" size={30} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.recenterBtn, selectedSite && { bottom: 220 }]}
        onPress={() => {
            if(!location) return;
            mapRef.current.animateToRegion({
                latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1,
            }, 1000);
        }}
      >
          <Ionicons name="navigate" size={24} color="#000" />
      </TouchableOpacity>

      {selectedSite && (
          <View style={styles.bottomSheet}>
              <View style={styles.drawerHandle} />
              <View style={styles.sheetContentRow}>
                {selectedSite.imageUrl ? (
                     <Image source={{ uri: selectedSite.imageUrl }} style={styles.siteThumbnail} resizeMode="cover"/>
                ) : (
                    <View style={[styles.typeIcon, { backgroundColor: selectedSite.type === 'bloc' ? '#FFD700' : '#FF3B30' }]}>
                        <Ionicons name={selectedSite.type === 'bloc' ? "cube" : "stats-chart"} size={24} color="#fff" />
                    </View>
                )}
                <View style={{flex: 1, justifyContent:'center'}}>
                    <Text style={styles.sheetTitle}>{selectedSite.name || selectedSite.nom}</Text>
                    <Text style={styles.sheetSubtitle}>{selectedSite.type === 'bloc' ? "Bloc" : "Falaise"}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedSite(null)} style={{padding: 5}}>
                    <Ionicons name="close-circle" size={30} color="#555" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={navigateToDetails}>
                  <Text style={styles.actionBtnText}>Voir le site</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" style={{marginLeft: 10}}/>
              </TouchableOpacity>
          </View>
      )}

      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#FFD700" /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  clusterContainer: { justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.5, shadowRadius: 5, elevation: 10, borderColor: '#fff', borderWidth: 3 },
  clusterText: { fontWeight: 'bold', fontSize: 16 },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  addSiteBtn: { position: 'absolute', top: 60, right: 20, backgroundColor: '#FFD700', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 10 },
  recenterBtn: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#fff', padding: 12, borderRadius: 30, elevation: 5, zIndex: 10 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, elevation: 20, zIndex: 20 },
  drawerHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  sheetContentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  siteThumbnail: { width: 60, height: 60, borderRadius: 10, marginRight: 15, backgroundColor: '#333', borderWidth: 1, borderColor: '#555' },
  typeIcon: { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sheetSubtitle: { color: '#bbb', fontSize: 14, marginTop: 2 },
  actionBtn: { backgroundColor: '#FFD700', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 50 }
});