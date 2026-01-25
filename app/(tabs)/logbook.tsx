import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { auth, db } from '../../firebaseConfig';
import { getGradeColor } from '../../utils/gradeColors';

// Si tu as un composant PaywallModal, importe-le ici. Sinon, utilise le Mock ci-dessous.
// import PaywallModal from '../../components/PaywallModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const storage = getStorage();

// --- MOCK PAYWALL (À remplacer par ton vrai composant) ---
const PaywallModal = ({ visible, onClose }) => (
    <Modal visible={visible} animationType="slide" transparent>
        <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.8)'}}>
            <View style={{backgroundColor:'#fff', padding:20, borderRadius:10, width:'80%', alignItems:'center'}}>
                <Text style={{fontSize:18, fontWeight:'bold', marginBottom:10}}>Fonctionnalité Premium 💎</Text>
                <Text style={{textAlign:'center', marginBottom:20}}>Abonne-toi pour trouver des partenaires de grimpe !</Text>
                <TouchableOpacity onPress={onClose} style={{backgroundColor:'#FFD700', padding:10, borderRadius:5}}>
                    <Text style={{fontWeight:'bold'}}>Compris</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

// --- COMPOSANT 1 : EN-TÊTE PROFIL (Image Upload) ---
const UserProfileHeader = ({ user, refreshTrigger }) => {
    const [image, setImage] = useState(user?.photoURL);
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
            // On stocke dans profile_pics/UID
            const storageRef = ref(storage, `profile_pics/${user.uid}`);
            
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            // 1. Update Auth Profile
            await updateProfile(user, { photoURL: downloadURL });
            
            // 2. Update Firestore User Doc (Pour la recherche de partenaire et les bulles)
            await setDoc(doc(db, "users", user.uid), {
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: downloadURL,
                email: user.email,
                lastActive: new Date()
            }, { merge: true });

            setImage(downloadURL);
            Alert.alert("Succès", "Photo de profil mise à jour !");
        } catch (e) {
            console.error(e);
            Alert.alert("Erreur", "Impossible de changer la photo.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.profileHeader}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.avatarImage} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                <View style={styles.cameraIcon}>
                    {uploading ? <ActivityIndicator size="small" color="#000"/> : <Ionicons name="camera" size={14} color="#000" />}
                </View>
            </TouchableOpacity>
            <Text style={styles.username}>{user?.displayName || user?.email?.split('@')[0]}</Text>
            <Text style={styles.subtext}>{user?.email}</Text>
        </View>
    );
};

// --- COMPOSANT 2 : PARTNER FINDER (Premium) ---
const PartnerFinder = ({ user }) => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [partners, setPartners] = useState([]);
    const [showPaywall, setShowPaywall] = useState(false);
    const IS_PREMIUM = false; // ⚠️ À connecter à ta logique Premium

    // Charger l'état initial
    useEffect(() => {
        const checkStatus = async () => {
             // Ici on pourrait lire dans Firestore si le user cherche déjà
             // Pour l'exemple on commence à false
        };
        checkStatus();
    }, []);

    const toggleSwitch = async () => {
        if (!IS_PREMIUM) {
            setShowPaywall(true);
            // On ne return pas tout de suite si tu veux tester la logique sans payer, 
            // mais en prod : return;
        }

        const newState = !isEnabled;
        setIsEnabled(newState);

        // Update Firestore
        try {
            await setDoc(doc(db, "users", user.uid), {
                lookingForPartner: newState,
                partnerLocation: "Localisation inconnue" // À améliorer avec GPS
            }, { merge: true });

            if (newState) fetchPartners();
        } catch (e) { console.error(e); }
    };

    const fetchPartners = async () => {
        try {
            const q = query(collection(db, "users"), where("lookingForPartner", "==", true));
            const snap = await getDocs(q);
            const list = snap.docs
                .map(d => ({id: d.id, ...d.data()}))
                .filter(u => u.id !== user.uid); // S'exclure soi-même
            setPartners(list);
        } catch(e) { console.log(e); }
    };

    return (
        <View style={styles.partnerCard}>
            <View style={styles.partnerHeader}>
                <View style={{flex: 1}}>
                    <Text style={styles.partnerTitle}>Recherche Partenaire 🤝</Text>
                    <Text style={styles.partnerSub}>
                        {isEnabled ? "Visible par la communauté" : "Active pour voir les grimpeurs dispo"}
                    </Text>
                </View>
                <Switch
                    trackColor={{ false: "#767577", true: "#32D74B" }}
                    thumbColor={"#fff"}
                    onValueChange={toggleSwitch}
                    value={isEnabled}
                />
            </View>

            {isEnabled && (
                <FlatList 
                    data={partners}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{marginTop: 15}}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text style={{fontSize:12, color:'#999'}}>Aucun partenaire dispo pour le moment.</Text>}
                    renderItem={({item}) => (
                        <View style={styles.partnerItem}>
                            <Image source={{uri: item.photoURL || "https://via.placeholder.com/50"}} style={styles.pAvatar} />
                            <Text style={styles.pName} numberOfLines={1}>{item.displayName}</Text>
                        </View>
                    )}
                />
            )}
            
            <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
        </View>
    );
};


