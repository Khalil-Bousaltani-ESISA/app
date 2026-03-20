import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// Stockage universel : localStorage sur web, AsyncStorage sur mobile
let Storage;
if (Platform.OS === 'web') {
  Storage = {
    getItem: async (key) => { try { return localStorage.getItem(key); } catch { return null; } },
    setItem: async (key, value) => { try { localStorage.setItem(key, value); } catch {} },
    multiGet: async (keys) => keys.map((k) => [k, localStorage.getItem(k)]),
    multiSet: async (pairs) => { pairs.forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }); },
  };
} else {
  Storage = require('@react-native-async-storage/async-storage').default;
}

const PARENT_DEFAULT_PIN = '1234';
const AGE_GROUPS = ['3-5', '6-8', '9-12'];
const CATEGORIES = ['Comptines', 'Sciences', 'Langues', 'Histoires', 'Nature'];

const THEMES = {
  soleil: {
    label: 'Soleil',
    screenBg: '#fff6e9',
    heroBg: '#24444a',
    heroSub: '#e8ffd3',
    activeTabBg: '#ff9f43',
    inactiveTabBg: '#f1e7d5',
    primary: '#ff9f43',
    secondary: '#2f8f83',
    shapeTop: '#ffd181',
    shapeBottom: '#9bd7ff',
  },
  ocean: {
    label: 'Ocean',
    screenBg: '#ecf7ff',
    heroBg: '#184b73',
    heroSub: '#d5efff',
    activeTabBg: '#3ea6ff',
    inactiveTabBg: '#d7ecff',
    primary: '#3ea6ff',
    secondary: '#0f6ea8',
    shapeTop: '#8dd3ff',
    shapeBottom: '#7bd3c2',
  },
  foret: {
    label: 'Foret',
    screenBg: '#f2f9ee',
    heroBg: '#2d5b39',
    heroSub: '#dff7db',
    activeTabBg: '#7cbc5a',
    inactiveTabBg: '#e1efd8',
    primary: '#7cbc5a',
    secondary: '#3b7f47',
    shapeTop: '#b8e88c',
    shapeBottom: '#9ed19a',
  },
};

