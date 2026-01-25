export const getGradeColor = (grade) => {
  if (!grade) return '#999999'; // Gris (Non coté)

  // On nettoie la chaîne (minuscule, sans espace)
  const g = grade.toString().toLowerCase().trim();

  // 3 et 4 : VERT (Facile)
  if (g.startsWith('3') || g.startsWith('4')) return '#34C759'; 

  // 5 : BLEU (Intermédiaire)
  if (g.startsWith('5')) return '#007AFF'; 

  // 6 : JAUNE / ORANGE (Difficile)
  if (g.startsWith('6')) return '#FFCC00'; 

  // 7 : ROUGE (Très difficile)
  if (g.startsWith('7')) return '#FF3B30'; 

  // 8 et 9 : VIOLET / NOIR (Expert)
  if (g.startsWith('8') || g.startsWith('9')) return '#AF52DE'; 

  return '#999999'; // Par défaut
};