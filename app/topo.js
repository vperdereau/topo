import { ReactNativeZoomableView } from '@dudigital/react-native-zoomable-view';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions, FlatList, Image,
    ScrollView,
    StyleSheet, Text,
    TouchableOpacity, View
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

  const [topos, setTopos] = useState([]);
  const [sectorData, setSectorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('topo'); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isScrollEnabled, setScrollEnabled] = useState(true);
  
  // STATE ZOOM
  const [globalZoom, setGlobalZoom] = useState(1);

  const [isOffline, setIsOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // CHARGEMENT
  useEffect(() => {
    const fetchTopos = async () => {
      if (!parentSiteId) return;
      setLoading(true);
      try {
        let finalTopos = [];
        if (sectorId) {
             const q = collection(db, "sites", parentSiteId, "secteurs", sectorId, "topos");
             const snapshot = await getDocs(q);
             finalTopos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), secteurId: sectorId }));
        } else {
             const secteursRef = collection(db, "sites", parentSiteId, "secteurs");
             const snap = await getDocs(secteursRef);
             const promises = snap.docs.map(async (s) => {
                const tSnap = await getDocs(collection(db, "sites", parentSiteId, "secteurs", s.id, "topos"));
                return tSnap.docs.map(d => ({ id: d.id, ...d.data(), secteurId: s.id }));
             });
             finalTopos = (await Promise.all(promises)).flat();
        }
        setTopos(finalTopos);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchTopos();
  }, [parentSiteId, sectorId]);

  useEffect(() => {
      const fetchSectorData = async () => {
          if (!sectorId || !parentSiteId) return;
          try {
              const snap = await getDoc(doc(db, "sites", parentSiteId, "secteurs", sectorId));
              if (snap.exists()) setSectorData(snap.data());
          } catch (e) {}
      };
      fetchSectorData();
  }, [sectorId, parentSiteId]);

  useEffect(() => { setGlobalZoom(1); setSelectedRoute(null); setScrollEnabled(true); }, [currentIndex]);

  // OFFLINE
  useEffect(() => { 
      if (topos[currentIndex]) checkOffline(); 
  }, [currentIndex, topos]);

  const checkOffline = async () => {
      const saved = await AsyncStorage.getItem(`img_data_${topos[currentIndex].id}`);
      setIsOffline(!!saved);
  };

  const downloadCurrent = async () => {
    const currentTopo = topos[currentIndex];
    if (!currentTopo) return;
    setDownloading(true);
    try {
        const resp = await fetch(currentTopo.imageUrl);
        const blob = await resp.blob();
        const base64 = await new Promise((res) => { const r = new FileReader(); r.readAsDataURL(blob); r.onloadend = () => res(r.result.split(',')[1]); });
        await AsyncStorage.setItem(`img_data_${currentTopo.id}`, base64);
        setIsOffline(true);
        Alert.alert("Succès", "Sauvegardé hors-ligne !");
    } catch (e) { Alert.alert("Erreur", "Echec téléchargement"); } finally { setDownloading(false); }
  };
  
  const deleteCurrent = async () => { 
      if(!topos[currentIndex]) return;
      await AsyncStorage.removeItem(`img_data_${topos[currentIndex].id}`); 
      setIsOffline(false); 
  };

  const renderAccessTab = () => {
      const access = sectorData?.approachData;
      return (
          <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 100}}>
              <View style={styles.accessCard}>
                  <View style={styles.accessRow}><Ionicons name="time" size={24} color="#FFD700" /><Text style={styles.accessText}>{access?.time || "? min"}</Text></View>
                  <View style={styles.divider} />
                  <View style={styles.accessRow}><Ionicons name="walk" size={24} color="#FFD700" /><Text style={styles.accessText}>Marche</Text></View>
              </View>
              {access?.imageUrl && (<View style={styles.accessImageContainer}><Image source={{uri: access.imageUrl}} style={styles.accessImage} resizeMode="cover" /></View>)}
              <Text style={styles.sectionHeader}>Description</Text>
              <Text style={styles.descriptionText}>{access?.description || "Pas de description."}</Text>
              <TouchableOpacity style={styles.editAccessBtn} onPress={() => router.push({pathname: '/propose-approach', params: { siteId: parentSiteId, sectorId, sectorName: cragName }})}>
                  <Ionicons name="create-outline" size={20} color="#000" /><Text style={{color:'#000', fontWeight:'bold', marginLeft: 10}}>{access ? "Modifier" : "Ajouter infos"}</Text>
              </TouchableOpacity>
          </ScrollView>
      );
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

  const currentTopo = topos.length > 0 ? topos[currentIndex] : null;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFD700"/></View>;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerPanel}>
        <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="arrow-back" size={24} color="#fff"/></TouchableOpacity>
            <View style={{alignItems:'center'}}>
                <Text style={styles.headerTitle}>{cragName || "Topo"}</Text>
                {activeTab === 'topo' && sectorId && (
                    <TouchableOpacity onPress={() => router.push({pathname: '/add-topo', params: { siteId: parentSiteId, sectorId: sectorId, sectorName: cragName }})} style={{marginTop: 5, flexDirection:'row', alignItems:'center'}}>
                        <Ionicons name="camera-outline" size={14} color="#FFD700" /><Text style={{color:'#FFD700', fontSize:12, marginLeft:4}}>Ajouter photo</Text>
                    </TouchableOpacity>
                )}
            </View>
            {activeTab === 'topo' && topos.length > 0 ? (
                <TouchableOpacity onPress={isOffline ? deleteCurrent : downloadCurrent} style={[styles.iconBtn, isOffline && {backgroundColor:'#FF3B30'}]}>
                     {downloading ? <ActivityIndicator size="small" color="#fff"/> : <Ionicons name={isOffline ? "trash" : "cloud-download"} size={20} color="#fff"/>}
                </TouchableOpacity>
            ) : <View style={{width: 40}} />}
        </View>

        <View style={styles.tabContainer}>
             <TouchableOpacity onPress={() => setActiveTab('topo')} style={[styles.tabBtn, activeTab === 'topo' && styles.tabBtnActive]}><Text style={[styles.tabText, activeTab === 'topo' && {color:'#000'}]}>🧗 LE TOPO</Text></TouchableOpacity>
             <TouchableOpacity onPress={() => setActiveTab('access')} style={[styles.tabBtn, activeTab === 'access' && styles.tabBtnActive]}><Text style={[styles.tabText, activeTab === 'access' && {color:'#000'}]}>🚶 ACCÈS</Text></TouchableOpacity>
        </View>

        {activeTab === 'topo' && topos.length > 0 && (
            <View style={styles.sliderContainer}>
                <Ionicons name="remove-circle-outline" size={20} color="#ccc" />
                <Slider style={{flex: 1, marginHorizontal: 10}} minimumValue={1} maximumValue={3} step={0.1} value={globalZoom} onValueChange={setGlobalZoom} minimumTrackTintColor="#007AFF" maximumTrackTintColor="#555" thumbTintColor="#fff" />
                <Ionicons name="add-circle-outline" size={20} color="#ccc" />
            </View>
        )}
      </View>

      {/* CONTENU */}
      <View style={styles.imageArea}>
          {activeTab === 'topo' ? (
              topos.length > 0 ? (
                  <FlatList 
                    data={topos} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.id} 
                    renderItem={renderTopoItem} 
                    scrollEnabled={isScrollEnabled} 
                    onMomentumScrollEnd={(ev) => setCurrentIndex(Math.round(ev.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
                  />
              ) : (
                  <View style={styles.emptyState}>
                      <Ionicons name="images-outline" size={60} color="#444" />
                      <Text style={styles.emptyText}>Aucun topo disponible.</Text>
                      {sectorId && (
                          <TouchableOpacity style={styles.bigAddBtn} onPress={() => router.push({pathname: '/add-topo', params: { siteId: parentSiteId, sectorId: sectorId, sectorName: cragName }})}>
                              <Ionicons name="add-circle" size={24} color="#000" style={{marginRight:10}}/><Text style={{color:'#000', fontWeight:'bold'}}>Ajouter une photo</Text>
                          </TouchableOpacity>
                      )}
                  </View>
              )
          ) : renderAccessTab()}
      </View>

      {/* FOOTER */}
      {activeTab === 'topo' && topos.length > 0 && (
          selectedRoute ? (
              <View style={styles.footerContainer}>
                 <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                    <View><Text style={styles.routeTitle}>{selectedRoute.nom}</Text><View style={[styles.badge, { backgroundColor: getGradeColor(selectedRoute.cotation) }]}><Text style={styles.badgeText}>{selectedRoute.cotation}</Text></View></View>
                    <TouchableOpacity style={styles.detailsBtn} onPress={() => router.push({ pathname: "/route-social", params: { routeData: JSON.stringify(selectedRoute), cragId: parentSiteId } })}><Text style={{color:'#fff', fontWeight:'bold'}}>Détails →</Text></TouchableOpacity>
                 </View>
              </View>
          ) : (
              <View style={styles.footerContainer}>
                 <TouchableOpacity style={styles.addRouteBtn} onPress={() => router.push({pathname: "/propose-route", params: { siteId: parentSiteId, topoId: currentTopo.id, imageUrl: currentTopo.imageUrl, imageWidth: currentTopo.imageWidth, imageHeight: currentTopo.imageHeight, sectorId: currentTopo.secteurId || sectorId }})}>
                    <Ionicons name="add" size={24} color="#000" style={{marginRight: 10}}/><Text style={styles.addRouteText}>Ajouter une voie ici</Text>
                 </TouchableOpacity>
              </View>
          )
      )}
    </View>
  );
}

