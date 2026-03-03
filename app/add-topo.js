import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { db, storage } from '../firebaseConfig';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AddTopoScreen() {
  const router = useRouter();
  // Récupération des paramètres
  const { siteId, sectorId, sectorName } = useLocalSearchParams();

  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // 1. Choisir une image
  const pickImage = async () => {
    try {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, // Ouvre l'éditeur du téléphone (crop)
          aspect: [3, 4],      // Format portrait recommandé pour les topos
          quality: 0.8,
        });

        if (!result.canceled) {
          setImage(result.assets[0]);
        }
    } catch (e) {
        Alert.alert("Erreur", "Impossible d'ouvrir la galerie");
    }
  };

  // 2. Uploader vers Firebase Storage
  const uploadImageToStorage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `topos/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  // 3. Envoyer la demande
  const handleUpload = async () => {
    if (!image) return Alert.alert("Erreur", "Veuillez sélectionner une image.");

    setUploading(true);
    try {
      // A. Upload physique
      const downloadUrl = await uploadImageToStorage(image.uri);

      // B. Création doc en attente
      await addDoc(collection(db, "pending_topos"), {
        siteId,
        sectorId,
        sectorName: sectorName || "Inconnu",
        imageUrl: downloadUrl,
        imageWidth: image.width,
        imageHeight: image.height,
        routes: [],
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      Alert.alert(
          "Envoyé !", 
          "Le topo a été envoyé à la modération.",
          [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Echec de l'envoi : " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajouter un Topo</Text>
        <View style={{width: 28}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitle}>
              Secteur : <Text style={{fontWeight:'bold', color:'#fff'}}>{sectorName}</Text>
          </Text>

          {image ? (
              // --- CAS 1 : IMAGE SÉLECTIONNÉE ---
              <View style={styles.previewContainer}>
                  <Image 
                    source={{ uri: image.uri }} 
                    style={styles.previewImage} 
                    resizeMode="contain" 
                  />
                  
                  <View style={styles.actionsRow}>
                      <TouchableOpacity onPress={pickImage} style={styles.changeBtn}>
                          <Ionicons name="refresh" size={20} color="#fff" />
                          <Text style={styles.changeBtnText}>Changer</Text>
                      </TouchableOpacity>
                  </View>

                  {/* BOUTON VALIDER BIEN VISIBLE */}
                  <TouchableOpacity 
                    style={styles.validateBtn} 
                    onPress={handleUpload} 
                    disabled={uploading}
                  >
                      {uploading ? (
                          <ActivityIndicator color="#000" />
                      ) : (
                          <>
                            <Ionicons name="cloud-upload" size={24} color="#000" style={{marginRight: 10}}/>
                            <Text style={styles.validateBtnText}>Valider et Envoyer</Text>
                          </>
                      )}
                  </TouchableOpacity>
              </View>
          ) : (
              // --- CAS 2 : AUCUNE IMAGE ---
              <TouchableOpacity style={styles.placeholder} onPress={pickImage}>
                  <View style={styles.dashedBox}>
                      <Ionicons name="camera" size={60} color="#666" />
                      <Text style={styles.placeholderText}>Toucher pour choisir une photo</Text>
                      <Text style={styles.placeholderSub}>Format portrait conseillé</Text>
                  </View>
              </TouchableOpacity>
          )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
      paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#1a1a1a' 
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  scrollContent: { padding: 20, alignItems: 'center', paddingBottom: 50 },
  subtitle: { color: '#ccc', marginBottom: 20, fontSize: 16 },

  // Style Placeholder (Pas d'image)
  placeholder: { width: '100%', aspectRatio: 3/4 },
  dashedBox: { 
      flex: 1, borderWidth: 2, borderColor: '#444', borderStyle: 'dashed', borderRadius: 20,
      justifyContent: 'center', alignItems: 'center', backgroundColor: '#111'
  },
  placeholderText: { color: '#ccc', marginTop: 15, fontWeight: 'bold', fontSize: 16 },
  placeholderSub: { color: '#666', marginTop: 5, fontSize: 12 },

  // Style Preview (Image choisie)
  previewContainer: { width: '100%', alignItems: 'center' },
  previewImage: { 
      width: '100%', height: 400, borderRadius: 15, backgroundColor: '#111', marginBottom: 20 
  },
  actionsRow: { flexDirection: 'row', marginBottom: 20 },
  changeBtn: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', 
      paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 
  },
  changeBtnText: { color: '#fff', marginLeft: 8 },

  // Bouton Valider
  validateBtn: { 
      backgroundColor: '#FFD700', width: '100%', paddingVertical: 18, borderRadius: 12, 
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      elevation: 5
  },
  validateBtnText: { color: '#000', fontWeight: 'bold', fontSize: 18 }
});