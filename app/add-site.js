import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'; // <--- Import Map
import { db } from '../firebaseConfig';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Région par défaut (France) si pas de GPS
const DEFAULT_REGION = {
    latitude: 46.603354, longitude: 1.888334, latitudeDelta: 5, longitudeDelta: 5,
};

export default function AddSiteScreen() {
  const router = useRouter();
  
  // Form Data
  const [name, setName] = useState('');
  const [type, setType] = useState('falaise');
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  
  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);

  // 1. GÉOLOCALISATION AUTOMATIQUE (Bouton "Ma position")
  const handleLocate = async () => {
    setLocating(true);
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission refusée", "Activez la localisation dans les réglages.");
            return;
        }
        let location = await Location.getCurrentPositionAsync({});
        const newCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
        };
        
        // On met à jour les champs textes
        setCoords({
            lat: newCoords.latitude.toString(),
            lng: newCoords.longitude.toString()
        });
        
        // On met aussi à jour la région de la carte pour la prochaine ouverture
        setMapRegion(newCoords);

    } catch (e) {
        Alert.alert("Erreur", "Impossible de vous localiser.");
    } finally {
        setLocating(false);
    }
  };

  // 2. OUVERTURE DE LA CARTE (Bouton "Choisir sur la carte")
  const openMapPicker = async () => {
      // Si on a déjà des coords, on centre dessus
      if (coords.lat && coords.lng) {
          setMapRegion({
              latitude: parseFloat(coords.lat),
              longitude: parseFloat(coords.lng),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01
          });
      } else {
          // Sinon on essaie de centrer sur l'utilisateur sans forcer l'écriture
          try {
              let { status } = await Location.getForegroundPermissionsAsync();
              if (status === 'granted') {
                  let location = await Location.getCurrentPositionAsync({});
                  setMapRegion({
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                      latitudeDelta: 0.5, longitudeDelta: 0.5
                  });
              }
          } catch(e) {}
      }
      setShowMapPicker(true);
  };

  // 3. VALIDATION DE LA POSITION CARTE
  const confirmMapLocation = () => {
      setCoords({
          lat: mapRegion.latitude.toFixed(6), // 6 décimales suffisent pour 10cm de précision
          lng: mapRegion.longitude.toFixed(6)
      });
      setShowMapPicker(false);
  };


