import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db, storage } from '../firebaseConfig';

export default function ProposeEditScreen() {
  const router = useRouter();
  const { collectionName, docId, currentName } = useLocalSearchParams(); // ex: 'sites', '123', 'Fontainebleau'

  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const uploadImage = async (uri) => {
    return new Promise(async (resolve, reject) => {
        try {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () { resolve(xhr.response); };
            xhr.onerror = function () { reject(new TypeError("Echec conversion")); };
            xhr.responseType = "blob";
            xhr.open("GET", uri, true);
            xhr.send(null);
        } catch (e) { reject(e); }
    }).then(async (blob) => {
        const filename = `edits/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    });
  };

  const handleSubmit = async () => {
    if (!image) return Alert.alert("Erreur", "Aucune nouvelle image sélectionnée.");
    setUploading(true);
    try {
        const downloadUrl = await uploadImage(image.uri);

        // On crée une demande de modification générique
        await addDoc(collection(db, "pending_edits"), {
            targetCollection: collectionName, // 'sites' ou 'secteurs'
            targetId: docId,
            targetName: currentName,
            newImageUrl: downloadUrl,
            type: 'photo_update',
            createdAt: serverTimestamp(),
            status: 'pending'
        });

        Alert.alert("Merci !", "La nouvelle photo sera visible après validation.");
        router.back();
    } catch (e) { Alert.alert("Erreur", e.message); } 
    finally { setUploading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier la photo</Text>
        <View style={{width: 28}} />
      </View>

      <View style={styles.content}>
        <Text style={{color:'#ccc', marginBottom: 20}}>Proposition pour : <Text style={{fontWeight:'bold', color:'#fff'}}>{currentName}</Text></Text>

        <TouchableOpacity style={styles.picker} onPress={pickImage}>
            {image ? (
                <Image source={{uri: image.uri}} style={{width:'100%', height:'100%'}} resizeMode="cover"/>
            ) : (
                <View style={{alignItems:'center'}}>
                    <Ionicons name="image" size={50} color="#666"/>
                    <Text style={{color:'#666', marginTop:10}}>Choisir une nouvelle image</Text>
                </View>
            )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#000"/> : <Text style={styles.btnText}>Envoyer proposition</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, padding: 20, backgroundColor: '#1a1a1a' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20, alignItems: 'center' },
  picker: { width: '100%', height: 250, backgroundColor: '#222', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 30, overflow: 'hidden' },
  btn: { backgroundColor: '#FFD700', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30 },
  btnText: { fontWeight: 'bold', fontSize: 16 }
});