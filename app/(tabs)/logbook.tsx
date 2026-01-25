import { useFocusEffect } from 'expo-router';
import { collection, getDocs, query } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { BarChart } from 'react-native-chart-kit'; // NOUVEAU
import { auth, db } from '../../firebaseConfig';
import { getGradeColor } from '../../utils/gradeColors';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function LogbookScreen() {
  const user = auth.currentUser;

  const [ticklist, setTicklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // NOUVEAU : State pour les stats
  const [stats, setStats] = useState({ maxGrade: '-', pyramidData: null });

  const fetchTicklist = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

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
              // Compatibilité : on gère les deux noms de champs possibles
              finalName: data.routeName || data.nom || "Voie sans nom", 
              finalGrade: data.routeGrade || data.cotation || "?",
              finalCrag: data.cragName || data.secteurName || "Secteur",
              dateObj: dateObj
          };
      });

      // Tri date décroissante
      list.sort((a, b) => b.dateObj - a.dateObj);
      
      setTicklist(list);
      calculateStats(list); // On lance le calcul

    } catch (error) {
      console.error("Erreur chargement carnet:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // NOUVEAU : Calcul des stats pour le graph
  const calculateStats = (data) => {
    if (data.length === 0) return;

    // 1. Max Grade (Comparaison simple alphabétique pour l'instant)
    const max = data.reduce((prev, current) => 
        (prev.finalGrade > current.finalGrade) ? prev : current
    , data[0]);

    // 2. Pyramide
    const gradeCounts = {};
    data.forEach(t => {
      // On prend juste le prefixe (ex: "6a" depuis "6a+") pour simplifier le graph si tu veux
      // Ou on garde le grade complet. Ici on garde complet.
      const g = t.finalGrade; 
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;
    });

    const sortedGrades = Object.keys(gradeCounts).sort();
    
    const chartData = {
      labels: sortedGrades,
      datasets: [{ data: sortedGrades.map(g => gradeCounts[g]) }]
    };

    setStats({
      maxGrade: max.finalGrade,
      pyramidData: chartData
    });
  };

  useFocusEffect(useCallback(() => { fetchTicklist(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchTicklist(); };

  // --- COMPOSANTS UI ---

  // 1. En-tête de la liste (Profil + Stats + Graph)
  const ListHeader = () => (
    <View style={{ marginBottom: 20 }}>
        {/* PROFIL */}
        <View style={styles.profileHeader}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.username}>{user?.displayName || user?.email?.split('@')[0]}</Text>
            <Text style={styles.subtext}>Membre actif</Text>
        </View>

        {/* CARTES STATS (Total & Max) */}
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

        {/* GRAPHIQUE */}
        {stats.pyramidData && (
            <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Pyramide de cotations</Text>
                <BarChart
                    data={stats.pyramidData}
                    width={SCREEN_WIDTH - 60} // Largeur moins padding
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

  // 2. Item de la liste
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
          ListHeaderComponent={ListHeader} // C'est ici que la magie opère
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Ton carnet est vide. Va grimper ! 🧗‍♂️</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' }, // Gris très clair
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header Profil
  profileHeader: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 5, marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 30, color: '#fff', fontWeight: 'bold' },
  username: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtext: { fontSize: 14, color: '#888' },

  // Stats Row
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 20, marginBottom: 20 },
  statCard: { backgroundColor: '#fff', width: '45%', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 14, color: '#888', textTransform: 'uppercase', marginTop: 5, letterSpacing: 1 },

  // Graph
  chartContainer: { marginHorizontal: 20, backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', alignSelf: 'flex-start' },

  // Liste Items
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, marginHorizontal: 20, marginBottom: 10, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.03, elevation: 1 },
  itemInfo: { flex: 1 },
  routeName: { fontSize: 16, fontWeight: '600', color: '#333' },
  routeDetails: { fontSize: 12, color: '#999', marginTop: 4 },
  gradeBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  gradeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  emptyText: { textAlign: 'center', marginTop: 30, color: '#999' }
});