const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Erreur', 'Le nom est obligatoire');
    if (!coords.lat || !coords.lng) return Alert.alert('Erreur', 'La localisation est obligatoire');

    setLoading(true);
    try {
      // CHANGEMENT ICI : On envoie dans 'pending_sites'
      await addDoc(collection(db, "pending_sites"), {
        nom: name.trim(),
        type: type, 
        location: {
            latitude: parseFloat(coords.lat),
            longitude: parseFloat(coords.lng)
        },
        lat: parseFloat(coords.lat),
        lng: parseFloat(coords.lng),
        createdAt: serverTimestamp(),
        routesCount: 0,
        status: 'pending' // En attente
      });
      
      Alert.alert(
          "Proposition envoyée", 
          "Votre site sera visible une fois validé par un administrateur."
      );
      router.back();
    } catch (e) {
      Alert.alert("Erreur", e.message);
    } finally {
      setLoading(false);
    }
};

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau Site</Text>
        <View style={{width: 28}} />
      </View>

      <View style={styles.form}>
        
        {/* NOM */}
        <Text style={styles.label}>Nom du site</Text>
        <TextInput 
            placeholder="Ex: Fontainebleau, Céüse..." 
            placeholderTextColor="#666" 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
        />
        
        {/* TYPE */}
        <Text style={styles.label}>Type de grimpe</Text>
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

        {/* LOCALISATION */}
        <Text style={styles.label}>Localisation</Text>
        
        {/* Affichage des coordonnées (Lecture seule ou modifiable) */}
        <View style={{flexDirection:'row', gap: 10, marginBottom: 15}}>
            <TextInput placeholder="Latitude" placeholderTextColor="#666" style={[styles.input, {flex:1, marginBottom:0, backgroundColor:'#2a2a2a'}]} value={coords.lat} editable={false} />
            <TextInput placeholder="Longitude" placeholderTextColor="#666" style={[styles.input, {flex:1, marginBottom:0, backgroundColor:'#2a2a2a'}]} value={coords.lng} editable={false} />
        </View>
        
        {/* Boutons de Choix */}
        <View style={{flexDirection:'row', gap: 10, marginBottom: 30}}>
            <TouchableOpacity style={styles.geoBtn} onPress={handleLocate} disabled={locating}>
                {locating ? <ActivityIndicator color="#fff"/> : <Ionicons name="navigate" size={20} color="#fff"/>}
                <Text style={styles.geoBtnText}>Ma position</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.geoBtn, {backgroundColor: '#FFD700'}]} onPress={openMapPicker}>
                <Ionicons name="map" size={20} color="#000"/>
                <Text style={[styles.geoBtnText, {color:'#000'}]}>Choisir sur carte</Text>
            </TouchableOpacity>
        </View>

        {/* Validation */}
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#000"/> : <Text style={styles.createBtnText}>Créer le Site</Text>}
        </TouchableOpacity>
      </View>

      {/* --- MODAL MAP PICKER --- */}
      <Modal visible={showMapPicker} animationType="slide">
          <View style={{flex: 1}}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={{flex: 1}}
                mapType="hybrid"
                region={mapRegion}
                onRegionChangeComplete={(region) => setMapRegion(region)} // Capture le centre quand on bouge
              />
              
              {/* VISEUR CENTRAL (Positionné en absolu au milieu) */}
              <View style={styles.centerMarkerContainer}>
                  <Ionicons name="add" size={40} color="#FFD700" style={{ marginBottom: -3 }} /> 
                  <View style={styles.markerDot} />
              </View>

              {/* Header Modal */}
              <View style={styles.mapHeader}>
                  <Text style={{color:'#fff', fontWeight:'bold', textShadowColor:'black', textShadowRadius:5}}>Déplacez la carte pour viser</Text>
                  <TouchableOpacity onPress={() => setShowMapPicker(false)} style={styles.closeMapBtn}>
                      <Ionicons name="close" size={24} color="#000"/>
                  </TouchableOpacity>
              </View>

              {/* Bouton Validation Modal */}
              <View style={styles.mapFooter}>
                  <TouchableOpacity style={styles.confirmMapBtn} onPress={confirmMapLocation}>
                      <Text style={styles.confirmMapText}>Valider cette position</Text>
                  </TouchableOpacity>
              </View>
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
  
  typeRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  typeBtn: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#333', alignItems: 'center', flexDirection:'row', justifyContent:'center', gap: 8 },
  typeBtnActive: { backgroundColor: '#FFD700' },
  typeText: { color: '#fff', fontWeight: 'bold' },
  
  geoBtn: { flex: 1, backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', flexDirection:'row', justifyContent:'center', gap: 8, borderWidth:1, borderColor:'#444' },
  geoBtnText: { color:'#fff', fontWeight:'bold' },
  
  createBtn: { backgroundColor: '#FFD700', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  createBtnText: { fontWeight: 'bold', fontSize: 16, color: '#000' },

  // Styles de la Map Modal
  centerMarkerContainer: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' // Important pour laisser passer le touch
  },
  markerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'red', marginTop: -20 },
  
  mapHeader: {
      position: 'absolute', top: 50, left: 20, right: 20, 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  closeMapBtn: { backgroundColor: '#fff', borderRadius: 20, padding: 5 },
  
  mapFooter: {
      position: 'absolute', bottom: 40, left: 20, right: 20, alignItems: 'center'
  },
  confirmMapBtn: {
      backgroundColor: '#FFD700', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30,
      elevation: 5, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.3
  },
  confirmMapText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});