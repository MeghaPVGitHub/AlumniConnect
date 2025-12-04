import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { initializeApp } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    increment,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import {
    ArrowLeft,
    Briefcase,
    Calendar,
    ChevronRight,
    FileText,
    Heart,
    Home,
    Image as ImageIcon,
    LayoutDashboard,
    Menu,
    MessageSquare,
    Moon,
    PlusCircle,
    Send,
    Sparkles,
    Sun,
    ThumbsUp,
    User,
    Users,
    X
} from 'lucide-react-native';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBssAz87jCPmDNMZ5b_VVgzr0pQctvINZA", 
  authDomain: "alumni-connect-system.firebaseapp.com",
  projectId: "alumni-connect-system",
  storageBucket: "alumni-connect-system.firebasestorage.app",
  messagingSenderId: "707277154710",
  appId: "1:707277154710:web:37af2bd2e1c1c94804d5b7"
};

const GOOGLE_AI_API_KEY = "AIzaSyByoQBzcRJkuKMPQCj-u_Vlm9iwGBkZW9o"; 
const GEMINI_MODEL = "gemini-2.5-flash"; 
const MATCH_SCORE_API_URL = "https://Megzz22-alumni-connect-api.hf.space"; 
const JOB_RECOMMENDATION_API_URL = "https://MeghaCS-JobRecommendation.hf.space/recommend";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- THEMES ---
const lightTheme = {
  mode: 'light',
  background: '#f8f9fa',
  card: '#ffffff',
  text: '#111827',
  subText: '#6b7280',
  border: '#e5e7eb',
  primary: '#2563EB',
  inputBg: '#ffffff',
  tint: '#f3f4f6',
  successBg: '#DCFCE7',
  successText: '#166534',
  dangerBg: '#fee2e2',
  dangerText: '#dc2626'
};

const darkTheme = {
  mode: 'dark',
  background: '#111827', // Very dark grey/blue
  card: '#1F2937',       // Dark grey
  text: '#f9fafb',       // White-ish
  subText: '#9ca3af',    // Light grey
  border: '#374151',
  primary: '#3B82F6',    // Slightly lighter blue for dark mode
  inputBg: '#374151',
  tint: '#374151',
  successBg: '#064e3b',
  successText: '#a7f3d0',
  dangerBg: '#7f1d1d',
  dangerText: '#fca5a5'
};

// --- CONTEXT ---
const AppContext = createContext();
const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbInstance, setDbInstance] = useState(db);
  const [authInstance, setAuthInstance] = useState(auth);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const appId = "default-app-id";
  
  // Theme Management
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === 'dark');
  const theme = isDarkMode ? darkTheme : lightTheme;

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ user, dbInstance, authInstance, isAuthReady, appId, theme, isDarkMode, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
};
const useAppContext = () => useContext(AppContext);

