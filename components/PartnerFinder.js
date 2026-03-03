// components/PartnerFinder.js
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useState } from 'react';
import { FlatList, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';
import PaywallModal from './PaywallModal'; // Ton modal existant

const IS_USER_PREMIUM = false; // À remplacer par ta logique réelle

export default function PartnerFinder() {
  const auth = getAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [partners, setPartners] = useState([]);
  const [showPaywall, setShowPaywall] = useState(false);

  // Charger l'état local du user
  // (Supposons qu'on l'a déjà récupéré ou on fait un getDoc ici)

  const toggleSwitch = async () => {
    if (!IS_USER_PREMIUM) {
        setShowPaywall(true);
        return;
    }

    const newState = !isEnabled;
    setIsEnabled(newState);
    
    // Update Firestore
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, { 
        lookingForPartner: newState,
        partnerLocation: "Fontainebleau" // Exemple, à rendre dynamique
    });

    if (newState) fetchPartners();
  };

  const fetchPartners = async () => {
      const q = query(collection(db, "users"), where("lookingForPartner", "==", true));
      const snap = await getDocs(q);
      const list = snap.docs
          .map(d => ({id: d.id, ...d.data()}))
          .filter(u => u.id !== auth.currentUser.uid); // Exclure soi-même
      setPartners(list);
  };

  return (
    <View style={styles.container}>
      
      {/* HEADER CARD */}
      <View style={styles.card}>
          <View style={{flex: 1}}>
            <Text style={styles.title}>Trouver un partenaire</Text>
            <Text style={styles.subtitle}>
                {isEnabled ? "Visible par la communauté ✅" : "Activez pour voir les grimpeurs dispo."}
            </Text>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: "#FFD700" }}
            thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
      </View>

      {/* LISTE DES PARTENAIRES */}
      {isEnabled && (
          <FlatList 
            data={partners}
            keyExtractor={item => item.id}
            style={{marginTop: 15}}
            renderItem={({item}) => (
                <View style={styles.partnerItem}>
                    <Image source={{uri: item.photoURL || "https://via.placeholder.com/50"}} style={styles.pAvatar} />
                    <View style={{flex: 1, marginLeft: 10}}>
                        <Text style={styles.pName}>{item.displayName}</Text>
                        <Text style={styles.pLoc}>📍 {item.partnerLocation || "Partout"}</Text>
                    </View>
                    <TouchableOpacity style={styles.chatBtn}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            )}
            ListEmptyComponent={<Text style={{color:'#666', textAlign:'center', marginTop:10}}>Aucun partenaire dispo pour le moment.</Text>}
          />
      )}

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { marginTop: 20 },
    card: { 
        backgroundColor: '#222', borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#333'
    },
    title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    subtitle: { color: '#888', fontSize: 12, marginTop: 2 },
    
    partnerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 10, borderRadius: 8, marginBottom: 8 },
    pAvatar: { width: 40, height: 40, borderRadius: 20 },
    pName: { color: '#fff', fontWeight: 'bold' },
    pLoc: { color: '#FFD700', fontSize: 10 },
    chatBtn: { backgroundColor: '#FFD700', padding: 8, borderRadius: 20 }
});