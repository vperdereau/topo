import { ReactNativeZoomableView } from '@dudigital/react-native-zoomable-view';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { db } from '../firebaseConfig';
import { getGradeColor } from '../utils/gradeColors';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TopoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { siteId, cragId, sectorId, cragName } = params;
  
  const parentSiteId = siteId || cragId; 

  // Data
  const [topos, setTopos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // UI States
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isScrollEnabled, setScrollEnabled] = useState(true);
  const [globalZoom, setGlobalZoom] = useState(1);

  // Offline
  const [isOffline, setIsOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 1. CHARGEMENT DES TOPOS
  useEffect(() => {
    const fetchTopos = async () => {
      if (!parentSiteId) return;
      setLoading(true);
      
      try {
        let finalTopos = [];

        // CAS 1 : Secteur unique
        if (sectorId) {
             const q = collection(db, "sites", parentSiteId, "secteurs", sectorId, "topos");
             const snapshot = await getDocs(q);
             finalTopos = snapshot.docs.map(doc => ({ 
                 id: doc.id, 
                 ...doc.data(),
                 secteurId: sectorId
             }));
        } 
        // CAS 2 : Tout le site
        else {
             const secteursRef = collection(db, "sites", parentSiteId, "secteurs");
             const secteursSnapshot = await getDocs(secteursRef);
             
             const promises = secteursSnapshot.docs.map(async (s) => {
                const tRef = collection(db, "sites", parentSiteId, "secteurs", s.id, "topos");
                const tSnap = await getDocs(tRef);
                return tSnap.docs.map(d => ({ id: d.id, ...d.data(), secteurId: s.id }));
             });

             const results = await Promise.all(promises);
             finalTopos = results.flat();
        }

        setTopos(finalTopos);

      } catch (error) { 
          console.error("❌ Erreur topo.js :", error); 
      } finally { 
          setLoading(false); 
      }
    };
    
    fetchTopos();
  }, [parentSiteId, sectorId]);

  // Reset du zoom
  useEffect(() => {
      setGlobalZoom(1);
      setSelectedRoute(null);
  }, [currentIndex]);

  // Offline Logic
  const checkOffline = async () => {
      if (!topos[currentIndex]) return;
      const saved = await AsyncStorage.getItem(`img_data_${topos[currentIndex].id}`);
      setIsOffline(!!saved);
  };
  useEffect(() => { checkOffline(); }, [currentIndex, topos]);

  const downloadCurrent = async () => {
    if (!currentTopo) return;
    setDownloading(true);
    try {
        const resp = await fetch(currentTopo.imageUrl);
        const blob = await resp.blob();
        const base64 = await new Promise((res) => { const r = new FileReader(); r.readAsDataURL(blob); r.onloadend = () => res(r.result.split(',')[1]); });
        await AsyncStorage.setItem(`img_data_${currentTopo.id}`, base64);
        setIsOffline(true);
        Alert.alert("Succès", "Topo sauvegardé hors-ligne !");
    } catch (e) { Alert.alert("Erreur", "Echec du téléchargement"); } finally { setDownloading(false); }
  };

  const deleteCurrent = async () => { 
      if (!currentTopo) return;
      await AsyncStorage.removeItem(`img_data_${currentTopo.id}`); 
      setIsOffline(false); 
  };

  const renderTopoItem = ({ item }) => (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
       <TopoImageWrapper 
            item={item} 
            setSelectedRoute={(r) => setSelectedRoute(prev => (prev?.id === r.id ? null : r))} 
            selectedRoute={selectedRoute}
            setParentScrollEnabled={setScrollEnabled}
            zoomLevel={globalZoom} 
            onZoomChange={setGlobalZoom}
       />
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFD700"/></View>;

  // --- CHANGEMENT ICI : On ne retourne plus rien si vide, on continue ---
  const currentTopo = topos.length > 0 ? topos[currentIndex] : null;

  return (
    <View style={styles.container}>
      
      {/* --- HEADER --- */}
      <View style={styles.headerPanel}>
        <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff"/>
            </TouchableOpacity>
            
            <View style={{alignItems:'center'}}>
                <Text style={styles.headerTitle}>{cragName || "Topo"}</Text>
                
                {/* 1. Bouton d'ajout de photo dans le header (Visible même si vide) */}
                {sectorId && (
                    <TouchableOpacity 
                        onPress={() => router.push({
                            pathname: '/add-topo',
                            params: { siteId: parentSiteId, sectorId: sectorId, sectorName: cragName }
                        })}
                        style={{marginTop: 5, flexDirection:'row', alignItems:'center'}}
                    >
                        <Ionicons name="camera-outline" size={14} color="#FFD700" />
                        <Text style={{color:'#FFD700', fontSize:12, marginLeft:4}}>Ajouter photo</Text>
                    </TouchableOpacity>
                )}

                <Text style={{color:'#ccc', fontSize:10, marginTop: 2}}>
                    {topos.length > 0 ? `${currentIndex + 1} / ${topos.length}` : "0 / 0"}
                </Text>
            </View>

            {/* Bouton Download (Caché si vide) */}
            {topos.length > 0 ? (
                <TouchableOpacity onPress={isOffline ? deleteCurrent : downloadCurrent} style={[styles.iconBtn, isOffline && {backgroundColor:'#FF3B30'}]}>
                     {downloading ? <ActivityIndicator size="small" color="#fff"/> : <Ionicons name={isOffline ? "trash" : "cloud-download"} size={20} color="#fff"/>}
                </TouchableOpacity>
            ) : <View style={{width: 40}} />}
        </View>

        {/* SLIDER (Caché si vide) */}
        {topos.length > 0 && (
            <View style={styles.sliderContainer}>
                <Ionicons name="remove-circle-outline" size={20} color="#ccc" />
                <Slider
                    style={{flex: 1, marginHorizontal: 10}}
                    minimumValue={1} maximumValue={3} step={0.1} value={globalZoom}
                    onValueChange={setGlobalZoom}
                    minimumTrackTintColor="#007AFF" maximumTrackTintColor="#555" thumbTintColor="#fff"
                />
                <Ionicons name="add-circle-outline" size={20} color="#ccc" />
            </View>
        )}
      </View>

      {/* --- ZONE PRINCIPALE (IMAGE OU VIDE) --- */}
      <View style={styles.imageArea}>
          {topos.length > 0 ? (
              <FlatList 
                data={topos} 
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id} 
                renderItem={renderTopoItem} 
                scrollEnabled={isScrollEnabled}
                onMomentumScrollEnd={(ev) => { 
                    setCurrentIndex(Math.round(ev.nativeEvent.contentOffset.x / SCREEN_WIDTH)); 
                }}
              />
          ) : (
              // 2. Affichage si VIDE (Centré)
              <View style={styles.emptyState}>
                  <Ionicons name="images-outline" size={60} color="#444" />
                  <Text style={styles.emptyText}>Aucun topo disponible.</Text>
                  
                  {sectorId ? (
                      <TouchableOpacity 
                        style={styles.bigAddBtn}
                        onPress={() => router.push({
                            pathname: '/add-topo',
                            params: { siteId: parentSiteId, sectorId: sectorId, sectorName: cragName }
                        })}
                      >
                          <Ionicons name="add-circle" size={24} color="#000" style={{marginRight:10}}/>
                          <Text style={{color:'#000', fontWeight:'bold'}}>Ajouter une première photo</Text>
                      </TouchableOpacity>
                  ) : (
                      <Text style={{color:'#666', marginTop:10, fontSize:12}}>Sélectionnez un secteur pour ajouter une photo.</Text>
                  )}
              </View>
          )}
      </View>

      {/* --- FOOTER (Info Voie OU Bouton Ajouter Voie) --- */}
      {/* 3. On n'affiche le Footer que si on a des topos */}
      {topos.length > 0 && (
          selectedRoute ? (
              <View style={styles.footerContainer}>
                 <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                    <View>
                        <Text style={styles.routeTitle}>{selectedRoute.nom}</Text>
                        <View style={[styles.badge, { backgroundColor: getGradeColor(selectedRoute.cotation) }]}>
                            <Text style={styles.badgeText}>{selectedRoute.cotation}</Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={styles.detailsBtn} 
                        onPress={() => router.push({ 
                            pathname: "/route-social", 
                            params: { routeData: JSON.stringify(selectedRoute), cragId: parentSiteId } 
                        })}
                    >
                        <Text style={{color:'#fff', fontWeight:'bold'}}>Détails →</Text>
                    </TouchableOpacity>
                 </View>
              </View>
          ) : (
              <View style={styles.footerContainer}>
                 <TouchableOpacity 
                    style={styles.addRouteBtn}
                    onPress={() => router.push({
                        pathname: "/propose-route",
                        params: { 
                            siteId: parentSiteId,
                            topoId: currentTopo.id,
                            imageUrl: currentTopo.imageUrl,
                            imageWidth: currentTopo.imageWidth,
                            imageHeight: currentTopo.imageHeight,
                            sectorId: currentTopo.secteurId || sectorId 
                        }
                    })}
                 >
                    <Ionicons name="add" size={24} color="#000" style={{marginRight: 10}}/>
                    <Text style={styles.addRouteText}>Ajouter une voie ici</Text>
                 </TouchableOpacity>
              </View>
          )
      )}
    </View>
  );
}

