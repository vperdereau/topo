import { ReactNativeZoomableView } from '@dudigital/react-native-zoomable-view';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider'; // <--- NOUVEAU
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
  const { cragId, cragName } = useLocalSearchParams();
  
  // Data
  const [topos, setTopos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // UI States
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isScrollEnabled, setScrollEnabled] = useState(true);
  const [globalZoom, setGlobalZoom] = useState(1); // <--- Pour contrôler le zoom via le slider

  // Offline
  const [isOffline, setIsOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchTopos = async () => {
      try {
        const q = collection(db, "secteurs", cragId, "topos");
        const querySnapshot = await getDocs(q);
        setTopos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    if (cragId) fetchTopos();
  }, [cragId]);

  // Reset du zoom quand on change de page (slide)
  useEffect(() => {
      setGlobalZoom(1);
      setSelectedRoute(null);
  }, [currentIndex]);

  const downloadCurrent = async () => { /* ... Logique inchangée ... */ };
  const deleteCurrent = async () => { /* ... Logique inchangée ... */ };

  const renderTopoItem = ({ item }) => (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
       <TopoImageWrapper 
            item={item} 
            setSelectedRoute={(r) => setSelectedRoute(prev => (prev?.id === r.id ? null : r))} 
            selectedRoute={selectedRoute}
            setParentScrollEnabled={setScrollEnabled}
            zoomLevel={globalZoom} 
            onZoomChange={setGlobalZoom} // Callback quand on pince l'écran
       />
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#fff"/></View>;
  if (topos.length === 0) return <View style={styles.center}><Text style={{color:'#fff'}}>Aucun topo.</Text></View>;

  const currentTopo = topos[currentIndex];

  return (
    <View style={styles.container}>
      
      {/* --- HEADER AVEC SLIDER --- */}
      <View style={styles.headerPanel}>
        <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={router.back} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff"/>
            </TouchableOpacity>
            
            <View style={{alignItems:'center'}}>
                <Text style={styles.headerTitle}>{cragName}</Text>
                <Text style={{color:'#ccc', fontSize:10}}>
                    {currentIndex + 1} / {topos.length}
                </Text>
            </View>

            <TouchableOpacity onPress={isOffline ? deleteCurrent : downloadCurrent} style={[styles.iconBtn, isOffline && {backgroundColor:'#FF3B30'}]}>
                 {downloading ? <ActivityIndicator size="small" color="#fff"/> : <Ionicons name={isOffline ? "trash" : "cloud-download"} size={20} color="#fff"/>}
            </TouchableOpacity>
        </View>

        {/* CURSEUR DE ZOOM */}
        <View style={styles.sliderContainer}>
            <Ionicons name="remove-circle-outline" size={20} color="#ccc" />
            <Slider
                style={{flex: 1, marginHorizontal: 10}}
                minimumValue={1}
                maximumValue={3}
                step={0.1}
                value={globalZoom}
                onValueChange={(val) => setGlobalZoom(val)} // Mise à jour en temps réel
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#555"
                thumbTintColor="#fff"
            />
            <Ionicons name="add-circle-outline" size={20} color="#ccc" />
        </View>
      </View>

      {/* --- ZONE IMAGE (Flex pour prendre le reste de la place) --- */}
      <View style={styles.imageArea}>
          <FlatList 
            data={topos} 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id} 
            renderItem={renderTopoItem} 
            scrollEnabled={isScrollEnabled}
            onMomentumScrollEnd={(ev) => { 
                setCurrentIndex(Math.round(ev.nativeEvent.contentOffset.x / SCREEN_WIDTH)); 
            }}
          />
      </View>

      {/* --- FOOTER : BOUTON AJOUTER & INFO --- */}
      {selectedRoute ? (
          // Si une voie est sélectionnée, on affiche ses infos
          <View style={styles.footerContainer}>
             <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                <View>
                    <Text style={styles.routeTitle}>{selectedRoute.nom}</Text>
                    <View style={[styles.badge, { backgroundColor: getGradeColor(selectedRoute.cotation) }]}>
                        <Text style={styles.badgeText}>{selectedRoute.cotation}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.detailsBtn} onPress={() => router.push({ pathname: "/route-social", params: { routeData: JSON.stringify(selectedRoute), cragId: cragId } })}>
                    <Text style={{color:'#fff', fontWeight:'bold'}}>Détails →</Text>
                </TouchableOpacity>
             </View>
          </View>
      ) : (
          // Sinon, on affiche le bouton "Proposer une voie"
          <View style={styles.footerContainer}>
             <TouchableOpacity 
                style={styles.addRouteBtn}
                onPress={() => router.push({
                    pathname: "/propose-route",
                    params: { 
                        cragId: cragId,
                        topoId: currentTopo.id,
                        imageUrl: currentTopo.imageUrl,
                        imageWidth: currentTopo.imageWidth,
                        imageHeight: currentTopo.imageHeight
                    }
                })}
             >
                <Ionicons name="add" size={24} color="#000" style={{marginRight: 10}}/>
                <Text style={styles.addRouteText}>Ajouter une voie ici</Text>
             </TouchableOpacity>
          </View>
      )}
    </View>
  );
}

