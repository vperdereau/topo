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
import { db } from '../firebaseConfig'; // Vérifie le chemin !
import { GRADES } from '../utils/grades'; // Vérifie le chemin !

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProposeRouteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Récupération des paramètres passés depuis TopoScreen
  const { cragId, topoId, imageUrl, imageWidth, imageHeight } = route.params;

  // Calcul de la hauteur d'affichage (Même logique que TopoScreen pour aligner le tracé)
  const imgRatio = imageWidth && imageHeight ? (imageHeight / imageWidth) : 1;
  const displayHeight = SCREEN_WIDTH * imgRatio;

  // State
  const [currentPath, setCurrentPath] = useState([]); 
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [sending, setSending] = useState(false);

  // --- Gestion du Tracé (Tactile) ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        // On commence un nouveau tracé
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        // On ajoute les points
        setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
      },
    })
  ).current;

  // Conversion points -> SVG Path "d"
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

      // Création dans une collection temporaire "pending_routes"
      await addDoc(collection(db, "pending_routes"), {
        cragId,
        topoId,
        imageUrl: imageUrl,
        nom: name.trim(),
        cotation: grade,
        path: pathString,
        createdAt: serverTimestamp(),
        status: 'pending', // Statut pour l'admin
        imageDimensions: { width: SCREEN_WIDTH, height: displayHeight } // Pour référence
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
      
      {/* Header Simple */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle Voie</Text>
        <View style={{width: 28}} />
      </View>

      {/* Zone de Tracé */}
      <View style={styles.imageContainer}>
          <View 
            style={{ width: SCREEN_WIDTH, height: displayHeight }} 
            {...panResponder.panHandlers}
          >
            {/* Image de fond */}
            <Image 
                source={{ uri: imageUrl }} 
                style={{ width: '100%', height: '100%', position: 'absolute' }} 
                resizeMode="contain" 
            />
            
            {/* Calque SVG pour dessiner */}
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

      {/* Formulaire au bas */}
      <View style={styles.formContainer}>
        <View style={styles.inputRow}>
            <TextInput 
                style={[styles.input, { flex: 2 }]} 
                placeholder="Nom de la voie" 
                placeholderTextColor="#999"
                value={name} 
                onChangeText={setName} 
            />
            <TouchableOpacity 
                style={[styles.input, { flex: 1, marginLeft: 10, justifyContent:'center' }]} 
                onPress={() => setShowGradeModal(true)}
            >
                <Text style={{ color: grade ? '#fff' : '#999', fontWeight: grade ? 'bold' : 'normal' }}>
                    {grade || "Cotation"}
                </Text>
                <Ionicons name="caret-down" size={14} color="#666" style={{position:'absolute', right:10}}/>
            </TouchableOpacity>
        </View>

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

      {/* Modal Sélection Cotation */}
      <Modal visible={showGradeModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Choisir la difficulté</Text>
                <FlatList 
                    data={GRADES} // Assure-toi d'avoir importé ta liste (['3a', '3b', ...])
                    keyExtractor={item => item}
                    numColumns={4}
                    renderItem={({item}) => (
                        <TouchableOpacity 
                            style={[styles.gradeItem, grade === item && styles.gradeItemActive]} 
                            onPress={() => { setGrade(item); setShowGradeModal(false); }}
                        >
                            <Text style={[styles.gradeText, grade === item && {color:'#000'}]}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
                <TouchableOpacity onPress={() => setShowGradeModal(false)} style={styles.closeModalBtn}>
                    <Text style={{color:'#ff4444', fontSize:16}}>Annuler</Text>
                </TouchableOpacity>
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
      paddingTop: 50, paddingBottom: 10, paddingHorizontal: 20, backgroundColor: '#1a1a1a' 
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  instructionOverlay: { position: 'absolute', top: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 },
  instructionText: { color: '#fff' },

  formContainer: { 
      backgroundColor: '#1a1a1a', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 
  },
  inputRow: { flexDirection: 'row', marginBottom: 20 },
  input: { 
      backgroundColor: '#333', borderRadius: 8, padding: 15, color: '#fff', fontSize: 16 
  },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
  undoBtn: { 
      backgroundColor: '#444', width: 50, height: 50, borderRadius: 25, 
      justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  submitBtn: { 
      flex: 1, backgroundColor: '#007AFF', height: 50, borderRadius: 25, 
      justifyContent: 'center', alignItems: 'center' 
  },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { backgroundColor: '#222', height: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  gradeItem: { 
      flex: 1, margin: 5, padding: 10, backgroundColor: '#333', borderRadius: 8, alignItems: 'center' 
  },
  gradeItemActive: { backgroundColor: '#FFD700' },
  gradeText: { color: '#fff', fontWeight: 'bold' },
  closeModalBtn: { marginTop: 20, alignItems: 'center', padding: 10 }
});