// --- Wrapper Image (Inchangé, mais inclus pour que ça compile) ---
const TopoImageWrapper = ({ item, setSelectedRoute, selectedRoute, setParentScrollEnabled, zoomLevel, onZoomChange }) => {
    const [src, setSrc] = useState({ uri: item.imageUrl });
    const zoomRef = useRef(null);

    useEffect(() => { 
        const load = async () => { 
            const s = await AsyncStorage.getItem(`img_data_${item.id}`); 
            if (s) setSrc({ uri: `data:image/jpeg;base64,${s}` }); 
        }; 
        load(); 
    }, [item.id]);

    useEffect(() => {
        if (zoomRef.current && Math.abs(zoomRef.current.zoomLevel - zoomLevel) > 0.1) {
             zoomRef.current.zoomTo(zoomLevel);
        }
    }, [zoomLevel]);

    const imgHeight = item.imageHeight ? (SCREEN_WIDTH / item.imageWidth) * item.imageHeight : 500;

    return (
        <ReactNativeZoomableView 
            ref={zoomRef}
            maxZoom={3} minZoom={1} zoomStep={0.5} initialZoom={1} bindToBorders={true}
            onZoomAfter={(e, g, z) => {
                onZoomChange(z.zoomLevel);
                setParentScrollEnabled(z.zoomLevel <= 1.1);
            }}
            style={{backgroundColor:'#111'}}
        >
            <View style={{ width: SCREEN_WIDTH, height: imgHeight }}>
                <Image source={src} style={{width:'100%', height:'100%', position: 'absolute', zIndex: 1}} resizeMode="contain" />
                <Svg height={imgHeight} width={SCREEN_WIDTH} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
                    {item.routes?.map((r, i) => {
                        const isSel = selectedRoute?.id === (r.id || i);
                        const pathParts = r.path.split(' ');
                        const startX = pathParts.length > 1 ? parseFloat(pathParts[1]) : 50;
                        const startY = pathParts.length > 2 ? parseFloat(pathParts[2]) : 50;
                        const color = getGradeColor(r.cotation);
                        const handleTouch = () => setSelectedRoute({ ...r, id: r.id || i });

                        return (
                            <G key={i} onPressIn={handleTouch}>
                                <Path d={r.path} stroke="transparent" strokeWidth="30" fill="none" />
                                <Path d={r.path} stroke={isSel ? "#FFD700" : color} strokeWidth={isSel ? 4 : 2.5} fill="none" strokeLinecap="round" />
                                <SvgText x={startX} y={startY - 20} fill="none" stroke="black" strokeWidth="3" fontSize="14" fontWeight="bold" textAnchor="middle">{r.cotation}</SvgText>
                                <SvgText x={startX} y={startY - 20} fill="white" stroke="none" fontSize="14" fontWeight="bold" textAnchor="middle">{r.cotation}</SvgText>
                            </G>
                        );
                    })}
                </Svg>
            </View>
        </ReactNativeZoomableView>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  headerPanel: { paddingTop: 50, paddingBottom: 10, paddingHorizontal: 15, backgroundColor: '#1a1a1a', zIndex: 50 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  iconBtn: { padding: 8, backgroundColor: '#333', borderRadius: 20 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', padding: 5, borderRadius: 20 },
  imageArea: { flex: 1, backgroundColor: '#000', justifyContent:'center' },
  footerContainer: { backgroundColor: '#fff', padding: 15, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  addRouteBtn: { flexDirection: 'row', backgroundColor: '#FFD700', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addRouteText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  routeTitle: { fontWeight: 'bold', fontSize: 18, color: '#333' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 5 },
  badgeText: { color: '#fff', fontWeight: 'bold' },
  detailsBtn: { backgroundColor: '#333', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },
  
  // Styles Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: '#fff', fontSize: 16, marginVertical: 15 },
  bigAddBtn: { backgroundColor: '#FFD700', flexDirection:'row', alignItems:'center', padding: 15, borderRadius: 30, marginTop: 10 },
});