// --- Wrapper pour gérer le Zoom individuel ---
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

    const imgHeight = item.imageHeight ? (SCREEN_WIDTH / item.imageWidth) * item.imageHeight : 500;

    return (
        <ReactNativeZoomableView 
            ref={zoomRef}
            maxZoom={3} 
            minZoom={1} 
            zoomStep={0.5} 
            initialZoom={1} 
            bindToBorders={true}
            zoomLevel={zoomLevel} // Contrôlé par le parent (Slider)
            onZoomAfter={(e, g, z) => {
                // Sync inverse : si on pince, on met à jour le slider du parent
                onZoomChange(z.zoomLevel);
                // Gestion du conflit scroll/zoom
                setParentScrollEnabled(z.zoomLevel <= 1.1);
            }}
            style={{backgroundColor:'#111'}}
        >
            <View style={{ width: SCREEN_WIDTH, height: imgHeight }}>
                <Image source={src} style={{width:'100%', height:'100%', position: 'absolute', zIndex: 1}} resizeMode="contain" />
                <Svg height={imgHeight} width={SCREEN_WIDTH} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
                    {item.routes?.map((r, i) => {
                        const isSel = selectedRoute?.id === (r.id || i);
                        const start = { x: parseFloat(r.path.split(' ')[1]), y: parseFloat(r.path.split(' ')[2]) };
                        const color = getGradeColor(r.cotation);
                        const handleTouch = () => setSelectedRoute({ ...r, id: r.id || i });

                        return (
                            <G key={i} onPressIn={handleTouch}>
                                {/* Zone de touche invisible élargie */}
                                <Path d={r.path} stroke="transparent" strokeWidth="30" fill="none" />
                                
                                {/* Tracé visible */}
                                <Path d={r.path} stroke={isSel ? "#FFD700" : color} strokeWidth={isSel ? 4 : 2.5} fill="none" strokeLinecap="round" />
                                
                                {/* Textes */}
                                <SvgText x={start.x} y={start.y - 20} fill="none" stroke="black" strokeWidth="3" fontSize="14" fontWeight="bold" textAnchor="middle">{r.cotation}</SvgText>
                                <SvgText x={start.x} y={start.y - 20} fill="white" stroke="none" fontSize="14" fontWeight="bold" textAnchor="middle">{r.cotation}</SvgText>
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
  
  // Header Panel
  headerPanel: { paddingTop: 50, paddingBottom: 10, paddingHorizontal: 15, backgroundColor: '#1a1a1a', zIndex: 50 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  iconBtn: { padding: 8, backgroundColor: '#333', borderRadius: 20 },
  
  // Slider
  sliderContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', padding: 5, borderRadius: 20 },

  // Main Image Area
  imageArea: { flex: 1, backgroundColor: '#000' },

  // Footer Actions
  footerContainer: { 
      backgroundColor: '#fff', 
      padding: 15, 
      paddingBottom: 30, // Pour les écrans arrondis type iPhone X
      borderTopLeftRadius: 20, 
      borderTopRightRadius: 20 
  },
  addRouteBtn: { 
      flexDirection: 'row', backgroundColor: '#FFD700', padding: 15, borderRadius: 10, 
      justifyContent: 'center', alignItems: 'center' 
  },
  addRouteText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  // Info Card Styles
  routeTitle: { fontWeight: 'bold', fontSize: 18, color: '#333' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 5 },
  badgeText: { color: '#fff', fontWeight: 'bold' },
  detailsBtn: { backgroundColor: '#333', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 }
});