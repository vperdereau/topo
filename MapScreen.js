import * as Location from 'expo-location';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS } from './constants/theme';
import { db } from './firebaseConfig';

export default function MapScreen() {
  const [sites, setSites] = useState([]);
  const [location, setLocation] = useState(null);
  
  // États pour la création
  const [newSiteCoords, setNewSiteCoords] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Charger les sites VALIDÉS uniquement
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      const q = query(collection(db, "sites"), where("status", "==", "published"));
      const snap = await getDocs(q);
      setSites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  // 2. Gestion de l'appui long pour créer un site
  const handleLongPress = (e) => {
    const coords = e.nativeEvent.coordinate;
    setNewSiteCoords(coords);
    setNewSiteName(""); // Reset
    setModalVisible(true);
  };

  // 3. Envoi de la proposition à Firebase
  const handleSubmitSite = async () => {
    if (!newSiteName.trim()) return Alert.alert("Oups", "Il faut un nom !");
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, "sites"), {
        nom: newSiteName,
        location: {
            latitude: newSiteCoords.latitude,
            longitude: newSiteCoords.longitude
        },
        status: "pending", // <--- C'est la clé ! Invisible pour les autres
        createdAt: new Date(),
        imageUrl: "", // Pas d'image pour l'instant
        routesCount: 0,
        secteursCount: 0
      });
      
      Alert.alert("Merci !", "Votre site a été soumis à validation.");
      setModalVisible(false);
      setNewSiteCoords(null);
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'envoyer la proposition.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        onLongPress={handleLongPress} // <--- L'action magique
        initialRegion={{
          latitude: 46.603354, longitude: 1.888334,
          latitudeDelta: 10, longitudeDelta: 10,
        }}
      >
        {/* Affichage des sites validés */}
        {sites.map(site => (
           <Marker 
             key={site.id}
             coordinate={site.location}
             title={site.nom}
             pinColor={COLORS.primary}
           />
        ))}

        {/* Marqueur temporaire pendant la création */}
        {newSiteCoords && (
            <Marker coordinate={newSiteCoords} pinColor="purple" />
        )}
      </MapView>

      {/* Info bulle pour guider l'user */}
      <View style={styles.tipBox}>
          <Text style={styles.tipText}>Appui long pour ajouter un site</Text>
      </View>

      {/* MODALE DE CRÉATION */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Proposer un nouveau site</Text>
                <Text style={styles.modalSub}>Ce site sera visible après validation.</Text>
                
                <TextInput 
                    style={styles.input}
                    placeholder="Nom du site (ex: Le Faron)"
                    placeholderTextColor="#666"
                    value={newSiteName}
                    onChangeText={setNewSiteName}
                    autoFocus
                />

                <View style={styles.btnRow}>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                        <Text style={{color: '#fff'}}>Annuler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSubmitSite} style={styles.submitBtn}>
                        {submitting ? <ActivityIndicator color="#000"/> : <Text style={{fontWeight:'bold'}}>Envoyer</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  
  tipBox: {
      position: 'absolute', top: 50, alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 20
  },
  tipText: { color: '#fff', fontSize: 12 },

  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  modalContent: { backgroundColor: '#1E1E1E', padding: 20, borderRadius: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  modalSub: { color: '#aaa', fontSize: 14, marginBottom: 20 },
  input: { backgroundColor: '#333', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 15 },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }
});