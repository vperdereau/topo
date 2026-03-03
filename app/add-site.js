import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // <--- ImagePicker
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'; // <--- Storage
import { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'; // <--- Ajout Image, ScrollView
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { db, storage } from '../firebaseConfig'; // <--- Storage

const SCREEN_HEIGHT = Dimensions.get('window').height;

const DEFAULT_REGION = {
    latitude: 46.603354, longitude: 1.888334, latitudeDelta: 5, longitudeDelta: 5,
};

export default function AddSiteScreen() {
  const router = useRouter();
  
  // Data
  const [name, setName] = useState('');
  const [type, setType] = useState('falaise');
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [image, setImage] = useState(null); // <--- State Image

  // UI States
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);

  // --- 1. GESTION IMAGE ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Format paysage mieux pour un site
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const uploadImageToStorage = async (uri) => {
    return new Promise(async (resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(xhr.response); };
        xhr.onerror = function () { reject(new TypeError("Echec conversion image")); };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      } catch (e) { reject(e); }
    }).then(async (blob) => {
        const filename = `sites/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    });
  };

  // --- 2. LOGIQUE EXISTANTE (GEOLOC) ---
  const handleLocate = async () => { /* ... Code inchangé ... */
    setLocating(true);
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Erreur", "Permission refusée");
        let location = await Location.getCurrentPositionAsync({});
        setCoords({ lat: location.coords.latitude.toString(), lng: location.coords.longitude.toString() });
        setMapRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    } catch (e) { Alert.alert("Erreur", "Impossible de vous localiser."); } 
    finally { setLocating(false); }
  };

  const openMapPicker = async () => { setShowMapPicker(true); };
  const confirmMapLocation = () => {
      setCoords({ lat: mapRegion.latitude.toFixed(6), lng: mapRegion.longitude.toFixed(6) });
      setShowMapPicker(false);
  };

  // --- 3. CREATION (Avec Image) ---
  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Erreur', 'Nom obligatoire');
    if (!coords.lat) return Alert.alert('Erreur', 'Localisation obligatoire');

    setLoading(true);
    try {
      let downloadUrl = null;
      if (image) {
          downloadUrl = await uploadImageToStorage(image.uri);
      }

      await addDoc(collection(db, "pending_sites"), {
        nom: name.trim(),
        type: type, 
        imageUrl: downloadUrl, // <--- On ajoute l'URL
        location: { latitude: parseFloat(coords.lat), longitude: parseFloat(coords.lng) },
        lat: parseFloat(coords.lat),
        lng: parseFloat(coords.lng),
        createdAt: serverTimestamp(),
        routesCount: 0,
        status: 'pending'
      });
      
      Alert.alert("Envoyé", "Site en attente de validation.");
      router.back();
    } catch (e) { Alert.alert("Erreur", e.message); } 
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau Site</Text>
        <View style={{width: 28}} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        
        {/* PICKER IMAGE */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
                <Image source={{ uri: image.uri }} style={{ width: '100%', height: '100%' }} />
            ) : (
                <View style={{alignItems:'center'}}>
                    <Ionicons name="camera" size={40} color="#666" />
                    <Text style={{color:'#666', marginTop:5}}>Ajouter une photo (Optionnel)</Text>
                </View>
            )}
        </TouchableOpacity>

        <Text style={styles.label}>Nom du site</Text>
        <TextInput placeholder="Ex: Fontainebleau..." placeholderTextColor="#666" style={styles.input} value={name} onChangeText={setName} />
        
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
            <TouchableOpacity onPress={() => setType('falaise')} style={[styles.typeBtn, type === 'falaise' && styles.typeBtnActive]}>
                <Ionicons name="stats-chart" size={20} color={type === 'falaise' ? '#000' : '#fff'} />
                <Text style={[styles.typeText, type === 'falaise' && {color:'#000'}]}>Falaise</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setType('bloc')} style={[styles.typeBtn, type === 'bloc' && styles.typeBtnActive]}>
                <Ionicons name="cube" size={20} color={type === 'bloc' ? '#000' : '#fff'} />
                <Text style={[styles.typeText, type === 'bloc' && {color:'#000'}]}>Bloc</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.label}>Localisation</Text>
        <View style={{flexDirection:'row', gap: 10, marginBottom: 15}}>
            <TextInput style={[styles.input, {flex:1, backgroundColor:'#2a2a2a'}]} value={coords.lat} editable={false} placeholder="Lat" placeholderTextColor="#666"/>
            <TextInput style={[styles.input, {flex:1, backgroundColor:'#2a2a2a'}]} value={coords.lng} editable={false} placeholder="Lng" placeholderTextColor="#666"/>
        </View>
        
        <View style={{flexDirection:'row', gap: 10, marginBottom: 30}}>
            <TouchableOpacity style={styles.geoBtn} onPress={handleLocate} disabled={locating}>
                {locating ? <ActivityIndicator color="#fff"/> : <Ionicons name="navigate" size={20} color="#fff"/>}
                <Text style={styles.geoBtnText}>Ma position</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.geoBtn, {backgroundColor: '#FFD700'}]} onPress={openMapPicker}>
                <Ionicons name="map" size={20} color="#000"/>
                <Text style={[styles.geoBtnText, {color:'#000'}]}>Carte</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#000"/> : <Text style={styles.createBtnText}>Envoyer le Site</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL MAP (Inchangée) */}
      <Modal visible={showMapPicker} animationType="slide">
          <View style={{flex: 1}}>
              <MapView provider={PROVIDER_GOOGLE} style={{flex: 1}} mapType="hybrid" region={mapRegion} onRegionChangeComplete={setMapRegion} />
              <View style={styles.centerMarker}><Ionicons name="add" size={40} color="#FFD700" style={{marginBottom:-3}}/><View style={{width:4, height:4, borderRadius:2, backgroundColor:'red', marginTop:-20}}/></View>
              <TouchableOpacity style={styles.confirmMapBtn} onPress={confirmMapLocation}><Text style={styles.confirmMapText}>Valider cette position</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMapPicker(false)} style={styles.closeMapBtn}><Ionicons name="close" size={24} color="#000"/></TouchableOpacity>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#1a1a1a' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  form: { padding: 20 },
  label: { color: '#ccc', marginBottom: 8, fontWeight:'bold', marginTop: 10 },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  imagePicker: { width:'100%', height: 200, backgroundColor:'#222', borderRadius:10, justifyContent:'center', alignItems:'center', marginBottom:20, overflow:'hidden', borderWidth:1, borderColor:'#333', borderStyle:'dashed' },
  typeRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  typeBtn: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#333', alignItems: 'center', flexDirection:'row', justifyContent:'center', gap: 8 },
  typeBtnActive: { backgroundColor: '#FFD700' },
  typeText: { color: '#fff', fontWeight: 'bold' },
  geoBtn: { flex: 1, backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', flexDirection:'row', justifyContent:'center', gap: 8, borderWidth:1, borderColor:'#444' },
  geoBtnText: { color:'#fff', fontWeight:'bold' },
  createBtn: { backgroundColor: '#FFD700', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  createBtnText: { fontWeight: 'bold', fontSize: 16, color: '#000' },
  // Map styles simplifiés
  centerMarker: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' },
  confirmMapBtn: { position: 'absolute', bottom: 40, alignSelf:'center', backgroundColor: '#FFD700', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  confirmMapText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  closeMapBtn: { position:'absolute', top:50, right:20, backgroundColor:'#fff', borderRadius:20, padding:5 }
});