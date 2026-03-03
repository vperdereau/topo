import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from './constants/theme';
import { db } from './firebaseConfig';
import { getGradeColor } from './utils/gradeColors';

// Liste simplifiée pour les votes
const GRADES = ["5a","5b","5c","6a","6b","6c","7a","7b","7c","8a"];

export default function RouteSocialScreen() {
  const navigation = useNavigation();
  const routeParams = useRoute();
  
  // Données de la voie
  const { routeData, cragId } = routeParams.params || {};
  const currentRoute = routeData ? JSON.parse(routeData) : null;
  const routeId = currentRoute?.id || "unknown_route"; // ID unique de la voie nécessaire

  // États
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [votes, setVotes] = useState({}); // { "6a": 2, "6b": 5 }
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. CHARGEMENT DES DONNÉES SOCIALES (Votes + Commentaires)
  useEffect(() => {
    if (!currentRoute) return;

    // A. Écouter les commentaires (Collection: social_comments)
    const qComments = query(collection(db, "social_comments"), where("routeId", "==", routeId));
    const unsubComments = onSnapshot(qComments, (snap) => {
        const commentsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Tri par date (récent en premier)
        commentsData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setComments(commentsData);
    });

    // B. Écouter les votes (Collection: social_votes / Document: routeId)
    // On stocke tous les votes dans un seul document pour simplifier le compteur
    const voteRef = doc(db, "social_votes", routeId);
    const unsubVotes = onSnapshot(voteRef, (docSnap) => {
        if (docSnap.exists()) {
            setVotes(docSnap.data().distribution || {});
        } else {
            setVotes({});
        }
        setLoading(false);
    });

    return () => { unsubComments(); unsubVotes(); };
  }, [routeId]);

  // 2. ENVOYER UN COMMENTAIRE
  const handleSendComment = async () => {
      if (!newComment.trim()) return;
      try {
          await addDoc(collection(db, "social_comments"), {
              routeId: routeId,
              text: newComment,
              author: "Moi", // À remplacer par user.displayName
              createdAt: serverTimestamp(),
              grade: userVote // On associe le vote au commentaire si dispo
          });
          setNewComment("");
      } catch (e) { Alert.alert("Erreur", "Impossible d'envoyer le message"); }
  };

  // 3. VOTER POUR UNE COTATION
  const handleVote = async (grade) => {
      setUserVote(grade);
      // Mise à jour optimiste et simplifiée (Dans la réalité, on utiliserait une transaction)
      try {
        const voteRef = doc(db, "social_votes", routeId);
        const currentCount = votes[grade] || 0;
        
        // On écrase tout le document (pour l'exemple) - Idéalement: FieldValue.increment
        await setDoc(voteRef, {
            distribution: { ...votes, [grade]: currentCount + 1 }
        }, { merge: true });

        Alert.alert("Vote enregistré", `Tu as voté ${grade}`);
      } catch (e) { console.error(e); }
  };

  // 4. CALCUL DU GRAPHIQUE (Histogramme)
  const renderChart = () => {
    const maxVotes = Math.max(...Object.values(votes), 1); // Pour l'échelle
    // On prend quelques cotations autour de la cotation officielle
    const baseGrade = currentRoute.cotation; 
    // Petite logique pour générer une plage de cotation autour (mockup pour l'affichage)
    const displayGrades = GRADES; // Tu peux affiner cette liste dynamiquement

    return (
        <View style={styles.chartContainer}>
            {displayGrades.map((g) => {
                const count = votes[g] || 0;
                const height = (count / maxVotes) * 100; // Hauteur en %
                const isOfficial = g === currentRoute.cotation;
                const isUserVote = g === userVote;

                return (
                    <TouchableOpacity key={g} style={styles.barContainer} onPress={() => handleVote(g)}>
                        <Text style={styles.barCount}>{count > 0 ? count : ""}</Text>
                        <View style={[
                            styles.bar, 
                            { height: Math.max(height, 5) }, // Min 5px pour qu'on puisse cliquer
                            isOfficial && { backgroundColor: COLORS.primary },
                            isUserVote && { backgroundColor: COLORS.success }
                        ]} />
                        <Text style={[styles.barLabel, isOfficial && {fontWeight:'bold', color:COLORS.primary}]}>{g}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
  };

  if (!currentRoute) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentRoute.nom}</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 100}}>
        
        {/* INFO VOIE */}
        <View style={styles.routeHeader}>
            <View style={[styles.gradeCircle, { borderColor: getGradeColor(currentRoute.cotation) }]}>
                <Text style={[styles.gradeText, { color: getGradeColor(currentRoute.cotation) }]}>
                    {currentRoute.cotation}
                </Text>
            </View>
            <Text style={styles.subTitle}>COTATION OFFICIELLE</Text>
        </View>

        {/* BLOC INFOS TECHNIQUES */}
<View style={{flexDirection:'row', marginVertical: 15, justifyContent:'space-around', backgroundColor:'#222', padding: 15, borderRadius: 12}}>
    <View style={{alignItems:'center'}}>
        <Ionicons name="resize-outline" size={24} color="#FFD700" />
        <Text style={{color:'#fff', fontWeight:'bold', marginTop:5}}>
            {currentRoute.height ? `${currentRoute.height} m` : "--"}
        </Text>
        <Text style={{color:'#888', fontSize:10}}>Hauteur</Text>
    </View>

    <View style={{width: 1, backgroundColor:'#444'}} />

    <View style={{alignItems:'center'}}>
        <Ionicons name="link-outline" size={24} color="#FFD700" />
        <Text style={{color:'#fff', fontWeight:'bold', marginTop:5}}>
            {currentRoute.quickdraws ? currentRoute.quickdraws : "--"}
        </Text>
        <Text style={{color:'#888', fontSize:10}}>Dégaines</Text>
    </View>
    
    <View style={{width: 1, backgroundColor:'#444'}} />
    
    <View style={{alignItems:'center'}}>
        <Ionicons name="hardware-chip-outline" size={24} color="#FFD700" />
        <Text style={{color:'#fff', fontWeight:'bold', marginTop:5}}>
           Relais
        </Text>
        <Text style={{color:'#888', fontSize:10}}>Maillon</Text>
    </View>
</View>

        {/* GRAPHIQUE DES AVIS */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis de la communauté</Text>
            <Text style={styles.sectionSub}>Touchez une barre pour donner votre avis</Text>
            {renderChart()}
            <View style={styles.legend}>
                <View style={{flexDirection:'row', alignItems:'center', marginRight:15}}>
                    <View style={[styles.dot, {backgroundColor: COLORS.primary}]} />
                    <Text style={styles.legendText}>Officiel</Text>
                </View>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <View style={[styles.dot, {backgroundColor: COLORS.success}]} />
                    <Text style={styles.legendText}>Votre vote</Text>
                </View>
            </View>
        </View>

        <View style={styles.divider} />

        {/* COMMENTAIRES */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commentaires ({comments.length})</Text>
            
            {comments.length === 0 ? (
                <Text style={{color:'#666', fontStyle:'italic', marginTop:10}}>Soyez le premier à commenter !</Text>
            ) : (
                comments.map((c) => (
                    <View key={c.id} style={styles.commentCard}>
                        <View style={styles.avatar}>
                            <Text style={{fontWeight:'bold', color:'#000'}}>{c.author[0]}</Text>
                        </View>
                        <View style={{flex:1}}>
                            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                <Text style={styles.commentAuthor}>{c.author}</Text>
                                {c.grade && <Text style={styles.voteBadge}>{c.grade}</Text>}
                            </View>
                            <Text style={styles.commentText}>{c.text}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>

      </ScrollView>

      {/* INPUT BAR */}
      <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor="#888"
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity onPress={handleSendComment} style={styles.sendBtn}>
            <Ionicons name="send" size={20} color="#000" />
          </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: COLORS.background },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 8, backgroundColor: COLORS.card, borderRadius: 12 },
  
  routeHeader: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  gradeCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 5, backgroundColor: 'rgba(255,255,255,0.05)' },
  gradeText: { fontSize: 24, fontWeight: 'bold' },
  subTitle: { color: COLORS.textSecondary, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  sectionSub: { color: '#666', fontSize: 12, marginBottom: 15 },
  
  // CHART STYLES
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8, paddingVertical: 10 },
  barContainer: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#333', borderRadius: 4 },
  barLabel: { color: '#888', fontSize: 10, marginTop: 5 },
  barCount: { color: '#fff', fontSize: 10, marginBottom: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: '#aaa', fontSize: 12 },

  divider: { height: 1, backgroundColor: '#222', marginVertical: 10, marginHorizontal: 20 },

  // COMMENTS STYLES
  commentCard: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 15, borderRadius: 12, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#CCC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  commentAuthor: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  commentText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  voteBadge: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },

  // INPUT STYLES
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: '#333' },
  input: { flex: 1, backgroundColor: '#111', color: '#fff', borderRadius: 20, paddingHorizontal: 15, height: 40, marginRight: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }
});