import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    PanResponder,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// --- Imports Locaux ---
import { db } from '../firebaseConfig';
import { GRADES } from '../utils/grades';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProposeRouteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // --- CORRECTION 1 : Récupération complète des IDs ---
  const { siteId, cragId, sectorId, topoId, imageUrl, imageWidth, imageHeight } = route.params || {};

  // Rétro-compatibilité pour l'ID du site parent
  const finalSiteId = siteId || cragId;

  // Calcul ratio image
  const imgRatio = imageWidth && imageHeight ? (imageHeight / imageWidth) : 1;
  const displayHeight = SCREEN_WIDTH * imgRatio;

  // State
  const [currentPath, setCurrentPath] = useState([]); 
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [height, setHeight] = useState('');
  const [quickdraws, setQuickdraws] = useState(''); 

  // --- Gestion du Tracé ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
      },
    })
  ).current;

  const pointsToSvgPath = (points) => {
    if (points.length === 0) return '';
    const start = points[0];
    let d = `M ${start.x} ${start.y}`;
    points.slice(1).forEach(p => d += ` L ${p.x} ${p.y}`);
    return d;
  };

  const handleUndo = () => setCurrentPath([]); 

  // --- Envoi à Firebase ---
  const submitProposal = async () => {
    if (currentPath.length < 5) return Alert.alert("Tracez une voie", "Veuillez tracer la ligne sur la photo.");
    if (!name.trim()) return Alert.alert("Nom manquant", "Veuillez donner un nom à la voie.");
    if (!grade) return Alert.alert("Cotation manquante", "Veuillez sélectionner une cotation.");

    setSending(true);
    try {
      const pathString = pointsToSvgPath(currentPath);

      // --- CORRECTION 2 : Envoi des IDs hiérarchiques ---
      await addDoc(collection(db, "pending_routes"), {
        // IDs indispensables pour l'Admin
        siteId: finalSiteId,
        sectorId: sectorId, 
        topoId: topoId,
        
        imageUrl: imageUrl,
        nom: name.trim(),
        cotation: grade,
        path: pathString,
        height: height ? parseInt(height) : null,
        quickdraws: quickdraws ? parseInt(quickdraws) : null,
        
        createdAt: serverTimestamp(),
        status: 'pending',
        imageDimensions: { width: SCREEN_WIDTH, height: displayHeight }
      });

      Alert.alert(
        "Proposition envoyée !", 
        "Merci pour ta contribution. Elle sera validée par un modérateur bientôt.",
        [{ text: "Super", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible d'envoyer la proposition. Vérifiez votre connexion.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding:5}}>
            <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle Voie</Text>
        <View style={{width: 28}} />
      </View>

      {/* Zone Image Tracé */}
      <View style={styles.imageContainer}>
          <View 
            style={{ width: SCREEN_WIDTH, height: displayHeight }} 
            {...panResponder.panHandlers}
          >
            <Image 
                source={{ uri: imageUrl }} 
                style={{ width: '100%', height: '100%', position: 'absolute' }} 
                resizeMode="contain" 
            />
            <Svg height={displayHeight} width={SCREEN_WIDTH} style={StyleSheet.absoluteFill}>
                <Path d={pointsToSvgPath(currentPath)} stroke="#FFD700" strokeWidth="4" fill="none" strokeLinecap="round" strokeJoin="round"/>
                {currentPath.length > 0 && (
                    <Circle cx={currentPath[0].x} cy={currentPath[0].y} r={6} fill="red" stroke="#fff" strokeWidth={2}/>
                )}
            </Svg>
          </View>
          
          {currentPath.length === 0 && (
              <View style={styles.instructionOverlay}>
                  <Text style={styles.instructionText}>👆 Tracez la ligne avec votre doigt</Text>
              </View>
          )}
      </View>

      {/* Formulaire */}
      <View style={styles.formContainer}>
        
        {/* Ligne 1 : Nom + Cotation */}
        <View style={styles.inputRow}>
            <TextInput 
                style={[styles.input, { flex: 2 }]} 
                placeholder="Nom de la voie" 
                placeholderTextColor="#999"
                value={name} 
                onChangeText={setName} 
            />
            <TouchableOpacity 
                style={[styles.input, { flex: 1, marginLeft: 10, justifyContent:'center', alignItems:'center' }]} 
                onPress={() => setShowGradeModal(true)}
            >
                <Text style={{ color: grade ? '#fff' : '#999', fontWeight: grade ? 'bold' : 'normal' }}>
                    {grade || "Cotation"}
                </Text>
                <Ionicons name="caret-down" size={14} color="#666" style={{position:'absolute', right:10}}/>
            </TouchableOpacity>
        </View>

        {/* Ligne 2 : Hauteur + Dégaines */}
        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 20}}>
            <View style={{width:'48%'}}>
                <Text style={{color:'#bbb', fontSize:12, marginBottom:5, marginLeft:2}}>Hauteur (m)</Text>
                <TextInput 
                    style={styles.smallInput}
                    placeholder="Ex: 25" 
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                />
            </View>
            <View style={{width:'48%'}}>
                <Text style={{color:'#bbb', fontSize:12, marginBottom:5, marginLeft:2}}>Nb Dégaines</Text>
                <TextInput 
                    style={styles.smallInput}
                    placeholder="Ex: 12" 
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={quickdraws}
                    onChangeText={setQuickdraws}
                />
            </View>
        </View>

        {/* Boutons Action */}
        <View style={styles.btnRow}>
            <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
                <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={submitProposal} style={styles.submitBtn} disabled={sending}>
                {sending ? (
                    <ActivityIndicator color="#fff"/>
                ) : (
                    <Text style={styles.submitText}>Envoyer la proposition</Text>
                )}
            </TouchableOpacity>
        </View>
      </View>

      {/* Modal Cotation */}
      <Modal visible={showGradeModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:15}}>
                    <Text style={styles.modalTitle}>Choisir la difficulté</Text>
                    <TouchableOpacity onPress={() => setShowGradeModal(false)}>
                        <Ionicons name="close-circle" size={28} color="#666" />
                    </TouchableOpacity>
                </View>
                
                <FlatList 
                    data={GRADES} 
                    keyExtractor={item => item}
                    numColumns={4}
                    contentContainerStyle={{paddingBottom: 20}}
                    renderItem={({item}) => (
                        <TouchableOpacity 
                            style={[styles.gradeItem, grade === item && styles.gradeItemActive]} 
                            onPress={() => { setGrade(item); setShowGradeModal(false); }}
                        >
                            <Text style={[styles.gradeText, grade === item && {color:'#000'}]}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
      paddingTop: 50, paddingBottom: 10, paddingHorizontal: 20, backgroundColor: '#1a1a1a', zIndex: 10 
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor:'#111' },
  instructionOverlay: { position: 'absolute', top: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 },
  instructionText: { color: '#fff' },

  formContainer: { 
      backgroundColor: '#1a1a1a', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40
  },
  inputRow: { flexDirection: 'row', marginBottom: 15 },
  input: { 
      backgroundColor: '#333', borderRadius: 10, padding: 15, color: '#fff', fontSize: 16 
  },
  smallInput: {
      backgroundColor:'#333', color:'#fff', padding:12, borderRadius:8, fontSize:16
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  undoBtn: { 
      backgroundColor: '#444', width: 50, height: 50, borderRadius: 25, 
      justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  submitBtn: { 
      flex: 1, backgroundColor: '#FFD700', height: 50, borderRadius: 25, 
      justifyContent: 'center', alignItems: 'center' 
  },
  submitText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { backgroundColor: '#222', height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gradeItem: { 
      flex: 1, margin: 5, paddingVertical: 12, backgroundColor: '#333', borderRadius: 8, alignItems: 'center' 
  },
  gradeItemActive: { backgroundColor: '#FFD700' },
  gradeText: { color: '#fff', fontWeight: 'bold' }
});