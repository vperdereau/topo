import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal, // 👈 Ajout Import
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
// On garde l'alias SvgText pour le texte dans le SVG
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { db } from '../../../firebaseConfig';
import { GRADES } from '../../../utils/grades'; // 👈 Import de la liste

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TopoEditor() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cragId, topoDataJson } = params;
  const storage = getStorage();

  const [topoId, setTopoId] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [points, setPoints] = useState([]);
  const [oldRoutes, setOldRoutes] = useState([]); 
  const [imgRatio, setImgRatio] = useState(1.33); 
  
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Champs formulaire
  const [routeName, setRouteName] = useState('');
  const [routeGrade, setRouteGrade] = useState('');
  
  // 👇 NOUVEAU : État pour afficher/masquer la liste des cotations
  const [showGradeModal, setShowGradeModal] = useState(false);

  // --- INITIALISATION ---
  useEffect(() => {
    if (topoDataJson) {
        try {
            const data = JSON.parse(topoDataJson);
            if (data.id) setTopoId(data.id);
            if (data.imageUrl) {
                let fixedUrl = data.imageUrl;
                if (fixedUrl.includes('/o/topos/')) fixedUrl = fixedUrl.replace('/o/topos/', '/o/topos%2F');
                setImageUri(fixedUrl);
                Image.getSize(fixedUrl, (w, h) => setImgRatio(h / w));
            }
            if (data.routes) setOldRoutes(data.routes);
        } catch (e) { console.error(e); }
    }
  }, [topoDataJson]);

  // Helper SVG Start Point
  const getStartPoint = (pathData) => {
    if (!pathData) return { x: 0, y: 0 };
    const parts = pathData.split(' ');
    return { x: parseFloat(parts[1]), y: parseFloat(parts[2]) };
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImgRatio(asset.height / asset.width);
      setPoints([]);
      setOldRoutes([]); 
    }
  };

  const handlePress = (evt) => {
    if (!imageUri || showForm) return; 
    const { locationX, locationY } = evt.nativeEvent;
    setPoints([...points, { x: Math.round(locationX), y: Math.round(locationY) }]);
  };

  const handleUndo = () => setPoints(points.slice(0, -1));
  const handleNext = () => {
    if (points.length < 2) return Alert.alert("Attention", "Trace une ligne d'abord !");
    setShowForm(true);
  };

  const saveTopo = async () => {
    if (!routeName || !routeGrade) return Alert.alert("Erreur", "Remplis le nom et la cotation");

    setUploading(true);
    try {
        const pathSvg = points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
        const newRouteObject = {
            id: Date.now().toString(),
            nom: routeName,
            cotation: routeGrade,
            path: pathSvg,
            createdAt: new Date().toISOString()
        };

        let finalImageUrl = imageUri;
        if (imageUri.startsWith('file://')) {
             const blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = () => resolve(xhr.response);
                xhr.onerror = () => reject(new TypeError("Network request failed"));
                xhr.responseType = "blob";
                xhr.open("GET", imageUri, true);
                xhr.send(null);
            });
            const filename = `topos/${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            finalImageUrl = await getDownloadURL(storageRef);
        }

        if (topoId) {
            await updateDoc(doc(db, "secteurs", cragId, "topos", topoId), { routes: arrayUnion(newRouteObject) });
        } else {
            await addDoc(collection(db, "secteurs", cragId, "topos"), {
                imageUrl: finalImageUrl,
                imageWidth: SCREEN_WIDTH,
                imageHeight: SCREEN_WIDTH * imgRatio,
                routes: [newRouteObject],
                createdAt: serverTimestamp()
            });
        }
        Alert.alert("Succès !", "Le topo a été mis à jour.");
        router.back(); 
    } catch (error) {
        console.error("Erreur save:", error);
        Alert.alert("Erreur", "Sauvegarde échouée");
    } finally {
        setUploading(false);
    }
  };

  const displayHeight = SCREEN_WIDTH * imgRatio;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backLink}>Annuler</Text></TouchableOpacity>
        <Text style={{color:'#fff', fontWeight:'bold'}}>{topoId ? "Ajouter une voie" : "Nouveau Topo"}</Text>
        <TouchableOpacity onPress={handleNext}><Text style={styles.saveLink}>Suivant</Text></TouchableOpacity>
      </View>

      {/* ZONE DE TRAVAIL */}
      <View style={styles.workArea}>
        {imageUri ? (
            <TouchableOpacity activeOpacity={1} onPress={handlePress} style={{ width: SCREEN_WIDTH, height: displayHeight, justifyContent: 'center', alignItems: 'center' }}>
                <Image source={{ uri: imageUri }} style={{ width: SCREEN_WIDTH, height: displayHeight, backgroundColor: '#333', position: 'absolute', zIndex: 1 }} resizeMode="contain" />
                
                <Svg height={displayHeight} width={SCREEN_WIDTH} style={{ position: 'absolute', zIndex: 2, top: 0, left: 0 }} pointerEvents="none">
                    {/* Anciennes voies */}
                    {oldRoutes.map((r, i) => {
                        const start = getStartPoint(r.path);
                        return (
                            <React.Fragment key={i}>
                                <Path d={r.path} stroke="rgba(255,255,255,0.6)" strokeWidth="3" fill="none" strokeDasharray={[5, 5]}/>
                                <SvgText x={start.x} y={start.y - 10} fill="none" stroke="black" strokeWidth="3" fontSize="14" fontWeight="bold" textAnchor="middle">{`${r.cotation} - ${r.nom}`}</SvgText>
                                <SvgText x={start.x} y={start.y - 10} fill="white" stroke="none" fontSize="14" fontWeight="bold" textAnchor="middle">{`${r.cotation} - ${r.nom}`}</SvgText>
                                <Circle cx={start.x} cy={start.y} r={4} fill="rgba(255,255,255,0.8)" />
                            </React.Fragment>
                        );
                    })}
                    {/* Tracé en cours */}
                    <Path d={points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')} stroke="#FF3B30" strokeWidth="4" fill="none" />
                    {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={4} fill="yellow" />)}
                </Svg>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity onPress={pickImage} style={styles.btnPick}><Text style={{color:'#007AFF', fontSize:18}}>+ Prendre / Choisir une photo</Text></TouchableOpacity>
        )}
      </View>

      {/* FOOTER OUTILS */}
      {!showForm && (
          <View style={styles.footer}>
              <Text style={{color:'#ccc'}}>{points.length} pts</Text>
              <TouchableOpacity onPress={handleUndo} style={styles.btnTool}><Text style={styles.toolText}>↩ Effacer dernier point</Text></TouchableOpacity>
          </View>
      )}

      {/* FORMULAIRE DE FIN */}
      {showForm && (
          <View style={styles.formOverlay}>
              <Text style={styles.formTitle}>Infos de la nouvelle voie</Text>
              
              <TextInput 
                  style={styles.input} 
                  placeholder="Nom (ex: La Directe)" 
                  value={routeName} 
                  onChangeText={setRouteName} 
              />
              
              {/* 👇 REMPLACEMENT DU TEXTINPUT PAR UN SELECTEUR */}
              <TouchableOpacity 
                  style={styles.inputSelector} 
                  onPress={() => setShowGradeModal(true)}
              >
                  <Text style={{ fontSize:16, color: routeGrade ? '#000' : '#999' }}>
                      {routeGrade || "Sélectionner la cotation (ex: 6a)"}
                  </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.btnSave} onPress={saveTopo} disabled={uploading}>
                  {uploading ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold'}}>ENREGISTRER LA VOIE</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setShowForm(false)} style={{marginTop:15, alignSelf:'center'}}>
                  <Text style={{color:'#666'}}>Retour au tracé</Text>
              </TouchableOpacity>
          </View>
      )}

      {/* 👇 MODAL DE SÉLECTION DE COTATION */}
      <Modal visible={showGradeModal} animationType="slide" transparent={true} onRequestClose={() => setShowGradeModal(false)}>
          <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Choisir la cotation</Text>
                  <FlatList 
                      data={GRADES}
                      keyExtractor={item => item}
                      numColumns={4} // Affichage en grille
                      renderItem={({item}) => (
                          <TouchableOpacity 
                              style={[styles.gradeItem, routeGrade === item && styles.gradeItemActive]} 
                              onPress={() => {
                                  setRouteGrade(item);
                                  setShowGradeModal(false);
                              }}
                          >
                              <Text style={[styles.gradeText, routeGrade === item && {color:'#fff'}]}>{item}</Text>
                          </TouchableOpacity>
                      )}
                  />
                  <TouchableOpacity onPress={() => setShowGradeModal(false)} style={styles.modalCloseBtn}>
                      <Text style={{color:'#FF3B30', fontSize:16}}>Annuler</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { height: 90, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#222' },
  backLink: { color: '#fff' },
  saveLink: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },
  workArea: { flex: 1, justifyContent: 'center' },
  btnPick: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignSelf:'center' },
  footer: { height: 60, backgroundColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  btnTool: { backgroundColor: '#444', padding: 10, borderRadius: 5 },
  toolText: { color: '#fff', fontWeight:'bold' },
  
  // Formulaire
  formOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 10, fontSize:16 },
  
  // Style du sélecteur (imite l'input)
  inputSelector: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 10, justifyContent:'center' },
  
  btnSave: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },

  // Styles Modal Cotations
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  gradeItem: { flex: 1, margin: 5, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8, alignItems: 'center' },
  gradeItemActive: { backgroundColor: '#007AFF' },
  gradeText: { fontWeight: 'bold', fontSize: 16 },
  modalCloseBtn: { marginTop: 20, padding: 10, alignItems: 'center', backgroundColor:'#f9f9f9', borderRadius:10 }
});