// --- WRAPPER ZOOM ANTI-BOUCLE ---
const TopoImageWrapper = ({ item, setSelectedRoute, selectedRoute, setParentScrollEnabled, zoomLevel, onZoomChange }) => {
    const [src, setSrc] = useState({ uri: item.imageUrl });
    const zoomRef = useRef(null);
    const isProgrammatic = useRef(false); // VERROU ANTI BOUCLE

    useEffect(() => { 
        const load = async () => { const s = await AsyncStorage.getItem(`img_data_${item.id}`); if (s) setSrc({ uri: `data:image/jpeg;base64,${s}` }); }; load(); 
    }, [item.id]);

    // 1. Zoom déclenché par le Slider (Parent -> Enfant)
    useEffect(() => {
        if (zoomRef.current) {
            // On lève le drapeau : "C'est moi qui zoome, ne me renvoie pas l'info"
            isProgrammatic.current = true;
            zoomRef.current.zoomTo(zoomLevel);
            
            // On baisse le drapeau après un court délai
            setTimeout(() => { isProgrammatic.current = false; }, 300);
        }
    }, [zoomLevel]);

    const imgHeight = item.imageHeight ? (SCREEN_WIDTH / item.imageWidth) * item.imageHeight : 500;

    return (
        <ReactNativeZoomableView 
            ref={zoomRef}
            maxZoom={3} minZoom={1} zoomStep={0.1} initialZoom={1} bindToBorders={false}
            // 2. Zoom déclenché par les doigts (Enfant -> Parent)
            onZoomAfter={(e, g, z) => {
                // Si ce n'est PAS un zoom programmatique, on informe le parent
                if (!isProgrammatic.current) {
                    onZoomChange(z.zoomLevel);
                }
                setParentScrollEnabled(z.zoomLevel <= 1.05);
            }}
            style={{backgroundColor:'#111'}}
        >
            <View style={{ width: SCREEN_WIDTH, height: imgHeight }}>
                <Image source={src} style={{width:'100%', height:'100%', position: 'absolute', zIndex: 1}} resizeMode="contain" />
                <Svg height={imgHeight} width={SCREEN_WIDTH} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
                    {item.routes?.map((r, i) => {
                        const isSel = selectedRoute?.id === (r.id || i);
                        const parts = r.path.split(' ');
                        const startX = parts.length > 1 ? parseFloat(parts[1]) : 50;
                        const startY = parts.length > 2 ? parseFloat(parts[2]) : 50;
                        const color = getGradeColor(r.cotation);
                        return (
                            <G key={i} onPressIn={() => setSelectedRoute({ ...r, id: r.id || i })}>
                                <Path d={r.path} stroke="transparent" strokeWidth="30" fill="none" />
                                <Path d={r.path} stroke={isSel ? "#FFD700" : color} strokeWidth={isSel ? 4 : 2.5} fill="none" strokeLinecap="round" />
                                <SvgText x={startX} y={startY - 25} fill="none" stroke="black" strokeWidth="4" fontSize="16" fontWeight="bold" textAnchor="middle">{r.cotation}</SvgText>
                                <SvgText x={startX} y={startY - 25} fill="white" stroke="none" fontSize="16" fontWeight="bold" textAnchor="middle">{r.cotation}</SvgText>
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
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  iconBtn: { padding: 8, backgroundColor: '#333', borderRadius: 20 },
  tabContainer: { flexDirection:'row', marginTop: 10, backgroundColor:'#222', borderRadius: 8, padding: 2 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: '#FFD700' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', padding: 5, borderRadius: 20, marginTop: 10 },
  imageArea: { flex: 1, backgroundColor: '#000', justifyContent:'center' },
  footerContainer: { backgroundColor: '#fff', padding: 15, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  addRouteBtn: { flexDirection: 'row', backgroundColor: '#FFD700', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addRouteText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  routeTitle: { fontWeight: 'bold', fontSize: 18, color: '#333' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 5 },
  badgeText: { color: '#fff', fontWeight: 'bold' },
  detailsBtn: { backgroundColor: '#333', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: '#fff', fontSize: 16, marginVertical: 15 },
  bigAddBtn: { backgroundColor: '#FFD700', flexDirection:'row', alignItems:'center', padding: 15, borderRadius: 30, marginTop: 10 },
  accessCard: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 15, marginBottom: 20 },
  accessRow: { flex: 1, alignItems: 'center' },
  accessText: { color: '#fff', marginTop: 5, fontWeight: 'bold' },
  divider: { width: 1, backgroundColor: '#333' },
  accessImageContainer: { marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
  accessImage: { width: '100%', height: 200 },
  imageLabel: { position:'absolute', bottom: 10, left: 10, backgroundColor:'rgba(0,0,0,0.6)', padding: 4, borderRadius: 4 },
  sectionHeader: { color: '#FFD700', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  descriptionText: { color: '#ccc', lineHeight: 22, fontSize: 15 },
  editAccessBtn: { flexDirection: 'row', backgroundColor: '#FFD700', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 30 }
});