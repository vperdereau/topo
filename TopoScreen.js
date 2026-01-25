import { ReactNativeZoomableView } from '@dudigital/react-native-zoomable-view';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle, Defs, G, Path, Text as SvgText, TextPath } from 'react-native-svg';

// --- IMPORTS LOCAUX ---
// Vérifie que ces chemins correspondent bien à ton projet
import PaywallModal from './components/PaywallModal';
import { COLORS } from './constants/theme';
import { db } from './firebaseConfig';
import { getGradeColor } from './utils/gradeColors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IS_USER_PREMIUM = false; // Simulation état utilisateur

export default function TopoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { cragId, cragName } = route.params || {};

  // --- DATA STATE ---
  const [topos, setTopos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // --- UI STATE ---
  const [isOffline, setIsOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isScrollEnabled, setScrollEnabled] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  
  // --- ZOOM STATE & REFS ---
  const [globalZoom, setGlobalZoom] = useState(1);
  const isSliding = useRef(false); // Empêche la boucle infinie React

  // 1. Chargement des topos
  useEffect(() => {
    const fetchTopos = async () => {
      if (!cragId) return;
      try {
        const q = collection(db, "secteurs", cragId, "topos");
        const querySnapshot = await getDocs(q);
        setTopos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchTopos();
  }, [cragId]);

  // 2. Vérification Offline
  useEffect(() => {
    const checkOffline = async () => {
      if (topos.length === 0) return;
      const storageKey = `img_data_${topos[currentIndex].id}`;
      const saved = await AsyncStorage.getItem(storageKey);
      setIsOffline(!!saved);
    };
    checkOffline();
  }, [currentIndex, topos]);

  // Reset du zoom et de la sélection au changement de page
  useEffect(() => {
      setGlobalZoom(1);
      setSelectedRoute(null);
  }, [currentIndex]);

  // --- ACTIONS ---
  const handleDownloadPress = () => { isOffline ? deleteCurrent() : (!IS_USER_PREMIUM ? setShowPaywall(true) : downloadCurrent()); };
  
  const downloadCurrent = async () => {
    setDownloading(true);
    try {
        const currentTopo = topos[currentIndex];
        const resp = await fetch(currentTopo.imageUrl);
        const blob = await resp.blob();
        const base64 = await new Promise((res) => { const r = new FileReader(); r.readAsDataURL(blob); r.onloadend = () => res(r.result.split(',')[1]); });
        await AsyncStorage.setItem(`img_data_${currentTopo.id}`, base64);
        setIsOffline(true);
        Alert.alert("Sauvegardé", "Disponible hors-ligne !");
    } catch (e) { Alert.alert("Erreur", "Echec du téléchargement"); } finally { setDownloading(false); }
  };

  const deleteCurrent = async () => { await AsyncStorage.removeItem(`img_data_${topos[currentIndex].id}`); setIsOffline(false); };
  const handleBuyPremium = () => { setShowPaywall(false); };

  const handleProposeRoute = () => {
    const currentTopo = topos[currentIndex];
    if (!currentTopo) return;
    navigation.navigate('ProposeRoute', {
        cragId, topoId: currentTopo.id, imageUrl: currentTopo.imageUrl,
        imageWidth: currentTopo.imageWidth, imageHeight: currentTopo.imageHeight
    });
  };

  // --- RENDU ITEM FLATLIST ---
  const renderTopoItem = ({ item }) => (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
       <TopoImageWrapper 
            item={item} 
            setSelectedRoute={(r) => setSelectedRoute(prev => (prev?.id === r.id ? null : r))} 
            selectedRoute={selectedRoute}
            setParentScrollEnabled={setScrollEnabled}
            zoomLevel={globalZoom} 
            onZoomChange={(newZoom) => {
                // IMPORTANT : On ne met à jour le state que si l'utilisateur NE touche PAS au slider
                if (!isSliding.current) {
                    setGlobalZoom(newZoom);
                }
            }}
       />
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (topos.length === 0) return <View style={styles.center}><Text style={{color:'#fff'}}>Aucun topo.</Text></View>;

  return (
    <View style={styles.container}>
      
      {/* 1. HEADER + SLIDER (Fixe en haut) */}
      <View style={styles.headerPanel}>
        <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff"/>
            </TouchableOpacity>
            
            <View style={{alignItems:'center'}}>
                <Text style={styles.headerTitle}>{cragName}</Text>
                <Text style={{color:'#ccc', fontSize:10}}>{currentIndex + 1} / {topos.length}</Text>
            </View>

            <View style={{flexDirection:'row'}}>
                <TouchableOpacity onPress={() => setShowListModal(true)} style={[styles.iconBtn, {marginRight:10}]}>
                    <Ionicons name="list" size={20} color="#fff"/>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDownloadPress} style={[styles.iconBtn, isOffline && {backgroundColor:'#32D74B'}]}>
                    <Ionicons name={isOffline ? "checkmark" : "cloud-download-outline"} size={20} color="#fff"/>
                </TouchableOpacity>
            </View>
        </View>

        {/* Slider Zoom */}
        <View style={styles.sliderRow}>
            <Ionicons name="remove" size={20} color="#999" />
            <Slider
                style={{flex: 1, marginHorizontal: 10}}
                minimumValue={1}
                maximumValue={3}
                step={0.1}
                value={globalZoom}
                onSlidingStart={() => { isSliding.current = true; }} // Bloque les updates venant de l'image
                onValueChange={(val) => setGlobalZoom(val)}
                onSlidingComplete={() => { isSliding.current = false; }} // Débloque
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#444"
                thumbTintColor="#fff"
            />
            <Ionicons name="add" size={20} color="#999" />
        </View>
      </View>

      {/* 2. ZONE IMAGE (Prend tout l'espace disponible) */}
      <View style={{ flex: 1, backgroundColor: '#000' }}>
          <FlatList 
            data={topos} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id} renderItem={renderTopoItem} scrollEnabled={isScrollEnabled}
            onMomentumScrollEnd={(ev) => { 
                setCurrentIndex(Math.round(ev.nativeEvent.contentOffset.x / SCREEN_WIDTH)); 
            }}
          />
      </View>

      {/* 3. FOOTER BLANC (Info Voie OU Bouton Ajouter) */}
      <View style={styles.footerContainer}>
        {selectedRoute ? (
             <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                <View style={{flex: 1}}>
                    <View style={{flexDirection:'row', alignItems:'center', marginBottom:5}}>
                        <View style={[styles.badge, { backgroundColor: getGradeColor(selectedRoute.cotation) }]}>
                            <Text style={styles.badgeText}>{selectedRoute.cotation}</Text>
                        </View>
                        <Text style={styles.routeTitle} numberOfLines={1}>{selectedRoute.nom}</Text>
                    </View>
                    <Text style={{color:'#666', fontSize:12}}>Cliquez sur détails pour voir les commentaires</Text>
                </View>
                <TouchableOpacity style={styles.detailsBtn} onPress={() => navigation.navigate('RouteSocial', { routeData: JSON.stringify(selectedRoute), cragId: cragId })}>
                    <Text style={{color:'#fff', fontWeight:'bold'}}>Détails →</Text>
                </TouchableOpacity>
             </View>
        ) : (
             <TouchableOpacity style={styles.addRouteBtn} onPress={handleProposeRoute}>
                <Ionicons name="add-circle" size={24} color="#000" style={{marginRight: 10}}/>
                <Text style={styles.addRouteText}>Ajouter une voie ici</Text>
             </TouchableOpacity>
        )}
      </View>

      {/* --- MODALS --- */}
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} onBuy={handleBuyPremium} />
      
      <Modal visible={showListModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{flex: 1, backgroundColor: '#121212', padding: 20}}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
                <Text style={{color:'#fff', fontSize: 20, fontWeight:'bold'}}>Voies du secteur</Text>
                <TouchableOpacity onPress={() => setShowListModal(false)}><Ionicons name="close-circle" size={30} color="#666" /></TouchableOpacity>
            </View>
            <FlatList 
                data={topos[currentIndex]?.routes || []}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({item}) => (
                    <TouchableOpacity 
                        style={{flexDirection:'row', alignItems:'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333'}}
                        onPress={() => { setShowListModal(false); navigation.navigate('RouteSocial', { routeData: JSON.stringify(item), cragId: cragId }); }}
                    >
                        <Text style={{color: getGradeColor(item.cotation), fontWeight:'bold', fontSize: 16, width: 40}}>{item.cotation}</Text>
                        <Text style={{color:'#fff', fontSize: 16, flex: 1}}>{item.nom}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#666" />
                    </TouchableOpacity>
                )}
            />
        </View>
      </Modal>

    </View>
  );
}

