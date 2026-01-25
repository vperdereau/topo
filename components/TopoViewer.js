import { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

// Dimensions de l'écran pour l'exemple
const SCREEN_WIDTH = Dimensions.get('window').width;

// Helper pour convertir un tableau de points en chemin SVG (String "M x y L x y...")
const pointsToPath = (points) => {
  if (!points || points.length === 0) return '';
  
  // M = Move to (premier point), L = Line to (points suivants)
  const path = points.map((p, index) => {
    return `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }).join(' ');

  return path;
};

export default function TopoViewer({ photoUrl, routes, originalWidth, originalHeight }) {
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  // Calcul du ratio pour afficher l'image correctement sur l'écran
  const aspectRatio = originalWidth / originalHeight;
  const displayHeight = SCREEN_WIDTH / aspectRatio;

  return (
    <View style={[styles.container, { height: displayHeight }]}>
      
      {/* 1. L'IMAGE DE FOND */}
      <Image 
        source={{ uri: photoUrl }} 
        style={{ width: SCREEN_WIDTH, height: displayHeight }} 
        resizeMode="contain"
      />

      {/* 2. LE CALQUE SVG */}
      {/* StyleSheet.absoluteFill permet de superposer parfaitement le SVG sur l'image */}
      <Svg 
        height={displayHeight} 
        width={SCREEN_WIDTH} 
        viewBox={`0 0 ${originalWidth} ${originalHeight}`} // LA MAGIE EST ICI
        style={StyleSheet.absoluteFill}
      >
        {routes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const strokeColor = isSelected ? "#FFD700" : "rgba(255, 0, 0, 0.6)"; // Or si sélectionné, Rouge semi-transparent sinon
          const strokeWidth = isSelected ? 10 : 6; // Plus épais si sélectionné

          return (
            <G key={route.id} onPress={() => setSelectedRouteId(route.id)}>
              
              {/* Le tracé de la voie */}
              <Path
                d={pointsToPath(route.trace)}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                // Pour rendre la ligne plus facile à cliquer, on peut ajouter une ligne transparente large par dessus
              />

              {/* Exemple: Dessiner le relais (dernier point) */}
              {route.trace.length > 0 && (
                <Circle 
                  cx={route.trace[route.trace.length - 1].x} 
                  cy={route.trace[route.trace.length - 1].y} 
                  r={isSelected ? 15 : 10} 
                  fill={strokeColor}
                />
              )}
            </G>
          );
        })}
      </Svg>
      
      {/* 3. INFO BULLE (Feedback visuel) */}
      {selectedRouteId && (
        <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>
                {routes.find(r => r.id === selectedRouteId)?.nom} - {routes.find(r => r.id === selectedRouteId)?.cotation}
            </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    position: 'relative', // Important pour le positionnement absolu des enfants
    backgroundColor: '#000',
  },
  tooltip: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});