// --- API HELPERS ---
const cleanAIResponse = (text) => {
  const firstOpen = text.indexOf('{');
  const lastClose = text.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    return text.substring(firstOpen, lastClose + 1);
  }
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const extractResumeData = async (base64Data, mimeType) => {
  if (!GOOGLE_AI_API_KEY) {
    Alert.alert("Config Error", "Google AI API Key is missing.");
    return null;
  }
  
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`;
  
  const prompt = `Analyze this resume. Extract the following fields strictly as a JSON object: 
  "name" (string), 
  "graduationYear" (number or string), 
  "branch" (string), 
  "universityId" (string, look for USN or Roll Number),
  "skills" (array of strings), 
  "education" (array of objects with degree, institution, year), 
  "experience" (array of objects with role, company, startDate, endDate, description).
  Return ONLY valid JSON.`;
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }]
      })
    });

    if (!response.ok) {
        Alert.alert("Parsing Failed", "AI Service Error.");
        return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if(!candidate) return null;
    
    return JSON.parse(cleanAIResponse(candidate));
  } catch (error) {
    console.error("Resume Parse Exception:", error);
    return null;
  }
};

const getAIJobRecommendations = async (userProfile, jobs) => {
  if (!JOB_RECOMMENDATION_API_URL || !userProfile || !jobs.length) return [];
  try {
    const response = await fetch(JOB_RECOMMENDATION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_profile: {
          skills: (userProfile.skills || []).join('|'),
          branch: userProfile.branch || '',
        },
        jobs: jobs.map(job => ({
          id: job.id,
          skills: (job.skills || []).join('|'),
          branch: job.branch || '',
        })),
      })
    });
    const recommendedIds = await response.json();
    return Array.isArray(recommendedIds) ? recommendedIds : [];
  } catch (error) {
    return [];
  }
};

const getUserProfile = async (userId, appId) => {
  if (!userId) return null;
  try {
    const snap = await getDoc(doc(db, `artifacts/${appId}/public/data/users`, userId));
    return snap.exists() ? { ...snap.data(), id: userId } : null;
  } catch (e) { return null; }
};

// --- COMPONENTS ---

const ContributionModal = ({ visible, onClose }) => {
  const { theme } = useAppContext();
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync("admin@university.upi");
    Alert.alert("Copied", "UPI ID copied to clipboard!");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.modalHeader, { borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Alumni Contribution</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={theme.text} /></TouchableOpacity>
          </View>
          <View style={{alignItems: 'center', marginVertical: 20}}>
            <Text style={{textAlign: 'center', color: theme.subText, marginBottom: 20}}>
              Support our alumni trust. Scan the QR code or use the UPI ID below.
            </Text>
            <View style={{padding: 10, backgroundColor: '#fff', borderRadius: 10, elevation: 3, marginBottom: 20}}>
               <Image 
                 source={{uri: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=admin@university.upi&pn=AlumniTrust'}} 
                 style={{width: 180, height: 180}} 
               />
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: theme.tint, padding: 10, borderRadius: 8, width: '100%'}}>
              <Text style={{flex: 1, color: theme.text, fontWeight: 'bold'}}>admin@university.upi</Text>
              <TouchableOpacity onPress={copyToClipboard} style={{padding: 5}}>
                <View style={{backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5}}>
                   <Text style={{color: '#fff', fontSize: 12}}>Copy</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Chatbot = ({ isOpen, onClose }) => {
  const { theme } = useAppContext();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef();

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`;
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Act as an Alumni Assistant. Answer: ${input}` }] }] })
      });
      const data = await res.json();
      const botMsg = { role: 'bot', text: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I didn't get that." };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: "Error connecting to AI." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <Modal animationType="slide" visible={isOpen} onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>ACBot Assistant</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color={theme.text} /></TouchableOpacity>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <View style={[styles.chatBubble, item.role === 'user' ? { backgroundColor: theme.primary, alignSelf: 'flex-end', borderBottomRightRadius: 2 } : { backgroundColor: theme.tint, alignSelf: 'flex-start', borderBottomLeftRadius: 2 }]}>
              <Text style={item.role === 'user' ? { color: '#fff' } : { color: theme.text }}>{item.text}</Text>
            </View>
          )}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
          <View style={[styles.chatInputArea, { borderColor: theme.border }]}>
            <TextInput 
              style={[styles.chatInput, { backgroundColor: theme.tint, color: theme.text }]} 
              placeholderTextColor={theme.subText}
              value={input} 
              onChangeText={setInput} 
              placeholder="Ask anything..." 
            />
            <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: theme.primary }]}><Send size={20} color="#fff" /></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// --- SCREENS ---

// Auth Screen with Theme
const AuthScreen = ({ onNavigate }) => {
  const { authInstance, dbInstance, appId, theme } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [resumeData, setResumeData] = useState(null);

  const handleResume = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ 
        type: ['application/pdf', 'image/jpeg', 'image/png'], 
        copyToCacheDirectory: true 
      });
      
      if (res.canceled) return;
      
      const asset = res.assets[0];
      let mimeType = asset.mimeType;
      // Mime Fallback
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (asset.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
        else mimeType = 'image/jpeg';
      }

      setParsing(true);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const data = await extractResumeData(base64, mimeType);
      
      if (data) {
        setResumeData(data);
        if (data.name) setName(data.name);
        Alert.alert("Success", `Resume Parsed for ${data.name || 'User'}!`);
      } else {
        Alert.alert("Error", "Could not extract data.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to process resume file.");
    } finally {
      setParsing(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(authInstance, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(authInstance, email, password);
        await setDoc(doc(dbInstance, `artifacts/${appId}/public/data/users`, cred.user.uid), {
          name: name || 'User',
          email, 
          role, 
          createdAt: serverTimestamp(),
          skills: resumeData?.skills || [],
          education: resumeData?.education || [],
          experience: resumeData?.experience || [],
          branch: resumeData?.branch || '',
          graduationYear: resumeData?.graduationYear || '',
          universityId: resumeData?.universityId || '',
          profilePictureUrl: null
        });
      }
      onNavigate('home');
    } catch (e) { Alert.alert("Error", e.message); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={[styles.centerScroll, { backgroundColor: theme.background }]}>
      <Text style={[styles.headerText, { color: theme.primary }]}>{isLogin ? "Welcome Back" : "Join AlumniConnect"}</Text>
      {!isLogin && (
        <>
          <View style={styles.roleRow}>
            {['student', 'alumni'].map(r => (
              <TouchableOpacity key={r} onPress={() => setRole(r)} style={[styles.roleBtn, { borderColor: theme.border }, role === r && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                <Text style={[styles.roleText, { color: theme.subText }, role === r && { color: '#fff' }]}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {role === 'student' && (
            <TouchableOpacity onPress={handleResume} style={[styles.uploadBtn, { borderColor: theme.border }]}>
              {parsing ? <ActivityIndicator color={theme.text}/> : <FileText size={20} color={theme.text}/>}
              <Text style={{marginLeft: 10, color: theme.text}}>{parsing ? "Analyzing..." : "Auto-fill with Resume"}</Text>
            </TouchableOpacity>
          )}
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholderTextColor={theme.subText} placeholder="Full Name" value={name} onChangeText={setName} />
        </>
      )}
      <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholderTextColor={theme.subText} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none"/>
      <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholderTextColor={theme.subText} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry/>
      <TouchableOpacity onPress={submit} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
        {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>{isLogin ? "Login" : "Sign Up"}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}><Text style={[styles.link, { color: theme.primary }]}>{isLogin ? "Create Account" : "Back to Login"}</Text></TouchableOpacity>
    </ScrollView>
  );
};

// Dashboard Screen with Theme
const Dashboard = ({ onNavigate }) => {
  const { dbInstance, appId, user, theme } = useAppContext();
  const [activeTab, setActiveTab] = useState('summary');
  const [items, setItems] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ alumni: 0, jobs: 0, events: 0 });
  const [recommendations, setRecommendations] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ title: '', company: '', description: '', location: '', date: '', skills: '' });
  
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const profile = await getUserProfile(user.uid, appId);
      setUserProfile(profile);

      const usersSnap = await getDocs(query(collection(dbInstance, `artifacts/${appId}/public/data/users`), where('role', '==', 'alumni')));
      const jobsSnap = await getDocs(collection(dbInstance, `artifacts/${appId}/public/data/jobs`));
      const eventsSnap = await getDocs(collection(dbInstance, `artifacts/${appId}/public/data/events`));
      setStats({ alumni: usersSnap.size, jobs: jobsSnap.size, events: eventsSnap.size });

      let collectionName = activeTab === 'summary' ? 'jobs' : activeTab;
      if (activeTab === 'posts') collectionName = 'posts';

      const q = query(collection(dbInstance, `artifacts/${appId}/public/data/${collectionName}`), orderBy('postedAt', 'desc'));
      const snap = await getDocs(q);
      let fetchedItems = snap.docs.map(d => ({id: d.id, ...d.data()}));

      if (activeTab === 'summary' && profile) {
         const recIds = await getAIJobRecommendations(profile, fetchedItems);
         if(recIds.length > 0) {
            const recMap = new Map(fetchedItems.map(i => [i.id, i]));
            setRecommendations(recIds.map(id => recMap.get(id)).filter(Boolean));
         } else {
             const ranked = fetchedItems.filter(j => j.type !== 'event').map(job => {
                 let score = 0;
                 if(job.branch === profile.branch) score += 50;
                 if(profile.skills && job.skills) {
                     const jobSkills = Array.isArray(job.skills) ? job.skills : [];
                     const matches = jobSkills.filter(s => profile.skills.includes(s));
                     score += matches.length * 10;
                 }
                 return { ...job, matchScore: score };
             }).sort((a,b) => b.matchScore - a.matchScore);
             setRecommendations(ranked.slice(0, 3));
         }
      } else {
         setItems(fetchedItems);
      }
      setLoading(false);
    };
    load();
  }, [user, activeTab]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      setPostImage(result.assets[0]);
    }
  };

  const handlePost = async () => {
      if (!userProfile) return;
      const collectionName = activeTab === 'posts' ? 'posts' : (activeTab === 'jobs' ? 'jobs' : 'events');
      let payload = {
          postedBy: userProfile.name || 'Anonymous', 
          postedById: user.uid, 
          postedAt: serverTimestamp(),
      };

      if (activeTab === 'posts') {
          payload = { ...payload, content: postContent, likes: 0, comments: [] };
          if(postImage) payload.mediaUrl = "data:image/jpeg;base64," + postImage.base64; 
      } else {
          payload = { ...payload, ...form, registrationCount: 0 };
          if(activeTab === 'jobs') payload.skills = form.skills.split(',').map(s => s.trim());
      }

      await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/${collectionName}`), payload);
      setModalVisible(false); setForm({}); setPostContent(''); setPostImage(null);
      Alert.alert("Success", "Posted!");
  };

  const handleRegister = async (event) => {
      const regRef = doc(dbInstance, `artifacts/${appId}/public/data/events/${event.id}/registrations`, user.uid);
      const eventRef = doc(dbInstance, `artifacts/${appId}/public/data/events`, event.id);
      const snap = await getDoc(regRef);
      if(snap.exists()) { Alert.alert("Info", "Already registered!"); return; }
      const batch = writeBatch(dbInstance);
      batch.set(regRef, { uid: user.uid, name: userProfile.name, timestamp: serverTimestamp() });
      batch.update(eventRef, { registrationCount: increment(1) });
      await batch.commit();
      Alert.alert("Registered", `You are going to ${event.title}`);
  };

  const handleLike = async (post) => {
      await updateDoc(doc(dbInstance, `artifacts/${appId}/public/data/posts`, post.id), { likes: increment(1) });
  };

  const renderItem = ({item}) => {
      if(activeTab === 'posts') return (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}>
                  <View style={{width:32, height:32, borderRadius:16, backgroundColor: theme.tint, justifyContent:'center', alignItems:'center', marginRight:10}}>
                      <Text style={{fontWeight:'bold', color: theme.text}}>{item.postedBy?.[0]}</Text>
                  </View>
                  <View>
                      <Text style={{fontWeight:'bold', color: theme.text}}>{item.postedBy}</Text>
                      <Text style={{fontSize:10, color: theme.subText}}>Alumni</Text>
                  </View>
              </View>
              <Text style={[styles.cardBody, { color: theme.text }]}>{item.content}</Text>
              {item.mediaUrl && <Image source={{uri: item.mediaUrl}} style={{width:'100%', height:200, borderRadius:8, marginTop:10}} resizeMode="cover" />}
              <View style={{flexDirection:'row', borderTopWidth:1, borderTopColor: theme.border, marginTop:10, paddingTop:10}}>
                  <TouchableOpacity onPress={() => handleLike(item)} style={{flexDirection:'row', alignItems:'center', marginRight:20}}>
                      <ThumbsUp size={16} color={theme.subText}/>
                      <Text style={{marginLeft:5, color: theme.subText}}>{item.likes || 0} Likes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{flexDirection:'row', alignItems:'center'}}>
                      <MessageSquare size={16} color={theme.subText}/>
                      <Text style={{marginLeft:5, color: theme.subText}}>Comment</Text>
                  </TouchableOpacity>
              </View>
          </View>
      )
      
      return (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                {activeTab === 'jobs' ? <Briefcase size={16} color={theme.subText}/> : <Calendar size={16} color={theme.subText}/>}
            </View>
            <Text style={[styles.cardSub, { color: theme.subText }]}>{item.company || item.location}</Text>
            {item.matchScore > 0 && (
                <View style={{backgroundColor: theme.successBg, paddingHorizontal:8, paddingVertical:2, borderRadius:4, alignSelf:'flex-start', marginBottom:5}}>
                    <Text style={{color: theme.successText, fontSize:10, fontWeight:'bold'}}>{item.matchScore}% Match</Text>
                </View>
            )}
            <Text numberOfLines={3} style={[styles.cardBody, { color: theme.text }]}>{item.description}</Text>
            {activeTab === 'events' && (
                <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:10}}>
                    <Text style={{color: theme.subText}}>{item.registrationCount || 0} registered</Text>
                    <TouchableOpacity onPress={() => handleRegister(item)}><Text style={{color: theme.primary, fontWeight:'bold'}}>Register</Text></TouchableOpacity>
                </View>
            )}
            {activeTab === 'jobs' && (
                <TouchableOpacity style={{marginTop:10}}><Text style={{color: theme.primary}}>View & Apply</Text></TouchableOpacity>
            )}
        </View>
      );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.tabHeader, { backgroundColor: theme.card }]}>
        {['summary', 'jobs', 'events', 'posts'].map(t => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabText, { color: theme.subText }, activeTab === t && { color: theme.primary }]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'summary' ? (
          <ScrollView contentContainerStyle={{padding:15}}>
              <View style={styles.statsGrid}>
                  <View style={[styles.statBox, {backgroundColor: theme.tint}]}><Text style={[styles.statNum, {color: theme.primary}]}>{stats.alumni}</Text><Text style={{color: theme.subText}}>Alumni</Text></View>
                  <View style={[styles.statBox, {backgroundColor: theme.tint}]}><Text style={[styles.statNum, {color: theme.primary}]}>{stats.jobs}</Text><Text style={{color: theme.subText}}>Jobs</Text></View>
                  <View style={[styles.statBox, {backgroundColor: theme.tint}]}><Text style={[styles.statNum, {color: theme.primary}]}>{stats.events}</Text><Text style={{color: theme.subText}}>Events</Text></View>
                  <View style={[styles.statBox, {backgroundColor: theme.tint}]}><Text style={[styles.statNum, {color: theme.primary}]}>{userProfile?.experience?.length || 0}</Text><Text style={{color: theme.subText}}>Exp Yrs</Text></View>
              </View>

              <View style={[styles.aiBanner, { backgroundColor: '#FEF3C7' }]}>
                  <Sparkles size={20} color="#B45309"/>
                  <Text style={styles.aiBannerText}>Recommended Opportunities</Text>
              </View>

              {recommendations.map(job => (
                  <View key={job.id} style={[styles.card, { backgroundColor: theme.card }]}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>{job.title}</Text>
                      <Text style={[styles.cardSub, { color: theme.subText }]}>{job.company}</Text>
                      <TouchableOpacity onPress={() => setActiveTab('jobs')}><Text style={{color: theme.primary, marginTop:5}}>View Details</Text></TouchableOpacity>
                  </View>
              ))}
          </ScrollView>
      ) : (
        <>
            <FlatList
                data={items}
                keyExtractor={(i, index) => i.id ? i.id : index.toString()}
                contentContainerStyle={{padding: 15, paddingBottom: 100}}
                renderItem={renderItem}
            />
            {(userProfile?.role === 'alumni' || activeTab === 'posts') && (
                <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => setModalVisible(true)}>
                    <PlusCircle size={28} color="#fff" />
                </TouchableOpacity>
            )}
        </>
      )}

      {/* Post Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Create {activeTab === 'posts' ? 'Post' : (activeTab === 'jobs' ? 'Job' : 'Event')}</Text>
                
                {activeTab === 'posts' ? (
                    <>
                        <TextInput style={[styles.input, {height:100, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}]} placeholderTextColor={theme.subText} placeholder="What's on your mind?" multiline value={postContent} onChangeText={setPostContent}/>
                        <TouchableOpacity onPress={pickImage} style={{flexDirection:'row', alignItems:'center', padding:10}}>
                            <ImageIcon size={20} color={theme.primary}/>
                            <Text style={{marginLeft:10, color: theme.primary}}>{postImage ? 'Image Selected' : 'Add Image'}</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholderTextColor={theme.subText} placeholder="Title" value={form.title} onChangeText={t=>setForm({...form, title:t})}/>
                        {activeTab === 'jobs' ? (
                            <>
                                <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholderTextColor={theme.subText} placeholder="Company" value={form.company} onChangeText={t=>setForm({...form, company:t})}/>
                                <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholderTextColor={theme.subText} placeholder="Skills (comma sep)" value={form.skills} onChangeText={t=>setForm({...form, skills:t})}/>
                            </>
                        ) : (
                            <>
                                <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholderTextColor={theme.subText} placeholder="Location" value={form.location} onChangeText={t=>setForm({...form, location:t})}/>
                                <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholderTextColor={theme.subText} placeholder="Date (YYYY-MM-DD)" value={form.date} onChangeText={t=>setForm({...form, date:t})}/>
                            </>
                        )}
                        <TextInput style={[styles.input, {height:80, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}]} placeholderTextColor={theme.subText} placeholder="Description" multiline value={form.description} onChangeText={t=>setForm({...form, description:t})}/>
                    </>
                )}

                <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:15}}>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}><Text style={{color: theme.subText}}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handlePost} style={[styles.postBtn, { backgroundColor: theme.primary }]}><Text style={{color:'#fff'}}>Post</Text></TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// Profile Screen with Theme
const Profile = () => {
  const { user, dbInstance, appId, theme } = useAppContext();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
     if(user) getUserProfile(user.uid, appId).then(p => { setProfile(p); setForm(p || {}); });
  }, [user]);

  const save = async () => {
      await updateDoc(doc(dbInstance, `artifacts/${appId}/public/data/users`, user.uid), form);
      setProfile(form);
      setIsEditing(false);
  };

  const TimelineItem = ({ title, sub, date, desc }) => (
      <View style={{paddingLeft:15, borderLeftWidth:2, borderLeftColor: theme.border, paddingBottom:20}}>
          <Text style={{fontWeight:'bold', fontSize:16, color: theme.text}}>{title}</Text>
          <Text style={{color: theme.primary, fontWeight:'500'}}>{sub}</Text>
          <Text style={{color: theme.subText, fontSize:12, marginVertical:4}}>{date}</Text>
          <Text style={{color: theme.subText}}>{desc}</Text>
      </View>
  );

  if(!profile) return <ActivityIndicator style={{marginTop:50}}/>;

  return (
      <ScrollView contentContainerStyle={{padding:20, backgroundColor: theme.background}}>
          <View style={{alignItems:'center', marginBottom:20}}>
              <View style={{width:80, height:80, borderRadius:40, backgroundColor: theme.tint, justifyContent:'center', alignItems:'center', marginBottom:10}}>
                  <User size={40} color={theme.subText}/>
              </View>
              <Text style={{fontSize:22, fontWeight:'bold', color: theme.text}}>{profile?.name || 'User'}</Text>
              <Text style={{color: theme.subText}}>{profile?.headline || profile?.role}</Text>
          </View>

          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
             <Text style={[styles.sectionTitle, { color: theme.text }]}>Details</Text>
             <TouchableOpacity onPress={() => isEditing ? save() : setIsEditing(true)}>
                 <Text style={{color: theme.primary, fontWeight:'bold'}}>{isEditing ? "Save" : "Edit"}</Text>
             </TouchableOpacity>
          </View>

          {isEditing ? (
              <View>
                  <Text style={[styles.label, { color: theme.subText }]}>Name</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={form.name} onChangeText={t=>setForm({...form, name:t})}/>
                  
                  <Text style={[styles.label, { color: theme.subText }]}>Headline</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={form.headline} onChangeText={t=>setForm({...form, headline:t})}/>
                  
                  <Text style={[styles.label, { color: theme.subText }]}>USN / University ID</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={form.universityId} onChangeText={t=>setForm({...form, universityId:t})}/>
                  
                  <Text style={[styles.label, { color: theme.subText }]}>Batch / Graduation Year</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={String(form.graduationYear || '')} keyboardType="numeric" onChangeText={t=>setForm({...form, graduationYear:t})}/>
                  
                  <Text style={[styles.label, { color: theme.subText }]}>Branch</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={form.branch} onChangeText={t=>setForm({...form, branch:t})}/>

                  <Text style={[styles.label, { color: theme.subText }]}>Company</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={form.company} onChangeText={t=>setForm({...form, company:t})}/>
                  
                  <Text style={[styles.label, { color: theme.subText }]}>Skills (comma sep)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} value={form.skills?.join(', ')} onChangeText={t=>setForm({...form, skills: t.split(',').map(s=>s.trim())})}/>
              </View>
          ) : (
             <View style={[styles.card, { backgroundColor: theme.card }]}>
                 <Text style={{color: theme.text}}><Text style={{fontWeight:'bold'}}>USN:</Text> {profile.universityId || 'N/A'}</Text>
                 <Text style={{color: theme.text}}><Text style={{fontWeight:'bold'}}>Branch:</Text> {profile.branch || 'N/A'}</Text>
                 <Text style={{color: theme.text}}><Text style={{fontWeight:'bold'}}>Grad Year:</Text> {profile.graduationYear || 'N/A'}</Text>
                 <Text style={{color: theme.text}}><Text style={{fontWeight:'bold'}}>Company:</Text> {profile.company || 'N/A'}</Text>
                 <View style={{flexDirection:'row', flexWrap:'wrap', marginTop:10}}>
                     {profile.skills?.map((s, i) => (
                         <View key={i} style={{backgroundColor: theme.tint, padding:5, borderRadius:5, marginRight:5, marginBottom:5}}>
                             <Text style={{color: theme.primary, fontSize:12}}>{s}</Text>
                         </View>
                     ))}
                 </View>
             </View>
          )}

          {!isEditing && (
              <>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Experience</Text>
                  <View style={[styles.card, { backgroundColor: theme.card }]}>
                      {profile.experience?.length > 0 ? profile.experience.map((e, i) => (
                          <TimelineItem key={i} title={e.role} sub={e.company} date={`${e.startDate || ''} - ${e.endDate || ''}`} desc={e.description} />
                      )) : <Text style={{color: theme.subText, fontStyle:'italic'}}>No experience added.</Text>}
                  </View>

                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Education</Text>
                  <View style={[styles.card, { backgroundColor: theme.card }]}>
                      {profile.education?.length > 0 ? profile.education.map((e, i) => (
                          <TimelineItem key={i} title={e.degree} sub={e.institution} date={e.year} />
                      )) : <Text style={{color: theme.subText, fontStyle:'italic'}}>No education added.</Text>}
                  </View>
              </>
          )}
          
          <TouchableOpacity onPress={() => signOut(getAuth())} style={{marginTop:30, padding:15, backgroundColor: theme.dangerBg, borderRadius:10, alignItems:'center'}}>
              <Text style={{color: theme.dangerText, fontWeight:'bold'}}>Sign Out</Text>
          </TouchableOpacity>
      </ScrollView>
  )
};

// Messenger Screen with Theme
const Messenger = () => {
  const { dbInstance, appId, user, theme } = useAppContext();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(dbInstance, `artifacts/${appId}/public/data/messages`), where('participants', 'array-contains', user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const convos = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const otherId = data.participants.find(p => p !== user.uid);
        const otherUser = await getUserProfile(otherId, appId);
        return { id: d.id, ...data, otherUser: otherUser || { name: 'Unknown User' } };
      }));
      setConversations(convos.sort((a,b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0)));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if(!activeChat) return;
    const unsub = onSnapshot(doc(dbInstance, `artifacts/${appId}/public/data/messages`, activeChat.id), (doc) => {
       if(doc.exists()) setChatMessages(doc.data().messages || []);
    });
    return () => unsub();
  }, [activeChat]);

  const sendMessage = async () => {
    if(!newMessage.trim() || !activeChat) return;
    const msg = { senderId: user.uid, text: newMessage, timestamp: new Date() };
    await updateDoc(doc(dbInstance, `artifacts/${appId}/public/data/messages`, activeChat.id), {
        messages: arrayUnion(msg),
        lastUpdated: serverTimestamp()
    });
    setNewMessage('');
  };

  if(activeChat) {
      return (
          <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
              <View style={[styles.modalHeader, { borderColor: theme.border }]}>
                  <TouchableOpacity onPress={() => setActiveChat(null)}><ArrowLeft size={24} color={theme.text}/></TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>{activeChat?.otherUser?.name || 'Chat'}</Text>
                  <View style={{width:24}}/>
              </View>
              <FlatList 
                  data={chatMessages}
                  keyExtractor={(_,i) => i.toString()}
                  contentContainerStyle={{padding:15}}
                  renderItem={({item}) => (
                      <View style={[styles.chatBubble, item.senderId === user.uid ? { backgroundColor: theme.primary, alignSelf: 'flex-end', borderBottomRightRadius: 2 } : { backgroundColor: theme.tint, alignSelf: 'flex-start', borderBottomLeftRadius: 2 }]}>
                           <Text style={item.senderId === user.uid ? { color: '#fff' } : { color: theme.text }}>{item.text}</Text>
                      </View>
                  )}
              />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
                <View style={[styles.chatInputArea, { borderColor: theme.border }]}>
                    <TextInput style={[styles.chatInput, { backgroundColor: theme.tint, color: theme.text }]} placeholderTextColor={theme.subText} value={newMessage} onChangeText={setNewMessage} placeholder="Type a message..." />
                    <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, { backgroundColor: theme.primary }]}><Send size={20} color="#fff" /></TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
          </SafeAreaView>
      )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Messages</Text>
      <FlatList 
          data={conversations}
          keyExtractor={i => i.id}
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color: theme.subText}}>No conversations yet.</Text>}
          renderItem={({item}) => (
              <TouchableOpacity onPress={() => setActiveChat(item)} style={[styles.userRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                   <View style={[styles.avatar, { backgroundColor: theme.tint }]}><Text style={{fontWeight:'bold', color: theme.subText}}>{item.otherUser?.name?.[0] || '?'}</Text></View>
                   <View style={{flex:1}}>
                       <Text style={[styles.userName, { color: theme.text }]}>{item.otherUser?.name || 'Unknown User'}</Text>
                       <Text numberOfLines={1} style={{color: theme.subText}}>{item.messages?.[item.messages.length-1]?.text || 'No messages yet'}</Text>
                   </View>
                   <ChevronRight size={20} color={theme.subText}/>
              </TouchableOpacity>
          )}
      />
    </View>
  );
};

// Directory Screen with Ranking and Theme
const Directory = ({ onNavigate }) => {
  const { dbInstance, appId, user, theme } = useAppContext();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rank');
  const [selectedYear, setSelectedYear] = useState(null);
  const [years, setYears] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      const myProfile = user ? await getUserProfile(user.uid, appId) : null;
      const q = query(collection(dbInstance, `artifacts/${appId}/public/data/users`), where("role", "==", "alumni"));
      const snap = await getDocs(q);
      let list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      
      if (user) list = list.filter(u => u.id !== user.uid);

      if (myProfile && list.length > 0) {
        // Calculate match scores
        list = list.map(p => {
            let score = 0;
            if(p.branch === myProfile.branch) score += 40;
            if(p.skills && myProfile.skills) {
                const common = p.skills.filter(s => myProfile.skills.includes(s));
                score += common.length * 10;
            }
            return { ...p, matchScore: Math.min(score, 100) };
        });
        
        // Sort descending by match score
        list.sort((a, b) => b.matchScore - a.matchScore);
      }
      
      setUsersList(list);
      
      const uniqueYears = [...new Set(list.map(u => String(u.graduationYear)).filter(y => y && y !== 'undefined'))].sort().reverse();
      setYears(uniqueYears);
      if(uniqueYears.length > 0) setSelectedYear(uniqueYears[0]);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleConnect = async (targetId) => {
     if(!user) return Alert.alert("Login Required");
     await setDoc(doc(dbInstance, `artifacts/${appId}/public/data/connections`, user.uid), {
         connectedTo: arrayUnion(targetId)
     }, {merge: true});
     
     const sorted = [user.uid, targetId].sort();
     const q = query(collection(dbInstance, `artifacts/${appId}/public/data/messages`), where('participants', '==', sorted));
     const snap = await getDocs(q);
     if(snap.empty) {
         await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/messages`), {
             participants: sorted,
             messages: [],
             lastUpdated: serverTimestamp()
         });
     }
     Alert.alert("Connected", "You can now message this alumni.");
  };

  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // FEATURE: TOP 20 LIMIT and RANKING
  const displayedUsers = activeTab === 'rank' 
    ? filteredUsers.slice(0, 20) // Limit Top Matches to 20
    : filteredUsers.filter(u => String(u.graduationYear) === selectedYear);

  if (loading) return <ActivityIndicator style={{marginTop:50}} size="large" color={theme.primary}/>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Alumni Directory</Text>
      <View style={{paddingHorizontal:15, marginBottom:10}}>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
            placeholderTextColor={theme.subText}
            placeholder="Search alumni..." 
            value={searchTerm} 
            onChangeText={setSearchTerm}
          />
      </View>
      <View style={[styles.tabHeader, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => setActiveTab('rank')} style={[styles.tab, activeTab === 'rank' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}>
          <Text style={[styles.tabText, { color: theme.subText }, activeTab === 'rank' && { color: theme.primary }]}>Top Matches (20)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('batch')} style={[styles.tab, activeTab === 'batch' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}>
          <Text style={[styles.tabText, { color: theme.subText }, activeTab === 'batch' && { color: theme.primary }]}>By Batch</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'batch' && (
        <View style={{height: 50, marginBottom: 10}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 15}}>
            {years.map(year => (
              <TouchableOpacity key={year} onPress={() => setSelectedYear(year)} style={[styles.pillBtn, { backgroundColor: theme.tint }, selectedYear === year && { backgroundColor: theme.primary }]}>
                <Text style={[styles.pillText, { color: theme.text }, selectedYear === year && { color: '#fff' }]}>{year}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={displayedUsers}
        keyExtractor={(i, index) => i.id ? i.id : index.toString()}
        contentContainerStyle={{paddingBottom: 80, paddingHorizontal: 15}}
        renderItem={({item}) => (
          <View style={[styles.userRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.avatar, { backgroundColor: theme.tint }]}><User size={20} color={theme.subText}/></View>
            <View style={{flex:1}}>
              <View style={{flexDirection:'row', alignItems:'center'}}>
                <Text style={[styles.userName, { color: theme.text }]}>{item?.name || 'Unknown'}</Text>
                {item.matchScore > 0 && <View style={{backgroundColor: theme.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8}}><Text style={{color: theme.successText, fontSize: 10, fontWeight: 'bold'}}>{item.matchScore}% Match</Text></View>}
              </View>
              <Text style={[styles.userRole, { color: theme.subText }]}>{item.headline || item.role}</Text>
              <Text style={{fontSize:12, color: theme.subText}}>{item.branch} • {item.graduationYear}</Text>
            </View>
            <TouchableOpacity onPress={() => handleConnect(item.id)} style={[styles.connectBtn, { backgroundColor: theme.primary }]}><Text style={{color:'#fff', fontSize:12}}>Connect</Text></TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

// Main Component with Theme Support
const Main = () => {
  const [page, setPage] = useState('home');
  const [chatOpen, setChatOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const { user, isAuthReady, theme, toggleTheme, isDarkMode } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);

  const renderContent = () => {
      if (!isAuthReady) return <ActivityIndicator style={{marginTop:100}} size="large" color={theme.primary}/>;
      if (page === 'auth') return <AuthScreen onNavigate={setPage} />;
      if (!user) return <AuthScreen onNavigate={setPage} />;

      switch(page) {
          case 'dashboard': return <Dashboard onNavigate={setPage} />;
          case 'directory': return <Directory onNavigate={setPage} />;
          case 'messenger': return <Messenger />;
          case 'profile': return <Profile />;
          default: return (
            <ScrollView contentContainerStyle={{padding: 20, backgroundColor: theme.background, height: '100%'}}>
                <View style={[styles.hero, { backgroundColor: theme.primary }]}>
                    <Text style={styles.heroTitle}>Welcome Back!</Text>
                    <Text style={styles.heroSub}>The Official Alumni Network.</Text>
                    <TouchableOpacity onPress={() => setPage('dashboard')} style={[styles.heroBtn, { backgroundColor: theme.card }]}>
                        <Text style={[styles.heroBtnText, { color: theme.primary }]}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', marginTop:20}}>
                    {[
                        {t:'Alumni Directory', i:Users, p:'directory', c: theme.tint, ic: theme.primary},
                        {t:'Job Portal', i:Briefcase, p:'dashboard', c: theme.tint, ic: theme.primary},
                        {t:'Events', i:Calendar, p:'dashboard', c: theme.tint, ic: theme.primary},
                        {t:'Messages', i:MessageSquare, p:'messenger', c: theme.tint, ic: theme.primary}
                    ].map((item, i) => (
                        <TouchableOpacity key={i} onPress={() => setPage(item.p)} style={[styles.menuCard, {backgroundColor: item.c}]}>
                            <item.i size={32} color={item.ic} />
                            <Text style={{marginTop:10, fontWeight:'bold', color: theme.text}}>{item.t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
          );
      }
  };

  const MenuModal = () => (
    <Modal visible={menuOpen} transparent animationType="fade">
      <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
        <View style={[styles.menuPanel, { backgroundColor: theme.card }]}>
          <Text style={[styles.menuTitle, { color: theme.text }]}>Menu</Text>
          {[
            {l: 'Home', p: 'home', i: Home}, 
            {l: 'Dashboard', p: 'dashboard', i: LayoutDashboard},
            {l: 'Directory', p: 'directory', i: Users},
            {l: 'Messages', p: 'messenger', i: MessageSquare},
            {l: 'Contribute', action: () => setContributionOpen(true), i: Heart}, 
            {l: 'Profile', p: 'profile', i: User},
          ].map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.menuItem} 
              onPress={() => { 
                if(item.action) item.action(); 
                else setPage(item.p); 
                setMenuOpen(false); 
              }}
            >
              <item.i size={20} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>{item.l}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
              style={[styles.menuItem, { marginTop: 20, borderTopWidth: 1, borderColor: theme.border, paddingTop: 20 }]} 
              onPress={toggleTheme}
            >
              {isDarkMode ? <Sun size={20} color={theme.text} /> : <Moon size={20} color={theme.text} />}
              <Text style={[styles.menuItemText, { color: theme.text }]}>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</Text>
            </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex:1, backgroundColor: theme.background}}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"}/>
        <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.logo, { color: theme.primary }]}>AlumniConnect</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity onPress={toggleTheme} style={{marginRight: 15}}>
                {isDarkMode ? <Sun size={24} color={theme.text} /> : <Moon size={24} color={theme.text} />}
            </TouchableOpacity>
            {user ? (
                <TouchableOpacity onPress={() => setMenuOpen(true)}><Menu size={28} color={theme.text}/></TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={() => setPage('auth')}><Text style={{color: theme.primary, fontWeight:'bold'}}>Login</Text></TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{flex:1}}>
          {renderContent()}
        </View>

        {user && (
            <TouchableOpacity style={[styles.chatFab, { backgroundColor: theme.primary }]} onPress={() => setChatOpen(true)}>
              <MessageSquare size={24} color="#fff"/>
            </TouchableOpacity>
        )}

        <Chatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        <ContributionModal visible={contributionOpen} onClose={() => setContributionOpen(false)} />
        <MenuModal />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default function App() {
  return <AppProvider><Main /></AppProvider>;
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerScroll: { padding: 30, justifyContent: 'center', minHeight: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', padding: 20, elevation: 2, borderBottomWidth:1 },
  logo: { fontSize: 22, fontWeight: 'bold' },
  
  // Auth
  headerText: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1 },
  primaryBtn: { padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', marginTop: 20 },
  roleRow: { flexDirection: 'row', marginBottom: 20 },
  roleBtn: { flex: 1, padding: 10, alignItems: 'center', borderWidth: 1 },
  roleText: { fontWeight: 'bold' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderStyle: 'dashed', borderWidth: 2, borderRadius: 10, marginBottom: 20 },

  // Dashboard & Common
  tabHeader: { flexDirection: 'row', padding: 10 },
  tab: { marginRight: 20, paddingBottom: 5 },
  tabText: { fontWeight: 'bold' },
  card: { padding: 15, marginVertical: 8, marginHorizontal: 2, borderRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  cardSub: { marginBottom: 10 },
  cardBody: { marginBottom: 10 },
  fab: { position: 'absolute', bottom: 90, right: 20, padding: 15, borderRadius: 30, elevation: 5 },
  aiBanner: { padding: 10, marginVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  aiBannerText: { color: '#B45309', marginLeft: 8, fontSize: 12, fontWeight: 'bold' },
  statsGrid: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' },
  statBox: { width: '48%', padding:15, borderRadius:10, marginBottom:10, alignItems:'center' },
  statNum: { fontSize:20, fontWeight:'bold', marginBottom:5 },

  // Directory / Messenger List
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userName: { fontWeight: 'bold', fontSize: 16 },
  userRole: { fontSize: 14 },
  connectBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginLeft: 'auto' },
  pillBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  pillText: { fontWeight: 'bold' },

  // Home
  hero: { padding: 40, borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  heroSub: { color: '#dbeafe', textAlign: 'center', marginBottom: 20 },
  heroBtn: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  heroBtnText: { fontWeight: 'bold' },
  menuCard: { width: '48%', padding: 20, borderRadius: 15, marginBottom: 15, alignItems: 'center' },

  // Chatbot & Modals
  modalContainer: { flex: 1 },
  modalHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems:'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  chatBubble: { padding: 12, borderRadius: 15, marginBottom: 10, maxWidth: '80%' },
  chatInputArea: { flexDirection: 'row', padding: 15, borderTopWidth: 1 },
  chatInput: { flex: 1, borderRadius: 20, paddingHorizontal: 15 },
  sendBtn: { marginLeft: 10, padding: 10, borderRadius: 20, justifyContent: 'center' },
  chatFab: { position: 'absolute', bottom: 20, right: 20, padding: 15, borderRadius: 30, elevation: 5 },
  
  // Menu
  menuOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)' },
  menuPanel: { width: '70%', height: '100%', padding: 20 },
  menuTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  menuItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  menuItemText: { fontSize: 18, marginLeft: 15 },
  
  // Forms
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 20, borderRadius: 15 },
  cancelBtn: { padding: 10 },
  postBtn: { padding: 10, borderRadius: 5 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', margin: 20 },
  sectionTitle: { fontSize:18, fontWeight:'bold', marginTop:15, marginBottom:10 },
  label: { fontSize:12, marginBottom:5 }
});