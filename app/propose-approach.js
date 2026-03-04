import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

export default function ProposeApproachScreen() {
  const router = useRouter();
  const { siteId, sectorId, sectorName } = useLocalSearchParams();

  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0]);
    } catch (e) { Alert.alert("Erreur", "Impossible d'accéder aux photos"); }
  };

const handleSubmit = async () => {
    if (!time || !description) return Alert.alert("Erreur", "Temps et description requis.");
    setUploading(true);
    try {
        let downloadUrl = null;
        if (image) {
            // ... (code upload image inchangé) ...
        }

        await addDoc(collection(db, "pending_edits"), {
            // SÉCURISATION DES CHAMPS ICI 👇
            targetId: sectorId || null,
            parentSiteId: siteId || null,
            targetName: sectorName || "Secteur inconnu", // <--- C'est ici que ça plantait
            
            type: 'approach_update',
            
            approachData: {
                time: time || "",
                description: description || "",
                imageUrl: downloadUrl // Peut être null, c'est autorisé
            },
            createdAt: serverTimestamp(),
            status: 'pending'
        });

        Alert.alert("Envoyé !", "L'info d'accès sera validée bientôt.");
        router.back();
    } catch (e) { 
        console.error(e); // Ajoute un log pour voir l'erreur exacte si ça recommence
        Alert.alert("Erreur", e.message); 
    } 
    finally { setUploading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Infos Accès</Text>
        <View style={{width: 28}} />
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
          <Text style={styles.label}>Temps de marche (ex: 15 min)</Text>
          <TextInput style={styles.input} placeholderTextColor="#666" value={time} onChangeText={setTime} />

          <Text style={styles.label}>Description du chemin</Text>
          <TextInput 
            style={[styles.input, {height: 100, textAlignVertical:'top'}]} 
            placeholder="Ex: Suivre le sentier bleu..." 
            placeholderTextColor="#666" multiline 
            value={description} onChangeText={setDescription} 
          />
          
          <Text style={styles.label}>Photo du départ / chemin (Optionnel)</Text>
          <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
              {image ? <Image source={{uri: image.uri}} style={{width:'100%', height:'100%'}} /> : <Ionicons name="camera" size={30} color="#666"/>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#000"/> : <Text style={styles.btnText}>Envoyer</Text>}
          </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, padding: 20, backgroundColor: '#1a1a1a' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  label: { color: '#ccc', marginTop: 15, marginBottom: 5, fontWeight:'bold' },
  input: { backgroundColor: '#222', color:'#fff', padding: 15, borderRadius: 10 },
  imageBtn: { height: 150, backgroundColor: '#222', borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow:'hidden', marginTop: 5 },
  submitBtn: { backgroundColor: '#FFD700', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  btnText: { fontWeight: 'bold', fontSize: 16 }
});