const WHITELISTED_VIDEOS = [
  {
    id: 'v1',
    title: 'Capsule Couleurs - Ciel et Nature',
    category: 'Langues',
    ageGroup: '3-5',
    minutes: 7,
    skill: 'Vocabulaire',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    summary: 'Apprendre le vocabulaire des couleurs dans la nature.',
    lessonPoints: ['Le ciel est bleu', 'Les couleurs aident a decrire le monde'],
    slides: [
      {
        image:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=60',
        caption: 'Observe le ciel: on utilise le mot bleu pour le decrire.',
      },
      {
        image:
          'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=900&q=60',
        caption: 'Les couleurs nous aident a parler de la nature.',
      },
    ],
    quiz: {
      question: 'Dans cette video sur les couleurs, quelle couleur represente le ciel ?',
      choices: ['Bleu', 'Rouge'],
      correct: 0,
    },
    moreQuestions: [
      { question: 'Quelle couleur est souvent associee a la nature ?', choices: ['Vert', 'Noir'], correct: 0 },
      { question: 'Les couleurs servent a :', choices: ['Decrire', 'Casser'], correct: 0 },
    ],
  },
  {
    id: 'v2',
    title: 'Capsule Nombres - Compter jusqu a 10',
    category: 'Comptines',
    ageGroup: '3-5',
    minutes: 5,
    skill: 'Numeration',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    summary: 'Compter pas a pas et faire une petite addition.',
    lessonPoints: ['On compte 1,2,3...', '3 + 2 = 5'],
    slides: [
      {
        image:
          'https://images.unsplash.com/photo-1518131678677-a2f2b4c6a78b?auto=format&fit=crop&w=900&q=60',
        caption: 'On compte les objets un par un: 1, 2, 3, 4, 5...',
      },
      {
        image:
          'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=60',
        caption: 'Addition simple: 3 + 2 = 5.',
      },
    ],
    quiz: {
      question: 'Dans la comptine des nombres, combien font 3 + 2 ?',
      choices: ['4', '5'],
      correct: 1,
    },
    moreQuestions: [
      { question: 'Apres 4, quel nombre vient ?', choices: ['5', '7'], correct: 0 },
      { question: 'Combien font 1 + 1 ?', choices: ['2', '3'], correct: 0 },
    ],
  },
  {
    id: 'v3',
    title: 'Capsule Sciences - Cycle de la pluie',
    category: 'Sciences',
    ageGroup: '6-8',
    minutes: 10,
    skill: 'Culture scientifique',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    summary: 'Comprendre le cycle de l eau simplement.',
    lessonPoints: ["L'eau s'evapore", 'La vapeur forme les nuages', 'La pluie retombe'],
    slides: [
      {
        image:
          'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=900&q=60',
        caption: "La chaleur transforme l'eau en vapeur.",
      },
      {
        image:
          'https://images.unsplash.com/photo-1500740516770-92bd004b996e?auto=format&fit=crop&w=900&q=60',
        caption: 'Les nuages se forment dans le ciel.',
      },
      {
        image:
          'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=900&q=60',
        caption: 'Ensuite, la pluie retombe sur la Terre.',
      },
    ],
    quiz: {
      question: "D'apres la video, pourquoi il pleut ?",
      choices: ["L'eau s'evapore puis retombe", 'Les nuages pleurent'],
      correct: 0,
    },
    moreQuestions: [
      { question: 'La vapeur d eau forme :', choices: ['Les nuages', 'Le sable'], correct: 0 },
      { question: 'La pluie retombe sur :', choices: ['La Terre', 'La Lune'], correct: 0 },
    ],
  },
  {
    id: 'v4',
    title: 'Capsule Histoire - Le petit explorateur',
    category: 'Histoires',
    ageGroup: '6-8',
    minutes: 12,
    skill: 'Comprehension orale',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    summary: 'Un heros observe, decouvre et apprend de nouvelles choses.',
    lessonPoints: ['Observer', 'Poser des questions', 'Decouvrir'],
    slides: [
      {
        image:
          'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=60',
        caption: 'Un explorateur commence par observer son environnement.',
      },
      {
        image:
          'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=900&q=60',
        caption: 'Il pose des questions pour comprendre.',
      },
      {
        image:
          'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=900&q=60',
        caption: 'Puis il decouvre de nouvelles choses.',
      },
    ],
    quiz: {
      question: "Dans l'histoire, qu'est-ce qu'un explorateur ?",
      choices: ["Quelqu'un qui decouvre", 'Un type de nourriture'],
      correct: 0,
    },
    moreQuestions: [
      { question: 'Un explorateur commence par :', choices: ['Observer', 'Dormir'], correct: 0 },
      { question: 'Il pose des questions pour :', choices: ['Comprendre', 'Ignorer'], correct: 0 },
    ],
  },
  {
    id: 'v5',
    title: 'Capsule Espace - Planetes du systeme solaire',
    category: 'Sciences',
    ageGroup: '9-12',
    minutes: 14,
    skill: 'Astronomie',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    summary: 'Presentation simple des planetes du systeme solaire.',
    lessonPoints: ['Le systeme solaire a 8 planetes', 'Chaque planete est differente'],
    slides: [
      {
        image:
          'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=60',
        caption: 'Notre systeme solaire contient 8 planetes.',
      },
      {
        image:
          'https://images.unsplash.com/photo-1614642264762-d0a3b8bf3700?auto=format&fit=crop&w=900&q=60',
        caption: 'Chaque planete a ses propres caracteristiques.',
      },
    ],
    quiz: {
      question: 'Dans la video des planetes, combien y a-t-il de planetes dans le systeme solaire ?',
      choices: ['7', '8'],
      correct: 1,
    },
    moreQuestions: [
      { question: 'Le Soleil appartient a :', choices: ['Notre systeme solaire', 'Un ocean'], correct: 0 },
      { question: 'Chaque planete est :', choices: ['Differente', 'Identique'], correct: 0 },
    ],
  },
  {
    id: 'v6',
    title: 'Capsule Nature - Foret tropicale',
    category: 'Nature',
    ageGroup: '9-12',
    minutes: 11,
    skill: 'Biodiversite',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerGameShow.mp4',
    summary: 'Decouverte des caracteristiques du climat tropical.',
    lessonPoints: ['Climat chaud', 'Climat humide', 'Grande biodiversite'],
    slides: [
      {
        image:
          'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=60',
        caption: 'La foret tropicale est chaude.',
      },
      {
        image:
          'https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?auto=format&fit=crop&w=900&q=60',
        caption: 'Elle est aussi humide, avec beaucoup de pluie.',
      },
      {
        image:
          'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=60',
        caption: 'On y trouve une grande biodiversite.',
      },
    ],
    quiz: {
      question: 'La foret tropicale presentee dans la video est plutot :',
      choices: ['Chaude et humide', 'Froide et seche'],
      correct: 0,
    },
    moreQuestions: [
      { question: 'Le climat tropical est souvent :', choices: ['Humide', 'Sec'], correct: 0 },
      { question: 'La biodiversite signifie :', choices: ['Beaucoup d especes vivantes', 'Aucune plante'], correct: 0 },
    ],
  },
];