// --- ECRAN PRINCIPAL ---
export default function LogbookScreen() {
  const user = auth.currentUser;
  const [ticklist, setTicklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ maxGrade: '-', pyramidData: null });

  const fetchTicklist = async () => {
    if (!user) { setLoading(false); return; }

    try {
      const q = query(collection(db, "users", user.uid, "ticklist"));
      const querySnapshot = await getDocs(q);

      const list = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let dateObj = new Date();
          if (data.date?.toDate) dateObj = data.date.toDate();
          else if (data.date?.seconds) dateObj = new Date(data.date.seconds * 1000);

          return {
              id: doc.id,
              ...data,
              finalName: data.routeName || data.nom || "Voie sans nom", 
              finalGrade: data.routeGrade || data.cotation || "?",
              finalCrag: data.cragName || data.secteurName || "Secteur",
              dateObj: dateObj
          };
      });

      list.sort((a, b) => b.dateObj - a.dateObj);
      setTicklist(list);
      calculateStats(list);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  const calculateStats = (data) => {
    if (data.length === 0) return;
    const max = data.reduce((prev, current) => (prev.finalGrade > current.finalGrade) ? prev : current, data[0]);
    const gradeCounts = {};
    data.forEach(t => { gradeCounts[t.finalGrade] = (gradeCounts[t.finalGrade] || 0) + 1; });
    const sortedGrades = Object.keys(gradeCounts).sort();
    
    setStats({
      maxGrade: max.finalGrade,
      pyramidData: {
          labels: sortedGrades,
          datasets: [{ data: sortedGrades.map(g => gradeCounts[g]) }]
      }
    });
  };

  useFocusEffect(useCallback(() => { fetchTicklist(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchTicklist(); };

  // --- HEADER DE LISTE (Contient tout le haut de page) ---
  const ListHeader = () => (
    <View style={{ marginBottom: 20 }}>
        
        {/* 1. Profil + Photo */}
        <UserProfileHeader user={user} />

        {/* 2. Recherche Partenaire (NOUVEAU) */}
        <PartnerFinder user={user} />

        {/* 3. Stats Cards */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}>
                <Text style={styles.statNumber}>{ticklist.length}</Text>
                <Text style={styles.statLabel}>Croix</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNumber, {color: getGradeColor(stats.maxGrade)}]}>
                    {stats.maxGrade}
                </Text>
                <Text style={styles.statLabel}>Max</Text>
            </View>
        </View>

        {/* 4. Graphique */}
        {stats.pyramidData && (
            <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Pyramide de cotations</Text>
                <BarChart
                    data={stats.pyramidData}
                    width={SCREEN_WIDTH - 60}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                        backgroundGradientFrom: "#fff",
                        backgroundGradientTo: "#fff",
                        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        barPercentage: 0.6,
                        decimalPlaces: 0,
                    }}
                    style={{ borderRadius: 16 }}
                    showValuesOnTopOfBars
                    fromZero
                />
            </View>
        )}
        
        <Text style={[styles.sectionTitle, {marginLeft: 20, marginTop: 10}]}>Dernières ascensions</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemInfo}>
        <Text style={styles.routeName}>{item.finalName}</Text>
        <Text style={styles.routeDetails}>
            {item.dateObj.toLocaleDateString('fr-FR')} • {item.finalCrag}
        </Text>
      </View>
      <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(item.finalGrade) }]}>
        <Text style={styles.gradeText}>{item.finalGrade}</Text>
      </View>
    </View>
  );

  if (!user) return <View style={styles.center}><Text>Connecte-toi !</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={ticklist}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Ton carnet est vide. Va grimper ! 🧗‍♂️</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // PROFILE STYLE UPDATED
  profileHeader: { alignItems: 'center', padding: 25, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 5, marginBottom: 15 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFD700', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth:2, borderColor:'#fff' },
  username: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtext: { fontSize: 14, color: '#888' },

  // PARTNER CARD
  partnerCard: { marginHorizontal: 20, backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 15, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  partnerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  partnerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  partnerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  partnerItem: { alignItems: 'center', marginRight: 15, width: 60 },
  pAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 5 },
  pName: { fontSize: 10, color: '#333', textAlign: 'center' },

  // STATS
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 20, marginBottom: 20 },
  statCard: { backgroundColor: '#fff', width: '45%', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 14, color: '#888', textTransform: 'uppercase', marginTop: 5, letterSpacing: 1 },

  // GRAPH
  chartContainer: { marginHorizontal: 20, backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', alignSelf: 'flex-start' },

  // LISTE
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, marginHorizontal: 20, marginBottom: 10, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.03, elevation: 1 },
  itemInfo: { flex: 1 },
  routeName: { fontSize: 16, fontWeight: '600', color: '#333' },
  routeDetails: { fontSize: 12, color: '#999', marginTop: 4 },
  gradeBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  gradeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999' }
});