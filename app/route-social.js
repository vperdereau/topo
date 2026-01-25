import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { getGradeColor } from '../utils/gradeColors';

export default function RouteSocialScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // On parse les données reçues en JSON string
  const route = params.routeData ? JSON.parse(params.routeData) : null;

  if (!route) return <View style={styles.container}><Text style={{color:'#fff'}}>Erreur chargement</Text></View>;

  return (
    <View style={styles.container}>
      {/* Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la voie</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 40}}>
        
        {/* En-tête de la voie (Gros Grade + Nom) */}
        <View style={styles.routeHeader}>
            <View style={[styles.gradeCircle, { borderColor: getGradeColor(route.cotation) }]}>
                <Text style={[styles.gradeText, { color: getGradeColor(route.cotation) }]}>{route.cotation}</Text>
            </View>
            <Text style={styles.routeName}>{route.nom}</Text>
            <Text style={styles.routeType}>Voie Sportive • 25m (est.)</Text>
            
            {/* Actions rapides */}
            <View style={styles.actionRow}>
                <ActionButton icon="checkmark-done-circle" label="Croix" color={COLORS.success} />
                <ActionButton icon="heart" label="Favori" color={COLORS.danger} />
                <ActionButton icon="share-social" label="Partager" color={COLORS.primary} />
            </View>
        </View>

        <View style={styles.divider} />

        {/* Section Description */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.bodyText}>
                Une voie magnifique qui commence par un léger dévers sur de bonnes prises, suivi d'un crux technique sur réglettes. La fin est plus déroulante mais demande de la conti. (Description simulée).
            </Text>
        </View>

        {/* Section Commentaires (Social Mockup) */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commentaires récents</Text>
            
            {/* Faux commentaire 1 */}
            <View style={styles.commentCard}>
                <View style={styles.avatar}><Text style={{fontWeight:'bold'}}>A</Text></View>
                <View style={{flex:1}}>
                    <Text style={styles.commentAuthor}>Alex Honnold</Text>
                    <Text style={styles.commentText}>Un peu expo au 3ème point, mais super rocher !</Text>
                </View>
            </View>

             {/* Faux commentaire 2 */}
             <View style={styles.commentCard}>
                <View style={[styles.avatar, {backgroundColor:'#FFD700'}]}><Text style={{fontWeight:'bold'}}>C</Text></View>
                <View style={{flex:1}}>
                    <Text style={styles.commentAuthor}>Chris Sharma</Text>
                    <Text style={styles.commentText}>Dure pour la cotation. Sûrement un bon 7b+.</Text>
                </View>
            </View>

        </View>

      </ScrollView>
    </View>
  );
}

// Petit composant helper pour les boutons
const ActionButton = ({ icon, label, color }) => (
    <TouchableOpacity style={styles.actionBtn}>
        <Ionicons name={icon} size={28} color={color} />
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  backBtn: { padding: 5, backgroundColor: COLORS.card, borderRadius: 12 },
  
  routeHeader: { alignItems: 'center', marginTop: 20, paddingHorizontal: 20 },
  gradeCircle: { 
      width: 80, height: 80, borderRadius: 40, borderWidth: 4, 
      justifyContent: 'center', alignItems: 'center', marginBottom: 15,
      backgroundColor: 'rgba(255,255,255,0.05)'
  },
  gradeText: { fontSize: 32, fontWeight: 'bold' },
  routeName: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  routeType: { color: COLORS.textSecondary, fontSize: 14, marginTop: 5, marginBottom: 20 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  actionBtn: { alignItems: 'center', padding: 10, backgroundColor: COLORS.card, borderRadius: 12, width: 80 },
  actionLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 5 },

  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },

  section: { padding: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  bodyText: { color: '#ccc', lineHeight: 22, fontSize: 15 },

  commentCard: { flexDirection: 'row', marginBottom: 15, backgroundColor: COLORS.card, padding: 15, borderRadius: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  commentAuthor: { color: '#fff', fontWeight: 'bold', marginBottom: 2 },
  commentText: { color: '#aaa', fontSize: 13 }
});