function getQuizQuestions(video) {
  if (!video?.quiz) return [];
  return [video.quiz, ...(video.moreQuestions || [])];
}

const BADGE_DEFINITIONS = [
  {
    id: 'first_video',
    label: 'Premier pas',
    emoji: '🎬',
    desc: 'Premiere video regardee',
    condition: (history) => history.length >= 1,
  },
  {
    id: 'explorer',
    label: 'Explorateur',
    emoji: '🌍',
    desc: '3 competences differentes',
    condition: (history) => new Set(history.map((e) => e.skill)).size >= 3,
  },
  {
    id: 'scientist',
    label: 'Petit Scientifique',
    emoji: '🔬',
    desc: 'Regarder une video Sciences',
    condition: (history) => history.some((e) => e.category === 'Sciences'),
  },
  {
    id: 'linguist',
    label: 'Linguiste',
    emoji: '🗣',
    desc: 'Regarder une video Langues',
    condition: (history) => history.some((e) => e.category === 'Langues'),
  },
  {
    id: 'nature_lover',
    label: 'Ami Nature',
    emoji: '🌿',
    desc: 'Regarder une video Nature',
    condition: (history) => history.some((e) => e.category === 'Nature'),
  },
];

function AnimatedSection({ children }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, []);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

function ChildHeader({ childName, ageGroup, minutesLeft, theme }) {
  return (
    <View style={[styles.heroCard, { backgroundColor: theme.heroBg }] }>
      <Text style={styles.heroTitle}>MiniCine</Text>
      <Text style={[styles.heroSubtitle, { color: theme.heroSub }]}>Coffre-fort de videos educatives</Text>
      <Text style={styles.heroMeta}>Profil: {childName}</Text>
      <Text style={styles.heroMeta}>Tranche d'age: {ageGroup}</Text>
      <Text style={styles.heroMeta}>Temps restant aujourd'hui: {minutesLeft} min</Text>
    </View>
  );
}

