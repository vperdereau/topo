import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, ImageBackground, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// Simule une feature list
const FEATURES = [
  { icon: 'cloud-offline', text: 'Topos accessibles 100% hors-ligne' },
  { icon: 'map', text: 'Accès illimité à tous les secteurs' },
  { icon: 'infinite', text: 'Carnet de croix illimité' },
  { icon: 'heart', text: 'Soutenir le développement de l\'app' },
];

export default function PaywallModal({ visible, onClose, onBuy }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Image de fond immersive (à remplacer par une belle photo d'escalade locale) */}
        <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=2003&auto=format&fit=crop' }} 
            style={styles.backgroundImage}
        >
            <LinearGradient
                colors={['transparent', '#111']}
                style={styles.gradient}
            />
        </ImageBackground>

        {/* Contenu */}
        <View style={styles.content}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={36} color="#fff" style={{opacity: 0.8}} />
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.tagline}>PASSEZ EN PRO</Text>
                <Text style={styles.title}>Grimpez sans limites.</Text>
                <Text style={styles.subtitle}>Débloquez le mode hors-ligne et emportez vos topos au fond des gorges sans réseau.</Text>
            </View>

            <View style={styles.featuresContainer}>
                {FEATURES.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={f.icon} size={20} color="#FFD700" />
                        </View>
                        <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.ctaButton} onPress={onBuy}>
                    <Text style={styles.ctaText}>Devenir Premium - 29.99€ / an</Text>
                    <Text style={styles.ctaSub}>7 jours d'essai gratuit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={{marginTop: 15}}>
                    <Text style={styles.restoreText}>Restaurer les achats</Text>
                </TouchableOpacity>
            </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  backgroundImage: { width, height: height * 0.55, position: 'absolute', top: 0 },
  gradient: { flex: 1, paddingTop: 100 }, // Assombrit progressivement l'image
  content: { flex: 1, justifyContent: 'flex-end', paddingBottom: 40, paddingHorizontal: 20 },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  
  header: { marginBottom: 30 },
  tagline: { color: '#FFD700', fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
  title: { color: '#fff', fontSize: 36, fontWeight: '800', lineHeight: 40 },
  subtitle: { color: '#ccc', fontSize: 16, marginTop: 10, lineHeight: 22 },

  featuresContainer: { marginBottom: 30 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 215, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureText: { color: '#eee', fontSize: 16, fontWeight: '500' },

  footer: { alignItems: 'center' },
  ctaButton: { backgroundColor: '#FFD700', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  ctaText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  ctaSub: { color: '#333', fontSize: 12, marginTop: 2 },
  restoreText: { color: '#666', fontSize: 14 }
});