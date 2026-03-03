import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const auth = getAuth();
const storage = getStorage();
const db = getFirestore();

export default function UserProfileHeader() {
  const user = auth.currentUser;
  const [image, setImage] = useState(user?.photoURL || null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profile_pics/${user.uid}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // 1. Mise à jour Auth (Session locale)
      await updateProfile(user, { photoURL: downloadURL });
      
      // 2. Mise à jour Firestore (Pour que les autres le voient)
      await setDoc(doc(db, "users", user.uid), {
        displayName: user.displayName || "Grimpeur",
        photoURL: downloadURL,
        lastActive: new Date(),
      }, { merge: true });

      setImage(downloadURL);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de mettre à jour la photo.");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Ionicons name="person" size={40} color="#666" />
          </View>
        )}
        <View style={styles.editIcon}>
            <Ionicons name="camera" size={14} color="#fff" />
        </View>
      </TouchableOpacity>
      
      <View style={{marginLeft: 15}}>
          <Text style={styles.name}>{user?.displayName || "Grimpeur Anonyme"}</Text>
          <Text style={styles.subtext}>{user?.email}</Text>
          {uploading && <ActivityIndicator size="small" color="#FFD700" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#1a1a1a', borderRadius: 12, marginBottom: 20 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 70, height: 70, borderRadius: 35 },
  placeholder: { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFD700', padding: 4, borderRadius: 10 },
  name: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  subtext: { color: '#aaa', fontSize: 12 }
});