function VideoCard({ video, onWatch, locked, theme }) {
  return (
    <View style={styles.videoCard}>
      <View style={styles.videoTopRow}>
        <Text style={styles.videoTitle}>{video.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{video.minutes} min</Text>
        </View>
      </View>
      <Text style={styles.videoMeta}>{video.category}</Text>
      <Text style={styles.videoMeta}>Objectif: {video.skill}</Text>
      <Pressable
        disabled={locked}
        onPress={() => onWatch(video)}
        style={[styles.watchButton, { backgroundColor: locked ? '#b8b8b8' : theme.secondary }]}
      >
        <Text style={styles.watchButtonText}>{locked ? 'Limite atteinte' : 'Regarder'}</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('enfant');
  const [themeKey, setThemeKey] = useState('soleil');
  const [childName, setChildName] = useState('Youssef');
  const [childAgeGroup, setChildAgeGroup] = useState('6-8');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [maxDailyMinutes, setMaxDailyMinutes] = useState(40);
  const [minutesWatchedToday, setMinutesWatchedToday] = useState(0);
  const [watchHistory, setWatchHistory] = useState([]);
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [quizVideo, setQuizVideo] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [playerVideo, setPlayerVideo] = useState(null);
  const [capsuleStep, setCapsuleStep] = useState(0);
  const [pendingQuizVideo, setPendingQuizVideo] = useState(null);
  const [pendingBadgeMessage, setPendingBadgeMessage] = useState('');

  const [parentPin, setParentPin] = useState(PARENT_DEFAULT_PIN);
  const [pinInput, setPinInput] = useState('');
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newLimitInput, setNewLimitInput] = useState('40');

  const loadedRef = useRef(false);

  useEffect(() => {
    Storage.multiGet(['childName', 'childAgeGroup', 'maxDailyMinutes', 'parentPin', 'watchHistory', 'badges', 'themeKey'])
      .then((pairs) => {
        const data = {};
        for (const [key, value] of pairs) {
          if (value !== null) data[key] = value;
        }
        if (data.childName) setChildName(data.childName);
        if (data.childAgeGroup) setChildAgeGroup(data.childAgeGroup);
        if (data.maxDailyMinutes) setMaxDailyMinutes(Number(data.maxDailyMinutes));
        if (data.parentPin) setParentPin(data.parentPin);
        if (data.watchHistory) setWatchHistory(JSON.parse(data.watchHistory));
        if (data.badges) setUnlockedBadges(JSON.parse(data.badges));
        if (data.themeKey && THEMES[data.themeKey]) setThemeKey(data.themeKey);
        loadedRef.current = true;
      })
      .catch(() => { loadedRef.current = true; });
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    Storage.multiSet([
      ['childName', childName],
      ['childAgeGroup', childAgeGroup],
      ['maxDailyMinutes', String(maxDailyMinutes)],
      ['watchHistory', JSON.stringify(watchHistory)],
      ['badges', JSON.stringify(unlockedBadges)],
      ['themeKey', themeKey],
    ]).catch(() => {});
  }, [childName, childAgeGroup, maxDailyMinutes, watchHistory, unlockedBadges, themeKey]);

  useEffect(() => {
    if (!playerVideo) return undefined;
    setCapsuleStep(0);

    const totalSteps = playerVideo.slides?.length || playerVideo.lessonPoints?.length || 1;
    const timer = setInterval(() => {
      setCapsuleStep((prev) => {
        if (prev >= totalSteps - 1) return prev;
        return prev + 1;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [playerVideo]);

  const minutesLeft = Math.max(0, maxDailyMinutes - minutesWatchedToday);
  const lockedByTime = minutesLeft <= 0;
  const activeTheme = THEMES[themeKey] || THEMES.soleil;

  const availableVideos = useMemo(() => {
    return WHITELISTED_VIDEOS.filter((video) => {
      const ageOk = video.ageGroup === childAgeGroup;
      const categoryOk = selectedCategory === 'Tous' || video.category === selectedCategory;
      return ageOk && categoryOk;
    });
  }, [childAgeGroup, selectedCategory]);

  const educationalScore = useMemo(() => {
    const uniqueSkills = new Set(watchHistory.map((entry) => entry.skill)).size;
    return Math.min(100, uniqueSkills * 20 + watchHistory.length * 5);
  }, [watchHistory]);

  const quizQuestions = useMemo(() => getQuizQuestions(quizVideo), [quizVideo]);
  const currentQuizQuestion = quizQuestions[quizIndex];

  const handleWatch = (video) => {
    if (minutesLeft < video.minutes) {
      Alert.alert(
        'Temps insuffisant',
        `Il reste ${minutesLeft} min aujourd'hui. Cette video dure ${video.minutes} min.`
      );
      return;
    }

    const newEntry = {
      id: `${Date.now()}`,
      title: video.title,
      skill: video.skill,
      category: video.category,
      minutes: video.minutes,
    };
    const newHistory = [newEntry, ...watchHistory];

    setMinutesWatchedToday((prev) => prev + video.minutes);
    setWatchHistory(newHistory);

    const newBadges = BADGE_DEFINITIONS.filter(
      (b) => !unlockedBadges.includes(b.id) && b.condition(newHistory)
    );
    if (newBadges.length > 0) {
      setUnlockedBadges((prev) => [...prev, ...newBadges.map((b) => b.id)]);
    }

    const badgeMsg = newBadges.length > 0
      ? `Badge debloque : ${newBadges.map((b) => b.emoji + ' ' + b.label).join(', ')}`
      : '';

    setPendingBadgeMessage(badgeMsg);
    setPendingQuizVideo(video.quiz ? video : null);
    setPlayerVideo(video);
  };

  const closePlayer = () => {
    setPlayerVideo(null);
    setCapsuleStep(0);
    if (pendingQuizVideo) {
      setQuizVideo(pendingQuizVideo);
      setQuizIndex(0);
      setQuizScore(0);
      setQuizFinished(false);
      setPendingQuizVideo(null);
      return;
    }

    const message = pendingBadgeMessage
      ? `Video terminee. ${pendingBadgeMessage}`
      : 'Video terminee. Bravo !';

    setPendingBadgeMessage('');
    Alert.alert('Bonne seance !', message);
  };

  const unlockParentArea = () => {
    if (pinInput === parentPin) {
      setParentUnlocked(true);
      setPinInput('');
      return;
    }
    Alert.alert('PIN incorrect', 'Verifie le code parent.');
  };

  const saveParentSettings = () => {
    const parsedLimit = Number.parseInt(newLimitInput, 10);
    if (Number.isNaN(parsedLimit) || parsedLimit < 5 || parsedLimit > 180) {
      Alert.alert('Valeur invalide', 'La limite doit etre entre 5 et 180 minutes.');
      return;
    }

    setMaxDailyMinutes(parsedLimit);

    if (newPin.trim().length === 4) {
      const trimmedPin = newPin.trim();
      setParentPin(trimmedPin);
      Storage.setItem('parentPin', trimmedPin).catch(() => {});
      setNewPin('');
    }

    Alert.alert('Sauvegarde terminee', 'Les parametres parent ont ete mis a jour.');
  };

  const resetDailyTime = () => {
    setMinutesWatchedToday(0);
    Alert.alert('Temps reinitialise', 'Le compteur de la journee repart a zero.');
  };

  const nextCapsuleStep = () => {
    const totalSteps = playerVideo?.slides?.length || playerVideo?.lessonPoints?.length || 1;
    if (capsuleStep >= totalSteps - 1) {
      closePlayer();
      return;
    }
    setCapsuleStep((prev) => prev + 1);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeTheme.screenBg }] }>
      <StatusBar style="dark" />
      <View style={[styles.backgroundShapeTop, { backgroundColor: activeTheme.shapeTop }]} />
      <View style={[styles.backgroundShapeBottom, { backgroundColor: activeTheme.shapeBottom }]} />

      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setActiveTab('enfant')}
          style={[styles.tabButton, { backgroundColor: activeTab === 'enfant' ? activeTheme.activeTabBg : activeTheme.inactiveTabBg }]}
        >
          <Text style={[styles.tabText, activeTab === 'enfant' && styles.tabTextActive]}>Mode Enfant</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('parent')}
          style={[styles.tabButton, { backgroundColor: activeTab === 'parent' ? activeTheme.activeTabBg : activeTheme.inactiveTabBg }]}
        >
          <Text style={[styles.tabText, activeTab === 'parent' && styles.tabTextActive]}>Espace Parent</Text>
        </Pressable>
      </View>

      {activeTab === 'enfant' ? (
        <ScrollView contentContainerStyle={styles.container}>
          <AnimatedSection>
            <ChildHeader childName={childName} ageGroup={childAgeGroup} minutesLeft={minutesLeft} theme={activeTheme} />
          </AnimatedSection>

          <AnimatedSection>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Filtres securises</Text>
              <Text style={styles.cardLabel}>Age</Text>
              <View style={styles.inlineWrap}>
                {AGE_GROUPS.map((group) => {
                  const active = group === childAgeGroup;
                  return (
                    <Pressable
                      key={group}
                      onPress={() => setChildAgeGroup(group)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{group}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.cardLabel}>Categorie</Text>
              <View style={styles.inlineWrap}>
                {['Tous', ...CATEGORIES].map((category) => {
                  const active = category === selectedCategory;
                  return (
                    <Pressable
                      key={category}
                      onPress={() => setSelectedCategory(category)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{category}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </AnimatedSection>

          <AnimatedSection>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Catalogue valide</Text>
              {availableVideos.length === 0 ? (
                <Text style={styles.mutedText}>Aucune video pour ce filtre.</Text>
              ) : (
                availableVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onWatch={handleWatch}
                    locked={lockedByTime}
                    theme={activeTheme}
                  />
                ))
              )}
            </View>
          </AnimatedSection>

          <AnimatedSection>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mes badges</Text>
              {unlockedBadges.length === 0 ? (
                <Text style={styles.mutedText}>Regarde des videos pour debloquer tes premiers badges !</Text>
              ) : (
                <View style={styles.badgesWrap}>
                  {BADGE_DEFINITIONS.filter((b) => unlockedBadges.includes(b.id)).map((b) => (
                    <View key={b.id} style={styles.badgeChip}>
                      <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                      <Text style={styles.badgeChipLabel}>{b.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.mutedText}>{unlockedBadges.length}/{BADGE_DEFINITIONS.length} badges obtenus</Text>
            </View>
          </AnimatedSection>

          <AnimatedSection>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Parcours educatif</Text>
              <Text style={styles.cardText}>Score progression: {educationalScore}/100</Text>
              <Text style={styles.cardText}>Videos vues aujourd'hui: {watchHistory.length}</Text>
              {watchHistory.slice(0, 4).map((entry) => (
                <Text key={entry.id} style={styles.historyItem}>
                  - {entry.title} ({entry.minutes} min)
                </Text>
              ))}
            </View>
          </AnimatedSection>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {!parentUnlocked ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Verification Parent</Text>
              <Text style={styles.mutedText}>Saisis le PIN pour acceder aux reglages.</Text>
              <TextInput
                value={pinInput}
                onChangeText={setPinInput}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                style={styles.input}
                placeholder="PIN 4 chiffres"
                placeholderTextColor="#8a8a8a"
              />
              <Pressable onPress={unlockParentArea} style={[styles.primaryButton, { backgroundColor: activeTheme.primary }]}>
                <Text style={styles.primaryButtonText}>Debloquer</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Parametres Parent</Text>
                <Text style={styles.cardLabel}>Nom profil enfant</Text>
                <TextInput
                  value={childName}
                  onChangeText={setChildName}
                  style={styles.input}
                  placeholder="Prenom"
                  placeholderTextColor="#8a8a8a"
                />

                <Text style={styles.cardLabel}>Limite quotidienne (min)</Text>
                <TextInput
                  value={newLimitInput}
                  onChangeText={setNewLimitInput}
                  keyboardType="number-pad"
                  style={styles.input}
                />

                <Text style={styles.cardLabel}>Nouveau PIN (optionnel)</Text>
                <TextInput
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  style={styles.input}
                  placeholder="4 chiffres"
                  placeholderTextColor="#8a8a8a"
                />

                <Text style={styles.cardLabel}>Theme visuel</Text>
                <View style={styles.inlineWrap}>
                  {Object.entries(THEMES).map(([key, theme]) => {
                    const active = key === themeKey;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setThemeKey(key)}
                        style={[styles.chip, active && styles.chipActive, styles.themeChip]}
                      >
                        <View style={[styles.themeDot, { backgroundColor: theme.activeTabBg }]} />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{theme.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable onPress={saveParentSettings} style={[styles.primaryButton, { backgroundColor: activeTheme.primary }]}>
                  <Text style={styles.primaryButtonText}>Enregistrer</Text>
                </Pressable>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Suivi & Controle</Text>
                <Text style={styles.cardText}>Temps utilise: {minutesWatchedToday} min</Text>
                <Text style={styles.cardText}>Temps restant: {minutesLeft} min</Text>
                <Text style={styles.cardText}>Contenu propose: liste blanche uniquement</Text>
                <Pressable onPress={resetDailyTime} style={[styles.secondaryButton, { backgroundColor: activeTheme.secondary }]}>
                  <Text style={styles.secondaryButtonText}>Reinitialiser la journee</Text>
                </Pressable>
                <Pressable
                  onPress={() => setParentUnlocked(false)}
                  style={[styles.secondaryButton, styles.logoutButton]}
                >
                  <Text style={styles.secondaryButtonText}>Verrouiller espace parent</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={playerVideo !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.playerCard}>
            <Text style={styles.playerTitle}>{playerVideo?.title}</Text>
            <Text style={styles.playerSummary}>{playerVideo?.summary}</Text>
            <View style={styles.lessonProgressTrack}>
              <View
                style={[
                  styles.lessonProgressFill,
                  {
                    width: `${
                      (playerVideo?.slides?.length || playerVideo?.lessonPoints?.length)
                        ? Math.round(
                            ((capsuleStep + 1) /
                              (playerVideo?.slides?.length || playerVideo?.lessonPoints?.length)) *
                              100
                          )
                        : 100
                    }%`,
                  },
                ]}
              />
            </View>
            {playerVideo?.slides?.length ? (
              <View style={styles.slideCard}>
                <Image
                  source={{ uri: playerVideo.slides[capsuleStep]?.image }}
                  style={styles.slideImage}
                  resizeMode="cover"
                />
                <Text style={styles.slideCaption}>{playerVideo.slides[capsuleStep]?.caption}</Text>
              </View>
            ) : null}
            {playerVideo?.lessonPoints?.length ? (
              <View style={styles.lessonBox}>
                <Text style={styles.lessonTitle}>Capsule pedagogique</Text>
                <Text style={styles.lessonStepText}>
                  Etape {capsuleStep + 1}/{playerVideo?.slides?.length || playerVideo.lessonPoints.length}
                </Text>
                <Text style={styles.lessonItem}>{playerVideo.lessonPoints[capsuleStep]}</Text>
              </View>
            ) : null}
            <Pressable style={[styles.secondaryButton, { backgroundColor: activeTheme.secondary }]} onPress={nextCapsuleStep}>
              <Text style={styles.secondaryButtonText}>
                {(playerVideo?.slides?.length || playerVideo?.lessonPoints?.length) &&
                capsuleStep < (playerVideo?.slides?.length || playerVideo?.lessonPoints?.length) - 1
                  ? 'Point suivant'
                  : 'Passer au quiz'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={quizVideo !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {!quizFinished ? (
              <>
                <Text style={styles.quizTitle}>Mini Quiz</Text>
                <Text style={styles.quizSub}>Apres avoir regarde :</Text>
                <Text style={styles.quizVideoTitle}>{quizVideo?.title}</Text>
                <Text style={styles.quizCount}>
                  Question {quizIndex + 1}/{quizQuestions.length}
                </Text>
                <Text style={styles.quizQuestion}>{currentQuizQuestion?.question || ''}</Text>
                {(currentQuizQuestion?.choices || []).map((choice, idx) => (
                    <Pressable
                      key={idx}
                      style={styles.quizChoice}
                      onPress={() => {
                        const isCorrect = currentQuizQuestion?.correct === idx;
                        const nextScore = isCorrect ? quizScore + 1 : quizScore;

                        if (quizIndex < quizQuestions.length - 1) {
                          setQuizScore(nextScore);
                          setQuizIndex((prev) => prev + 1);
                          return;
                        }

                        setQuizScore(nextScore);
                        setQuizFinished(true);
                      }}
                    >
                      <Text style={styles.quizChoiceText}>{choice}</Text>
                    </Pressable>
                  ))}
                <Pressable
                  onPress={() => {
                    setQuizVideo(null);
                    setQuizIndex(0);
                    setQuizScore(0);
                    setQuizFinished(false);
                  }}
                  style={styles.quizSkip}
                >
                  <Text style={styles.quizSkipText}>Passer le quiz</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.quizResultEmoji}>{quizScore >= Math.ceil(quizQuestions.length / 2) ? '🌟' : '💪'}</Text>
                <Text style={styles.quizResultTitle}>Score: {quizScore}/{quizQuestions.length}</Text>
                <Text style={styles.quizSub}>
                  {quizScore === quizQuestions.length
                    ? 'Excellent ! Toutes les reponses sont justes.'
                    : quizScore >= Math.ceil(quizQuestions.length / 2)
                    ? 'Bravo ! Tu as bien compris la capsule.'
                    : 'Continue, tu progresses bien.'}
                </Text>
                <Pressable
                  style={styles.watchButton}
                  onPress={() => {
                    setQuizVideo(null);
                    setQuizIndex(0);
                    setQuizScore(0);
                    setQuizFinished(false);
                    const message = pendingBadgeMessage
                      ? `Quiz termine (${quizScore}/${quizQuestions.length}). ${pendingBadgeMessage}`
                      : `Quiz termine (${quizScore}/${quizQuestions.length}). Continue ton aventure !`;
                    setPendingBadgeMessage('');
                    Alert.alert('Super !', message);
                  }}
                >
                  <Text style={styles.watchButtonText}>Continuer</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff6e9',
  },
  backgroundShapeTop: {
    position: 'absolute',
    right: -30,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffd181',
    opacity: 0.35,
  },
  backgroundShapeBottom: {
    position: 'absolute',
    left: -50,
    bottom: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#9bd7ff',
    opacity: 0.25,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#f1e7d5',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ff9f43',
  },
  tabText: {
    color: '#5b4a2f',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#2f1b00',
  },
  container: {
    padding: 14,
    paddingBottom: 26,
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#24444a',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroTitle: {
    color: '#fff9ec',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    color: '#e8ffd3',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '700',
  },
  heroMeta: {
    color: '#f4f7ef',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    backgroundColor: '#fffdf8',
    borderColor: '#f0dcc0',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2f2b24',
  },
  cardLabel: {
    marginTop: 4,
    fontWeight: '700',
    color: '#5d4e34',
  },
  cardText: {
    color: '#50493f',
    fontWeight: '600',
  },
  inlineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#ece0ce',
    borderColor: '#dcc7a8',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: '#ffc562',
    borderColor: '#ff9f43',
  },
  chipText: {
    color: '#58472d',
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#2d1b00',
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  videoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efd8bb',
    backgroundColor: '#fff7eb',
    padding: 12,
    gap: 6,
  },
  videoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  videoTitle: {
    flex: 1,
    color: '#2a261f',
    fontSize: 15,
    fontWeight: '800',
  },
  videoMeta: {
    color: '#6a6156',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#d6f5d0',
    borderColor: '#9ed69a',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#204e1b',
    fontWeight: '800',
    fontSize: 12,
  },
  watchButton: {
    marginTop: 4,
    backgroundColor: '#2f8f83',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  watchButtonLocked: {
    backgroundColor: '#b8b8b8',
  },
  watchButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  mutedText: {
    color: '#7f786d',
    fontWeight: '600',
  },
  historyItem: {
    color: '#60574b',
    fontWeight: '600',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d7c3a3',
    backgroundColor: '#fffaf2',
    color: '#332a1f',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ff9f43',
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#2f1b00',
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#2f8f83',
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: '#f5fff8',
    fontWeight: '800',
  },
  logoutButton: {
    backgroundColor: '#a9684f',
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeChip: {
    backgroundColor: '#ffe0a0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#ffcc66',
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeChipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3a2a00',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  playerCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 20,
    padding: 14,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  playerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2a261f',
    textAlign: 'center',
  },
  playerSummary: {
    color: '#5f5648',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
  lessonProgressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#eadfc9',
    overflow: 'hidden',
  },
  lessonProgressFill: {
    height: '100%',
    backgroundColor: '#2f8f83',
    borderRadius: 999,
  },
  lessonBox: {
    backgroundColor: '#f8efd8',
    borderWidth: 1,
    borderColor: '#ecd8a8',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  slideCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e4d6bf',
    backgroundColor: '#fff',
  },
  slideImage: {
    width: '100%',
    height: 170,
  },
  slideCaption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#544a3b',
    fontWeight: '700',
    fontSize: 13,
  },
  lessonTitle: {
    fontWeight: '800',
    color: '#4b3a1e',
    fontSize: 13,
  },
  lessonStepText: {
    color: '#7b6642',
    fontWeight: '700',
    fontSize: 12,
  },
  lessonItem: {
    color: '#5f4a27',
    fontWeight: '600',
    fontSize: 15,
  },
  quizTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2f2b24',
    textAlign: 'center',
  },
  quizSub: {
    color: '#7f786d',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
  quizVideoTitle: {
    color: '#24444a',
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 15,
  },
  quizQuestion: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2a261f',
    textAlign: 'center',
    marginVertical: 8,
  },
  quizCount: {
    textAlign: 'center',
    color: '#7b6642',
    fontWeight: '700',
    fontSize: 12,
  },
  quizChoice: {
    backgroundColor: '#f0e9da',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0d4c0',
  },
  quizChoiceText: {
    fontWeight: '800',
    color: '#2a261f',
    fontSize: 15,
  },
  quizSkip: {
    alignItems: 'center',
    padding: 8,
  },
  quizSkipText: {
    color: '#9f9487',
    fontWeight: '600',
    fontSize: 13,
  },
  quizResultEmoji: {
    textAlign: 'center',
    fontSize: 60,
  },
  quizResultTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#2f2b24',
  },
});
