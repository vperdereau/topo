import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Text, View } from 'react-native';
import { db } from './firebaseConfig'; // Vérifie le chemin !

// ⚠️ IMPORTANT : Remplace ça par l'ID du site de destination (ex: l'ID du Faron)
// Tu trouves cet ID dans ta console Firebase ou dans tes logs.
const TARGET_SITE_ID = "YDFPVhw1NK8kY6cRXsjt"; 


export default function MigrationButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const runMigration = async () => {
 

    setLoading(true);
    setStatus("Démarrage...");

    try {
      // 1. Récupérer tous les anciens secteurs (racine)
      const oldSectorsRef = collection(db, "secteurs");
      const oldSectorsSnap = await getDocs(oldSectorsRef);

      if (oldSectorsSnap.empty) {
          setStatus("Aucun ancien secteur trouvé.");
          setLoading(false);
          return;
      }

      let countSecteurs = 0;
      let countTopos = 0;

      // 2. Boucler sur chaque secteur
      for (const sectorDoc of oldSectorsSnap.docs) {
        const sectorData = sectorDoc.data();
        const sectorId = sectorDoc.id;

        setStatus(`Migration du secteur : ${sectorData.nom || sectorId}...`);

        // A. Créer la copie dans le NOUVEAU chemin : sites > ID > secteurs > ID
        const newSectorRef = doc(db, "sites", TARGET_SITE_ID, "secteurs", sectorId);
        await setDoc(newSectorRef, sectorData);
        countSecteurs++;

        // B. Récupérer les topos de ce secteur
        const oldToposRef = collection(db, "secteurs", sectorId, "topos");
        const oldToposSnap = await getDocs(oldToposRef);

        // C. Copier chaque topo
        for (const topoDoc of oldToposSnap.docs) {
            const topoData = topoDoc.data();
            // Nouveau chemin : sites > ID > secteurs > ID > topos > ID
            const newTopoRef = doc(db, "sites", TARGET_SITE_ID, "secteurs", sectorId, "topos", topoDoc.id);
            await setDoc(newTopoRef, topoData);
            countTopos++;
        }
      }

      setStatus(`Terminé ! ${countSecteurs} secteurs et ${countTopos} topos migrés.`);
      Alert.alert("Succès", `Migration réussie vers le site ${TARGET_SITE_ID}`);

    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", error.message);
      setStatus("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#333', margin: 20, borderRadius: 10 }}>
      <Text style={{ color: '#fff', marginBottom: 10, fontWeight: 'bold' }}>OUTIL MIGRATION</Text>
      <Text style={{ color: '#ccc', marginBottom: 10, fontSize: 12 }}>
        Copie tout de "secteurs" vers "sites/{TARGET_SITE_ID}/secteurs"
      </Text>
      
      {loading ? (
          <ActivityIndicator color="#FFD700" />
      ) : (
          <Button title="LANCER LA MIGRATION" onPress={runMigration} color="#FFD700" />
      )}
      <Text style={{ color: '#fff', marginTop: 10 }}>{status}</Text>
    </View>
  );
}