// --- WRAPPER (Gère le lien Slider <-> ZoomView) ---
const TopoImageWrapper = ({ item, setSelectedRoute, selectedRoute, setParentScrollEnabled, zoomLevel, onZoomChange }) => {
    const [src, setSrc] = useState({ uri: item.imageUrl });
    const zoomRef = useRef(null);

    useEffect(() => { const load = async () => { const s = await AsyncStorage.getItem(`img_data_${item.id}`); if (s) setSrc({ uri: `data:image/jpeg;base64,${s}` }); }; load(); }, [item.id]);

    // Sécurité pour éviter la boucle infinie : on ne force le zoom que si la diff est réelle
    useEffect(() => {
        if (zoomRef.current) {
             // On utilise une valeur par défaut de 1 si le ref n'est pas encore prêt
             // On vérifie que la différence est > 0.1 pour éviter les boucles de micro-ajustement
             // Note: zoomRef.current.zoomLevel n'est pas toujours accessible directement selon la version,
             // mais zoomTo fonctionne toujours.
             zoomRef.current.zoomTo(zoomLevel);
        }
    }, [zoomLevel]);

    const imgHeight = item.imageHeight ? (SCREEN_WIDTH / item.imageWidth) * item.imageHeight : 500;

    return (
        <ReactNativeZoomableView 
            ref={zoomRef}
            maxZoom={3} minZoom={1} zoomStep={0.5} initialZoom={1} bindToBorders={true} doubleTapZoomToCenter={true}
            onZoomAfter={(e, g, z) => {
                onZoomChange(z.zoomLevel);
                setParentScrollEnabled(z.zoomLevel <= 1.1);
            }}
            style={{backgroundColor:'#000'}}
        >
            <View style={{ width: SCREEN_WIDTH, height: imgHeight }}>
                <Image source={src} style={{width:'100%', height:'100%', position: 'absolute', zIndex: 1}} resizeMode="contain" />
                <Svg height={imgHeight} width={SCREEN_WIDTH} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
                    <Defs>
                        {item.routes?.map((r, i) => ( <Path key={`def-${i}`} id={`path-${item.id}-${i}`} d={r.path} /> ))}
                    </Defs>
                    {item.routes?.map((r, i) => {
                        const pathId = `path-${item.id}-${i}`;
                        const isSel = selectedRoute?.id === (r.id || i);
                        const start = { x: parseFloat(r.path.split(' ')[1]), y: parseFloat(r.path.split(' ')[2]) };
                        const color = getGradeColor(r.cotation);
                        const handleTouch = () => setSelectedRoute({ ...r, id: r.id || i });

                        return (
                            <G key={i} onPressIn={handleTouch}>
                                <Path d={r.path} stroke="transparent" strokeWidth="40" fill="none" />
                                <Path d={r.path} stroke={isSel ? "#FFD700" : color} strokeWidth={isSel ? 5 : 3} fill="none" strokeLinecap="round" />
                                <SvgText fill="none" stroke="black" strokeWidth="3" fontSize="12" fontWeight="bold" dy="-5"><TextPath href={`#${pathId}`} startOffset="10%">{r.nom}</TextPath></SvgText>
                                <SvgText fill="white" fontSize="12" fontWeight="bold" dy="-5"><TextPath href={`#${pathId}`} startOffset="10%">{r.nom}</TextPath></SvgText>
                                <Circle cx={start.x} cy={start.y} r={isSel ? 11 : 9} fill="white" stroke={isSel ? "#FFD700" : color} strokeWidth={2}/>
                                <SvgText x={start.x} y={start.y + 4} fill={color} stroke="none" fontSize="10" fontWeight="bold" textAnchor="middle">{r.cotation}</SvgText>
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
  
  // HEADER
  headerPanel: { paddingTop: 50, paddingBottom: 10, paddingHorizontal: 15, backgroundColor: '#1a1a1a', zIndex: 50 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  iconBtn: { padding: 8, backgroundColor: '#333', borderRadius: 20 },
  
  // SLIDER
  sliderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', padding: 5, borderRadius: 15 },

  // FOOTER
  footerContainer: { 
      backgroundColor: '#fff', 
      padding: 15, 
      paddingBottom: 35, 
      borderTopLeftRadius: 20, 
      borderTopRightRadius: 20,
      elevation: 10
  },
  
  // BOUTONS / TEXTE
  addRouteBtn: { 
      flexDirection: 'row', backgroundColor: '#FFD700', padding: 15, borderRadius: 12, 
      justifyContent: 'center', alignItems: 'center' 
  },
  addRouteText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  
  routeTitle: { fontWeight: 'bold', fontSize: 18, color: '#333', marginRight: 10, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  badgeText: { color: '#fff', fontWeight: 'bold' },
  detailsBtn: { backgroundColor: '#333', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 }
});