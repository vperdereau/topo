import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- IMPORTS FIREBASE ---
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { getGradeColor } from './utils/gradeColors'; // Import du helper

export default function CragDetailsScreen({ route, navigation }) {
  // 1. Récupération des infos du site via la navigation
  const { crag } = route.params;
  const router = useRouter();

  // 2. Gestion de l'Admin (Sécurité visuelle)
  // REMPLACE CECI PAR TON EMAIL EXACT ↓
  const ADMIN_EMAIL = "vincent.perdereau.pro@gmail.com"; 

const isAdmin = true; 


  // 3. États locaux
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États du formulaire
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');

  // 4. Charger les voies depuis Firebase
  const fetchRoutes = async () => {
    try {
      const routesRef = collection(db, "secteurs", crag.id, "voies");
      const querySnapshot = await getDocs(routesRef);
      
      const routesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Optionnel : Trier par nom
      routesList.sort((a, b) => a.nom.localeCompare(b.nom));

      setRoutes(routesList);
    } catch (error) {
      console.error("Erreur chargement voies :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [crag.id]);

  // 5. Ajouter une voie (Fonction Admin)
  const handleAddRoute = async () => {
    if (newName.trim() === '' || newGrade.trim() === '') {
      Alert.alert("Erreur", "Champs vides !");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "secteurs", crag.id, "voies"), {
        nom: newName,
        cotation: newGrade,
        type: 'Voie',
        dateAjout: new Date()
      });

      // Mise à jour locale (pour éviter de recharger toute la liste)
      const newRoute = { 
        id: docRef.id, 
        nom: newName, 
        cotation: newGrade, 
        type: 'Voie' 
      };
      
      setRoutes([...routes, newRoute]);
      
      // Reset du formulaire
      setModalVisible(false);
      setNewName('');
      setNewGrade('');
      Alert.alert("Succès", "Voie ajoutée !");

    } catch (error) {
      console.error("Erreur ajout : ", error);
      Alert.alert("Erreur", "Impossible d'ajouter. As-tu les droits ?");
    }
  };

  // 6. Rendu d'une ligne (Item)
const renderRouteItem = ({ item }) => (
  <TouchableOpacity 
    style={styles.routeItem}
onPress={() => router.push({
  pathname: "/route-social", 
  params: { 
    routeData: JSON.stringify(item), 
    cragId: crag.id,
    cragName: crag.name 
  }
})}
  >
    <View>
      <Text style={styles.routeName}>{item.nom}</Text>
      <Text style={styles.routeType}>{item.type || 'Voie'}</Text>
    </View>
    
    {/* Application de la couleur dynamique */}
    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(item.cotation) }]}>
      <Text style={styles.gradeText}>{item.cotation}</Text>
    </View>
  </TouchableOpacity>
);

  return (
    <View style={styles.container}>
      {/* HEADER DU SITE */}
      <View style={styles.header}>
        <Text style={styles.title}>{crag.name}</Text>
        <Text style={styles.subtitle}>{crag.routesCount} voies environ</Text>
        <Text style={styles.desc}>{crag.description}</Text>
      </View>

      {/* HEADER DE LA LISTE + BOUTON ADMIN */}
{/* HEADER DE LA LISTE + BOUTON ADMIN */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Les Voies ({routes.length})</Text>
        
        <View style={{flexDirection: 'row', gap: 10}}>
          {/* NOUVEAU BOUTON TOPO */}
          <TouchableOpacity 
  style={[styles.addButton, { backgroundColor: '#FF9500' }]} 
  onPress={() => {
    // On convertit les objets complexes en string si nécessaire, 
    // mais Expo Router le gère souvent tout seul.
    // Cependant, pour éviter les bugs avec de gros tableaux,
    // l'idéal est de passer juste l'ID, mais pour ton test actuel :
    router.push({
      pathname: "/topo", // Correspond au fichier app/topo.js
      params: { 
        cragId: crag.id, 
        cragName: crag.name,
        // Attention : passer un gros tableau 'routes' dans les params peut planter sur certains téléphones.
        // Pour l'instant on laisse, mais l'idéal sera de re-fetcher les routes dans topo.js
        routes: JSON.stringify(routes) 
      }
    });
  }}
>
  <Text style={styles.addButtonText}>🗺️ Voir Topo</Text>
</TouchableOpacity>

          {isAdmin && (
            <View style={{flexDirection: 'row', gap: 10}}>
    {/* Bouton existant pour ajouter une voie texte */}
    <TouchableOpacity 
      style={styles.addButton} 
      onPress={() => setModalVisible(true)}
    >
      <Text style={styles.addButtonText}>+ Liste</Text>
    </TouchableOpacity>

    {/* NOUVEAU BOUTON : Vers l'éditeur de topo photo */}
    <TouchableOpacity 
      style={[styles.addButton, { backgroundColor: 'purple' }]} 
      onPress={() => router.push({
        pathname: "/admin/topo-list",
        params: { cragId: crag.id } // On passe bien l'ID !
      })}
    >
      <Text style={styles.addButtonText}>📷 Topo</Text>
    </TouchableOpacity>
  </View>
          )}
        </View>
      </View>

      {/* LISTE */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 20}}/>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          renderItem={renderRouteItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucune voie référencée.</Text>
          }
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* MODAL D'AJOUT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter une voie</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nom (ex: Biographie)"
              value={newName}
              onChangeText={setNewName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Cotation (ex: 9a+)"
              value={newGrade}
              onChangeText={setNewGrade}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.btn, styles.btnCancel]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnTextCancel}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btn, styles.btnConfirm]} 
                onPress={handleAddRoute}
              >
                <Text style={styles.btnTextConfirm}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 10 },
  desc: { fontSize: 15, lineHeight: 22, color: '#444' },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', margin: 20, marginBottom: 10 },
  
  addButton: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  routeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, marginHorizontal: 20, marginBottom: 10, backgroundColor: '#fff', borderRadius: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  routeName: { fontSize: 16, fontWeight: '600' },
  routeType: { fontSize: 12, color: '#888' },
  gradeBadge: { backgroundColor: '#333', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  gradeText: { color: '#fff', fontWeight: 'bold' },
  
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999', fontStyle: 'italic' },

  // Styles Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { width: '100%', height: 40, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 15, backgroundColor: '#f9f9f9' },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  btnCancel: { backgroundColor: '#eee' },
  btnConfirm: { backgroundColor: '#007AFF' },
  btnTextCancel: { fontWeight: 'bold', color: '#333' },
  btnTextConfirm: { fontWeight: 'bold', color: '#fff' }
});