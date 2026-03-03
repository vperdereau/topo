import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db, storage } from '../firebaseConfig';

export default function AddSectorScreen() {
  const router = useRouter();
  const { siteId, siteName } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const uploadImageToStorage = async (uri) => {
    return new Promise(async (resolve, reject) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.onload = function () { resolve(xhr.response); };
          xhr.onerror = function () { reject(new TypeError("Echec")); };
          xhr.responseType = "blob";
          xhr.open("GET", uri, true);
          xhr.send(null);
        } catch (e) { reject(e); }
    }).then(async (blob) => {
        const filename = `sectors/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert("Erreur", "Nom requis.");
    setLoading(true);
    try {
        let downloadUrl = null;
        if (image) downloadUrl = await uploadImageToStorage(image.uri);

        await addDoc(collection(db, "pending_sectors"), {
            nom: name.trim(),
            siteId: siteId,
            siteName: siteName,
            imageUrl: downloadUrl, // <--- Image
            createdAt: serverTimestamp(),
            status: 'pending'
        });
        Alert.alert("Succès", "Secteur en attente de validation.");
        router.back();
    } catch (e) { Alert.alert("Erreur", e.message); } 
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau Secteur</Text>
        <View style={{width: 28}} />
      </View>

      <View style={styles.form}>
        <Text style={{color:'#aaa', marginBottom: 20, textAlign:'center'}}>Site : <Text style={{color:'#fff', fontWeight:'bold'}}>{siteName}</Text></Text>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
                <Image source={{ uri: image.uri }} style={{ width: '100%', height: '100%' }} />
            ) : (
                <View style={{alignItems:'center'}}>
                    <Ionicons name="camera" size={40} color="#666" />
                    <Text style={{color:'#666', marginTop:5}}>Photo du secteur (Optionnel)</Text>
                </View>
            )}
        </TouchableOpacity>

        <Text style={styles.label}>Nom du secteur</Text>
        <TextInput placeholder="Ex: Face Nord..." placeholderTextColor="#666" style={styles.input} value={name} onChangeText={setName} />

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#000"/> : <Text style={styles.createBtnText}>Envoyer</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
// Utilise les mêmes styles que add-site.js (tu peux copier-coller le bloc styles)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#1a1a1a' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    form: { padding: 20 },
    label: { color: '#ccc', marginBottom: 8, fontWeight:'bold' },
    input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 20 },
    imagePicker: { width:'100%', height: 180, backgroundColor:'#222', borderRadius:10, justifyContent:'center', alignItems:'center', marginBottom:20, overflow:'hidden', borderWidth:1, borderColor:'#333', borderStyle:'dashed' },
    createBtn: { backgroundColor: '#FFD700', padding: 15, borderRadius: 10, alignItems: 'center' },
    createBtnText: { fontWeight: 'bold', fontSize: 16, color: '#000' }
});