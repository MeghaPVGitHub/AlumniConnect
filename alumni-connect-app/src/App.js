import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { initializeApp } from 'firebase/app';

import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore,arrayUnion, doc, setDoc, getDoc, collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, where, getDocs, orderBy, writeBatch, increment, } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    Menu,
    X,
    User,
    LogOut,
    Briefcase,
    Calendar,
    Camera, Download, MapPin, Award,
    Search,
    MoreVertical,
    Building2, CheckCircle2, Filter, Globe,
    MessageSquare,
    Send,
    Loader2,
    Clock, ChevronRight,
    
    Users,
    Home,
    Link,
    Edit,
    GraduationCap,
    Heart,
    Mail,
    Image as ImageIcon, // Renamed to avoid conflict with HTML Image
    FileText, 
    Share2, 
    ThumbsUp, 
    MoreHorizontal,
    Phone,
    MessageCircle,
    Sun, Moon,
    PlusCircle,
    ArrowLeft,
    LayoutDashboard,
      Frown, AlertCircle, CheckCircle, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- Firebase Configuration ---
// IMPORTANT: Your API keys have been removed for security.
// You MUST create a file named .env.local in your project's root folder
// and add your Firebase credentials and API keys there.
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);


const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [dbInstance, setDbInstance] = useState(null);
    const [authInstance, setAuthInstance] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const appId = "default-app-id";

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });
        setDbInstance(db);
        setAuthInstance(auth);
        return () => unsubscribe();
    }, []);

    const value = { user, dbInstance, authInstance, isAuthReady, appId };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

const useAppContext = () => {
    return useContext(AppContext);
};

// SECURITY NOTE: Your Firestore database MUST have strong security rules.
// Client-side code can be manipulated. Rules on the backend are essential
// to prevent users from reading, writing, or deleting data they
// should not have access to (e.g., editing another user's profile).
const getUserProfile = async (db, userId, appId) => {
    if (!db || !userId || !appId) return null;
    const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
    try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            return { ...userDocSnap.data(), id: userId };
        }
    } catch (error) {
        console.error("Error fetching user profile:", error.code, error.message);
    }
    return null;
};

const createUserProfile = async (db, userId, appId, profileData) => {
    if (!db || !userId || !appId) return;
    const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
    try {
        await setDoc(userDocRef, {
            ...profileData,
            id: userId,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating user profile:", error.code, error.message);
    }
};

const updateProfile = async (db, userId, appId, profileData) => {
    if (!db || !userId || !appId) return;
    const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
    try {
        await updateDoc(userDocRef, profileData);
    } catch (error) {
        console.error("Error updating user profile:", error.code, error.message);
    }
};

const findOrCreateChat = async (db, appId, currentUserId, otherUserId) => {
    const sortedParticipants = [currentUserId, otherUserId].sort();
    const messagesRef = collection(db, `artifacts/${appId}/public/data/messages`);

    const q = query(messagesRef, where('participants', '==', sortedParticipants));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    } else {
        const newChatDoc = await addDoc(messagesRef, {
            participants: sortedParticipants,
            messages: [],
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
        });
        return newChatDoc.id;
    }
};

const ProfileHeadline = ({ name, headline, currentJob, company, role, profilePictureUrl }) => (
    <div className="flex items-center space-x-6 p-4">
        <div className="relative">
            <img
                src={profilePictureUrl || 'https://placehold.co/128x128/E2E8F0/A0AEC0?text=Pic'}
                alt={`${name}'s profile`}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover ring-4 ring-gray-200 dark:ring-gray-700"
            />
        </div>
        <div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">{name}</h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium mt-1">{headline}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Role: {role}</p>
        </div>
    </div>
);

const ExperienceSection = ({ experience }) => (
    <div className="space-y-4">
        <h4 className="text-2xl font-bold text-gray-900 dark:text-gray-100 px-1">Experience & Internships</h4>
        {experience.length > 0 ? (
            experience.map((exp, index) => (
                <div key={index} className="flex items-start space-x-4 pt-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <Briefcase size={20} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100">{exp.role}</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{exp.company}</p>
                        {exp.description && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{exp.description}</p>}
                    </div>
                </div>
            ))
        ) : (
            <div className="text-center py-10 px-6 border-2 border-dashed rounded-xl dark:border-gray-700">
                <Briefcase size={32} className="mx-auto text-gray-400 dark:text-gray-500" />
                <p className="mt-2 text-gray-500 dark:text-gray-400 italic">No experience or internships have been added yet.</p>
            </div>
        )}
    </div>
);

const EducationSection = ({ education }) => (
    <div className="space-y-4">
        <h4 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Education</h4>
        {education.length > 0 ? (
            education.map((edu, index) => (
                <div key={index} className="flex items-start space-x-4">
                    <GraduationCap size={20} className="text-gray-500 dark:text-gray-400 mt-1" />
                    <div>
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100">{edu.degree}</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{edu.institution}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{edu.year}</p>
                    </div>
                </div>
            ))
        ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No education added yet.</p>
        )}
    </div>
);

const SkillsSection = ({ skills }) => (
    <div className="space-y-4">
        <h4 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Skills</h4>
        {skills?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">{skill}</span>
                ))}
            </div>
        ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No skills added yet.</p>
        )}
    </div>
);

const ConnectionsSection = ({ connections }) => (
    <div className="space-y-4">
        <h4 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Connections</h4>
        {connections.length > 0 ? (
            <p className="text-gray-700 dark:text-gray-300">{connections.length} connections</p>
        ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No connections yet.</p>
        )}
    </div>
);

const PasswordResetModal = ({ isOpen, onClose, onSendResetEmail }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            await onSendResetEmail(email);
            setMessage('A password reset link has been sent to your email.');
        } catch (err) {
            setError(err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset Password</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
                        <X size={24} />
                    </button>
                </div>
                {error && <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                {message && <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 p-3 rounded-lg mb-4 text-sm">{message}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                        Send Reset Link
                    </button>
                </form>
            </div>
        </div>
    );
};

const AuthModal = ({ isOpen, onClose, onSignIn, onSignUp, onForgotPassword }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const [resumeFile, setResumeFile] = useState(null);
    const [isParsingResume, setIsParsingResume] = useState(false);
    
    const [formData, setFormData] = useState({ name: '', graduationYear: '', branch: '', skills: [], universityId: '' });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!supportedTypes.includes(file.type)) {
            setError('Unsupported file type. Please upload a PDF, JPG, or PNG file.');
            setResumeFile(null);
            return;
        }
        
        setResumeFile(file);
        setError('');
    };

    const handleAutofill = async () => {
        if (!resumeFile) {
            setError('Please select a resume file first.');
            return;
        }

        setIsParsingResume(true);
        setError('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result.split(',')[1];
            try {
                const parsedData = await extractResumeData(base64Data, resumeFile.type);
                
                if (parsedData) {
                    setFormData(prev => ({
                        ...prev,
                        name: parsedData.name || '',
                        graduationYear: parsedData.graduationYear || '',
                        branch: parsedData.branch || '',
                        skills: parsedData.skills || [],
                    }));
                    setError('');
                } else {
                    setError('Failed to parse resume. Please fill in details manually.');
                }
            } catch (err) {
                setError('Error during resume parsing. Please fill in manually.');
                console.error('Error parsing resume:', err);
            } finally {
                setIsParsingResume(false);
            }
        };
        reader.readAsDataURL(resumeFile);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSkillsChange = (e) => {
        const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, skills }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await onSignIn(email, password);
            } else {
                await onSignUp(email, password, role, formData);
            }
            onClose();
        } catch (err) {
            let friendlyMessage = 'An unexpected error occurred. Please try again.';
            switch (err.code) {
                case 'auth/email-already-in-use':
                    friendlyMessage = 'This email address is already registered. Please try logging in or use "Forgot Password".';
                    break;
                case 'auth/weak-password':
                    friendlyMessage = 'The password is too weak. Please use at least 6 characters.';
                    break;
                case 'auth/invalid-email':
                    friendlyMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    friendlyMessage = 'Invalid email or password. Please try again.';
                    break;
                default:
                    friendlyMessage = err.message;
                    break;
            }
            setError(friendlyMessage);
        }
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-start overflow-y-auto z-50 p-4 pt-10">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4 mb-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{isLogin ? 'Login' : 'Sign Up'}</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
                        <X size={24} />
                    </button>
                </div>
                {error && <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" required />
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" required />
                    </div>
                    {!isLogin && (
                        <>
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-1">Role</label>
                                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                                    <option value="student">Student</option>
                                    <option value="alumni">Alumni</option>
                                </select>
                            </div>
                            {role === 'student' && (
                                <div className="space-y-2">
                                    <label className="block text-gray-700 dark:text-gray-300">Upload Resume (Optional)</label>
                                    <input type="file" onChange={handleFileChange} className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                    <button type="button" onClick={handleAutofill} className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-full hover:bg-gray-300 transition-colors flex items-center justify-center disabled:opacity-50" disabled={!resumeFile || isParsingResume}>
                                        {isParsingResume ? (
                                            <><Loader2 className="animate-spin mr-2" size={20} /> Parsing...</>
                                        ) : 'Autofill from Resume'}
                                    </button>
                                    <div className="space-y-2 pt-4">
                                        <label className="block text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" required />

                                        <label className="block text-gray-700 dark:text-gray-300 mb-1">University ID</label>
                                        <input type="text" name="universityId" value={formData.universityId} onChange={handleChange} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" placeholder="e.g., 4SF22CS108" required />
                                        
                                        <label className="block text-gray-700 dark:text-gray-300 mb-1">Graduation Year</label>
                                        <input type="number" name="graduationYear" value={formData.graduationYear} onChange={handleChange} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                        <label className="block text-gray-700 dark:text-gray-300 mb-1">Branch</label>
                                        <input type="text" name="branch" value={formData.branch} onChange={handleChange} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                        <label className="block text-gray-700 dark:text-gray-300 mb-1">Skills (comma-separated)</label>
                                        <input type="text" name="skills" value={formData.skills?.join(', ')} onChange={handleSkillsChange} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <button type="submit" className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>
                {isLogin && (
                    <button onClick={onForgotPassword} className="mt-4 text-sm text-blue-500 hover:underline w-full text-center">
                        Forgot Password?
                    </button>
                )}
                <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    {isLogin ? (
                        <>Don't have an account? <button onClick={() => { setIsLogin(false); setError(''); }} className="text-blue-500 hover:underline">Sign Up</button></>
                    ) : (
                        <>Already have an account? <button onClick={() => { setIsLogin(true); setError(''); }} className="text-blue-500 hover:underline">Login</button></>
                    )}
                </div>
            </div>
        </div>
    );
};
const Chatbot = ({ isOpen, onClose }) => {
    const [input, setInput] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const { user } = useAppContext();
    const chatEndRef = useRef(null);

    const API_KEY = process.env.REACT_APP_GOOGLE_AI_API_KEY;

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const handleSendMessage = async () => {
        if (input.trim() === '' || !API_KEY) return;

        const newUserMessage = { role: 'user', text: input };
        setChatHistory((prev) => [...prev, newUserMessage]);
        setInput('');
        setIsTyping(true);

        const responseText = 'Oops! Something went wrong. Please try again later.';
        const prompt = `Act as an AI-driven Alumni Connect assistant for a university. The user is a ${user ? 'logged-in user' : 'guest'}. Respond to the following query: "${input}". Provide helpful, friendly advice related to a university alumni platform. Keep your response concise and professional.`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        // ✅ CORRECT: Use the standard Gemini 1.5 Flash model
        // ✅ TESTED: Based on your list, this is the most reliable model
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
        // Use 'gemini-1.5-flash' (fast & cheap) or 'gemini-1.5-pro' (smarter)
        // const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result && result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
                const apiResponseText = result.candidates[0].content.parts[0].text;
                setChatHistory((prev) => [...prev, { role: 'bot', text: apiResponseText }]);
            } else {
                setChatHistory((prev) => [...prev, { role: 'bot', text: responseText }]);
            }
        } catch (error) {
            console.error('API call failed:', error);
            setChatHistory((prev) => [...prev, { role: 'bot', text: responseText }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 h-96 bg-white dark:bg-gray-800 shadow-2xl rounded-xl flex flex-col p-4 transform transition-all duration-300 ease-in-out border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Ask ACBot</h3>
                <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
                    <X size={20} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto my-2 space-y-3 p-2">
                {chatHistory.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm italic">
                        How can I help you today?
                    </div>
                )}
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-2 rounded-lg max-w-[75%] text-sm ${msg.role === 'user' ? 'bg-blue-500 text-white dark:bg-blue-600' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="p-2 rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-sm animate-pulse">
                            Typing...
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="flex items-center pt-2 border-t dark:border-gray-700">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything..."
                    className="flex-1 p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={handleSendMessage}
                    className="ml-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

const ContributionModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleCopyUPI = () => {
        navigator.clipboard.writeText('admin@university.upi');
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alumni Contribution</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">Support our alumni trust with a contribution. Scan the QR code or use the UPI ID below.</p>
                <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-inner">
                        <img src="https://placehold.co/200x200" alt="UPI QR Code" />
                    </div>
                    <div className="relative w-full">
                        <input type="text" value="admin@university.upi" readOnly className="w-full p-3 pr-12 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                        <button onClick={handleCopyUPI} className="absolute right-2 top-2 p-1 text-gray-500 hover:text-blue-500">
                            <MessageCircle size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// const Header = ({ onNavigate, onSignIn, onSignUp, currentPage, onContributionClick, onSearch, userRole }) => {
//     const [isMenuOpen, setIsMenuOpen] = useState(false);
//     const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
//     const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
//     const [searchInput, setSearchInput] = useState('');
//     const { user, authInstance } = useAppContext();

//     const handleSignOut = async () => {
//         try {
//             await signOut(authInstance);
//             onNavigate('home');
//         } catch (error) {
//             console.error('Sign out error:', error);
//         }
//     };

//     const handleAuthModalClose = () => {
//         setIsAuthModalOpen(false);
//     };

//     const handleForgotPassword = () => {
//         setIsAuthModalOpen(false);
//         setIsPasswordResetModalOpen(true);
//     };

//     const handleSendResetEmail = async (email) => {
//         await sendPasswordResetEmail(authInstance, email);
//     };

//     const handleSearchSubmit = (e) => {
//         if (e.key === 'Enter' || e.type === 'click') {
//             onSearch(searchInput);
//         }
//     };

//     return (
//         <>
//             <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 shadow-sm">
//                 <div className="container mx-auto p-4 flex justify-between items-center">
//                     <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Alumni Connect</h1>
//                     <div className="hidden md:flex flex-1 mx-8">
//                         <div className="relative w-full max-w-md">
//                             <input
//                                 type="text"
//                                 placeholder="Search alumni, jobs, events..."
//                                 value={searchInput}
//                                 onChange={(e) => setSearchInput(e.target.value)}
//                                 onKeyDown={handleSearchSubmit}
//                                 className="w-full p-2 pl-10 pr-10 rounded-full border dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
//                             />
//                             <button onClick={handleSearchSubmit} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors">
//                                 <Search size={20} />
//                             </button>
//                         </div>
//                     </div>
//                     <nav className="hidden md:flex space-x-6 text-gray-700 dark:text-gray-300 items-center">
//                         <button onClick={() => onNavigate('home')} className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center ${currentPage === 'home' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}><Home size={18} className="mr-1" />Home</button>
//                         <button onClick={() => onNavigate('alumni')} className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center ${currentPage === 'alumni' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}><Users size={18} className="mr-1" />Alumni</button>
//                         {user && (
//                             <>
//                                 <button onClick={() => onNavigate('dashboard')} className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center ${currentPage === 'dashboard' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}><LayoutDashboard size={18} className="mr-1" />Dashboard</button>
//                                 <button onClick={() => onNavigate('connections')} className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center ${currentPage === 'connections' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}><Link size={18} className="mr-1" />Connections</button>
//                                 {userRole === 'alumni' && (
//                                     <button onClick={() => onContributionClick()} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center"><Heart size={18} className="mr-1" />Contribute</button>
//                                 )}
//                                 <div className="relative group">
//                                     <button onClick={() => onNavigate('profile')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
//                                         <User size={24} />
//                                     </button>
//                                     <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out z-50">
//                                         <button onClick={() => onNavigate('profile')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">My Profile</button>
//                                         <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700">Sign Out</button>
//                                     </div>
//                                 </div>
//                             </>
//                         )}
//                         {!user && (
//                             <button onClick={() => setIsAuthModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors">
//                                 Login / Sign Up
//                             </button>
//                         )}
//                     </nav>
//                     <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
//                         <Menu size={24} />
//                     </button>
//                 </div>
//                 {isMenuOpen && (
//                     <div className="md:hidden bg-white dark:bg-gray-900 shadow-md">
//                         <nav className="flex flex-col space-y-2 p-4 text-gray-700 dark:text-gray-300">
//                             <button onClick={() => onNavigate('home')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left p-2 rounded-md flex items-center"><Home size={18} className="mr-2" />Home</button>
//                             <button onClick={() => onNavigate('alumni')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left p-2 rounded-md flex items-center"><Users size={18} className="mr-2" />Alumni</button>
//                             {user && (
//                                 <>
//                                     <button onClick={() => onNavigate('dashboard')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left p-2 rounded-md flex items-center"><LayoutDashboard size={18} className="mr-2" />Dashboard</button>
//                                     <button onClick={() => onNavigate('connections')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left p-2 rounded-md flex items-center"><Link size={18} className="mr-2" />Connections</button>
//                                     {userRole === 'alumni' && (
//                                         <button onClick={() => onContributionClick()} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left p-2 rounded-md flex items-center"><Heart size={18} className="mr-2" />Contribute</button>
//                                     )}
//                                     <button onClick={() => onNavigate('profile')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left p-2 rounded-md flex items-center">
//                                         <User size={18} className="mr-2" />
//                                         My Profile
//                                     </button>
//                                     <button onClick={handleSignOut} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left p-2 rounded-md flex items-center">
//                                         <LogOut size={18} className="mr-2" />
//                                         Sign Out
//                                     </button>
//                                 </>
//                             )}
//                             {!user && (
//                                 <button onClick={() => setIsAuthModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors">
//                                     Login / Sign Up
//                                 </button>
//                             )}
//                         </nav>
//                     </div>
//                 )}
//             </header>
//             <AuthModal isOpen={isAuthModalOpen} onClose={handleAuthModalClose} onSignIn={onSignIn} onSignUp={onSignUp} onForgotPassword={handleForgotPassword} />
//             <PasswordResetModal isOpen={isPasswordResetModalOpen} onClose={() => setIsPasswordResetModalOpen(false)} onSendResetEmail={handleSendResetEmail} />
//         </>
//     );
// };

// --- REPLACE THE Header COMPONENT ---

// --- REPLACE THE Header COMPONENT ---

const Header = ({ onNavigate, onSignIn, onSignUp, currentPage, onContributionClick, onSearch, userRole }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    
    // Dark Mode State
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const { user, authInstance } = useAppContext();

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const handleSignOut = async () => {
        try {
            await signOut(authInstance);
            onNavigate('home');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const handleAuthModalClose = () => setIsAuthModalOpen(false);
    const handleForgotPassword = () => { setIsAuthModalOpen(false); setIsPasswordResetModalOpen(true); };
    const handleSendResetEmail = async (email) => await sendPasswordResetEmail(authInstance, email);
    
    // FIXED: Trigger search on Click or Enter key
    const handleSearchSubmit = () => {
        onSearch(searchInput);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
        }
    };

    return (
        <>
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
                        <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                            <GraduationCap size={24} />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                            AlumniConnect
                        </h1>
                    </div>

                    {/* FIXED SEARCH BAR */}
                    <div className="hidden md:flex flex-1 mx-8 max-w-lg">
                        <div className="relative w-full group">
                            <input
                                type="text"
                                placeholder="Search alumni, jobs, events..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full py-2 pl-4 pr-12 rounded-full bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 dark:bg-gray-800 dark:focus:bg-gray-900 dark:text-gray-100 transition-all outline-none"
                            />
                            <button 
                                onClick={handleSearchSubmit}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                title="Search"
                            >
                                <Search size={18} />
                            </button>
                        </div>
                    </div>

                    <nav className="hidden md:flex space-x-2 items-center">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors">
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button onClick={() => onNavigate('home')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentPage === 'home' ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Home</button>
                        <button onClick={() => onNavigate('alumni')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentPage === 'alumni' ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Alumni</button>
                        
                        {user ? (
                            <>
                                <button onClick={() => onNavigate('dashboard')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentPage === 'dashboard' ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Dashboard</button>
                                {userRole === 'alumni' && (
                                    <button onClick={() => onContributionClick()} className="p-2 text-pink-500 hover:bg-pink-50 rounded-full transition-colors" title="Contribute"><Heart size={20} /></button>
                                )}
                                <div className="relative group ml-2">
                                    <button onClick={() => onNavigate('profile')} className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5">
                                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                                            <User size={20} className="text-gray-700 dark:text-gray-300" />
                                        </div>
                                    </button>
                                    {/* Dropdown */}
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                                        <div className="py-2">
                                            <button onClick={() => onNavigate('profile')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">My Profile</button>
                                            <button onClick={() => onNavigate('connections')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">My Connections</button>
                                            <div className="border-t my-1 dark:border-gray-700"></div>
                                            <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Sign Out</button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <button onClick={() => setIsAuthModalOpen(true)} className="ml-2 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full shadow-lg hover:bg-blue-700 hover:shadow-blue-500/30 transition-all">
                                Login
                            </button>
                        )}
                    </nav>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden gap-4">
                         <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300">
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-700 dark:text-gray-300">
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-gray-900 border-b dark:border-gray-800 animate-fade-in-down">
                        <nav className="flex flex-col p-4 space-y-2">
                            {/* Mobile Search */}
                            <div className="relative w-full mb-4">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full py-2 pl-4 pr-10 rounded-lg bg-gray-100 border-transparent dark:bg-gray-800 dark:text-gray-100"
                                />
                                <button onClick={handleSearchSubmit} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500">
                                    <Search size={18} />
                                </button>
                            </div>

                            <button onClick={() => onNavigate('home')} className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center text-gray-700 dark:text-gray-200"><Home size={18} className="mr-3" />Home</button>
                            <button onClick={() => onNavigate('alumni')} className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center text-gray-700 dark:text-gray-200"><Users size={18} className="mr-3" />Alumni</button>
                            {user ? (
                                <>
                                    <button onClick={() => onNavigate('dashboard')} className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center text-gray-700 dark:text-gray-200"><LayoutDashboard size={18} className="mr-3" />Dashboard</button>
                                    <button onClick={() => onNavigate('profile')} className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center text-gray-700 dark:text-gray-200"><User size={18} className="mr-3" />My Profile</button>
                                    <button onClick={handleSignOut} className="p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center text-red-500"><LogOut size={18} className="mr-3" />Sign Out</button>
                                </>
                            ) : (
                                <button onClick={() => setIsAuthModalOpen(true)} className="w-full mt-2 py-3 bg-blue-600 text-white rounded-lg font-semibold">Login / Sign Up</button>
                            )}
                        </nav>
                    </div>
                )}
            </header>
            <AuthModal isOpen={isAuthModalOpen} onClose={handleAuthModalClose} onSignIn={onSignIn} onSignUp={onSignUp} onForgotPassword={handleForgotPassword} />
            <PasswordResetModal isOpen={isPasswordResetModalOpen} onClose={() => setIsPasswordResetModalOpen(false)} onSendResetEmail={handleSendResetEmail} />
        </>
    );
};


const RecentItem = ({ title, description, type }) => {
    const icon = type === 'job' ? <Briefcase size={20} /> : <Calendar size={20} />;
    const color = type === 'job' ? 'text-green-500' : 'text-purple-500';
    return (
        <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className={`p-2 rounded-full bg-opacity-20 ${color} bg-current`}>
                {icon}
            </div>
            <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
        </div>
    );
};

// const HomePage = ({ onNavigate }) => {
//     const { user, dbInstance, appId, isAuthReady } = useAppContext();
//     const [recentItems, setRecentItems] = useState([]);
//     // const [setFeaturedAlumni] = useState([]);
//     const [featuredAlumni, setFeaturedAlumni] = useState([]);
//     useEffect(() => {
//         if (!dbInstance || !appId || !isAuthReady) return;

//         const fetchRecentItems = async () => {
//             try {
//                 const jobsCollectionRef = collection(dbInstance, `artifacts/${appId}/public/data/jobs`);
//                 const eventsCollectionRef = collection(dbInstance, `artifacts/${appId}/public/data/events`);

//                 const [jobsSnapshot, eventsSnapshot] = await Promise.all([
//                     getDocs(jobsCollectionRef),
//                     getDocs(eventsCollectionRef)
//                 ]);

//                 const recentJobs = jobsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'job' }));
//                 const recentEvents = eventsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'event' }));

//                 setRecentItems(
//                     [...recentJobs, ...recentEvents]
//                         .sort((a, b) => (b.postedAt?.toMillis() || 0) - (a.postedAt?.toMillis() || 0))
//                         .slice(0, 3)
//                 );
//             } catch (error) {
//                 console.error("Error fetching recent items:", error);
//             }
//         };

//         const fetchFeaturedAlumni = async () => {
//             try {
//                 const alumniCollectionRef = collection(dbInstance, `artifacts/${appId}/public/data/users`);
//                 const alumniSnapshot = await getDocs(alumniCollectionRef);
//                 const alumniData = alumniSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
//                     .filter(alumni => alumni.role === 'alumni');
//                 setFeaturedAlumni(alumniData.slice(0, 3));
//             } catch (error) {
//                 console.error("Error fetching featured alumni:", error);
//             }
//         };

//         fetchRecentItems();
//         fetchFeaturedAlumni();

//     }, [dbInstance, appId, isAuthReady, setFeaturedAlumni]);

//     return (
//         <div className="space-y-12 p-4 animate-fade-in">
//             <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-16 rounded-3xl shadow-xl animate-fade-in-down">
//                 <h2 className="text-5xl font-extrabold leading-tight">Alumni Connect</h2>
//                 <p className="mt-4 text-xl font-light opacity-90">A Comprehensive Alumni Management System</p>
//                 <button onClick={() => onNavigate(user ? 'dashboard' : 'alumni')} className="mt-8 px-8 py-4 bg-white text-blue-600 font-bold text-lg rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105">
//                     {user ? 'Go to My Dashboard' : 'Explore Alumni'}
//                 </button>
//             </div>

//             <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in-up">
//                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center transition-all hover:shadow-2xl hover:scale-105">
//                     <Users size={64} className="text-blue-500 mb-4" />
//                     <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Alumni Directory</h3>
//                     <p className="mt-2 text-gray-600 dark:text-gray-400">Find and connect with fellow alumni based on shared interests, branch, or profession.</p>
//                     <button onClick={() => onNavigate('alumni')} className="mt-4 text-blue-500 hover:underline font-medium">Browse Alumni</button>
//                 </div>
//                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center transition-all hover:shadow-2xl hover:scale-105">
//                     <Briefcase size={64} className="text-green-500 mb-4" />
//                     <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Job Portal</h3>
//                     <p className="mt-2 text-gray-600 dark:text-gray-400">Discover and post exclusive job and internship opportunities for students and alumni.</p>
//                     <button onClick={() => onNavigate('dashboard')} className="mt-4 text-green-500 hover:underline font-medium">View Jobs</button>
//                 </div>
//                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center transition-all hover:shadow-2xl hover:scale-105">
//                     <Calendar size={64} className="text-purple-500 mb-4" />
//                     <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Event Management</h3>
//                     <p className="mt-2 text-gray-600 dark:text-gray-400">Stay informed about upcoming reunions, webinars, and guest lectures.</p>
//                     <button onClick={() => onNavigate('dashboard')} className="mt-4 text-purple-500 hover:underline font-medium">See Events</button>
//                 </div>
//                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center transition-all hover:shadow-2xl hover:scale-105">
//                     <MessageSquare size={64} className="text-yellow-500 mb-4" />
//                     <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">AI Chatbot</h3>
//                     <p className="mt-2 text-gray-600 dark:text-gray-400">Get 24/7 support and personalized guidance from our integrated AI assistant.</p>
//                     <button onClick={() => onNavigate('Chatbot')} className="mt-4 text-yellow-500 hover:underline font-medium">Try the Chatbot</button>
//                 </div>
//             </section>

//         {/* This entire section will now only render if a user is logged in */}
//         {user && (
//             <section className="text-left">
//                 <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Recent Activity</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {recentItems.length > 0 ? (
//                         recentItems.map(item => <RecentItem key={item.id} {...item} />)
//                     ) : (
//                         <p className="text-gray-500 dark:text-gray-400 italic">No recent activity to display.</p>
//                     )}
//                 </div>
//             </section>
//         )}
//     </div>
// );
// };


const HomePage = ({ onNavigate }) => {
    const { user, dbInstance, appId, isAuthReady } = useAppContext();
    const [recentItems, setRecentItems] = useState([]);

    useEffect(() => {
        if (!dbInstance || !appId || !isAuthReady) return;
        const fetchRecentItems = async () => {
            try {
                const jobsRef = collection(dbInstance, `artifacts/${appId}/public/data/jobs`);
                const eventsRef = collection(dbInstance, `artifacts/${appId}/public/data/events`);
                const [jobsSnap, eventsSnap] = await Promise.all([getDocs(jobsRef), getDocs(eventsRef)]);
                const jobs = jobsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'job' }));
                const events = eventsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'event' }));
                setRecentItems([...jobs, ...events].sort((a, b) => (b.postedAt?.toMillis() || 0) - (a.postedAt?.toMillis() || 0)).slice(0, 3));
            } catch (error) { console.error("Error", error); }
        };
        fetchRecentItems();
    }, [dbInstance, appId, isAuthReady]);

    const HeroCard = ({ icon: Icon, title, desc, action, color }) => (
        <div className="group relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon size={100} />
            </div>
            <div className={`p-3 rounded-xl w-fit mb-4 ${color.replace('text-', 'bg-').replace('500', '100')} dark:bg-opacity-20`}>
                <Icon size={32} className={color} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 h-10">{desc}</p>
            <button onClick={action} className="flex items-center text-sm font-bold text-gray-900 dark:text-white group-hover:translate-x-2 transition-transform">
                Explore <ArrowLeft className="ml-2 rotate-180" size={16} />
            </button>
        </div>
    );

    return (
        <div className="space-y-16 animate-fade-in pb-12">
            {/* Modern Hero Section with Grid Background */}
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 text-white shadow-2xl">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-sm"></div>
                
                <div className="relative z-10 px-8 py-20 md:py-32 flex flex-col items-center text-center max-w-4xl mx-auto">
                    <span className="mb-4 px-4 py-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-sm font-medium backdrop-blur-md">
                        ✨ The Official Alumni Network
                    </span>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                        Alumni Connect
                    </h1>
                    <h2 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-6">
                    A Comprehensive Alumni Management System
                    </h2>
                    <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl">
                        Bridge the gap between campus life and career success. Find mentors, exclusive jobs, and lifelong connections.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={() => onNavigate(user ? 'dashboard' : 'alumni')} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-blue-500/30 transform hover:scale-105">
                            {user ? 'Go to Dashboard' : 'Find Alumni'}
                        </button>
                        {!user && (
                            <button onClick={() => onNavigate('dashboard')} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold rounded-full transition-all">
                                View Opportunities
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                <HeroCard 
                    icon={Users} 
                    title="Alumni Directory" 
                    desc="Connect with seniors from your branch and company." 
                    action={() => onNavigate('alumni')}
                    color="text-blue-500" 
                />
                <HeroCard 
                    icon={Briefcase} 
                    title="Career Portal" 
                    desc="Access exclusive jobs posted by alumni." 
                    action={() => onNavigate('dashboard')}
                    color="text-green-500" 
                />
                <HeroCard 
                    icon={Calendar} 
                    title="Events & Reunions" 
                    desc="Never miss a meetup or guest lecture." 
                    action={() => onNavigate('dashboard')}
                    color="text-purple-500" 
                />
                <HeroCard 
                    icon={MessageSquare} 
                    title="AI Assistant" 
                    desc="Get instant answers about the network." 
                    action={() => onNavigate('Chatbot')}
                    color="text-yellow-500" 
                />
            </div>

            {/* Recent Activity Feed (Only if logged in) */}
            {user && recentItems.length > 0 && (
                <div className="px-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                        <LayoutDashboard className="mr-3" /> 
                        Fresh Updates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recentItems.map(item => (
                            <div key={item.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border-l-4 border-blue-500 shadow-md hover:shadow-lg transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${item.type === 'job' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {item.type}
                                    </span>
                                    <span className="text-xs text-gray-400">{item.postedAt ? new Date(item.postedAt.toMillis()).toLocaleDateString() : 'Just now'}</span>
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{item.title}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.company || item.organizer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Dashboard = ({ onNavigate, searchTerm }) => {
    const { dbInstance, appId, user, isAuthReady } = useAppContext();
    const [users, setUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [events, setEvents] = useState([]);
    const [posts, setPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('summary');
    const [myProfile, setMyProfile] = useState(null);

    useEffect(() => {
        if (!dbInstance || !appId || !isAuthReady) return;

        if (user) {
            getUserProfile(dbInstance, user.uid, appId).then(setMyProfile);
        }

        const usersQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/users`));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            setUsers(snapshot.docs.map(doc => doc.data()));
        }, (error) => console.error("Error fetching users:", error.code, error.message));

        const jobsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/jobs`));
        const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
            setJobs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        }, (error) => console.error("Error fetching jobs:", error.code, error.message));

        const eventsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/events`));
        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            setEvents(snapshot.docs.map(doc => doc.data()));
        }, (error) => console.error("Error fetching events:", error.code, error.message));

        const postsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/posts`), orderBy('postedAt', 'desc'));
        const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        }, (error) => console.error("Error fetching posts:", error.code, error.message));

        return () => {
            unsubscribeUsers();
            unsubscribeJobs();
            unsubscribeEvents();
            unsubscribePosts();
        };
    }, [dbInstance, appId, isAuthReady, user]);

    const stats = [
        { name: 'Alumni', count: users.filter(u => u.role === 'alumni').length, color: '#4CAF50' },
        { name: 'Students', count: users.filter(u => u.role === 'student').length, color: '#2196F3' },
        { name: 'Job Postings', count: jobs.length, color: '#FFC107' },
        { name: 'Upcoming Events', count: events.length, color: '#9C27B0' },
    ];

    return (
        <div className="space-y-8 p-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Dashboard</h2>
            
            <div className="flex space-x-4 border-b dark:border-gray-700 overflow-x-auto pb-2">
                <button onClick={() => setActiveTab('summary')} className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === 'summary' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Summary</button>
                <button onClick={() => setActiveTab('jobs')} className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === 'jobs' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Jobs</button>
                <button onClick={() => setActiveTab('events')} className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === 'events' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Events</button>
                <button onClick={() => setActiveTab('posts')} className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === 'posts' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Posts</button>
            </div>

            {activeTab === 'summary' && (
                 <div className="space-y-8">
                    {myProfile && <JobRecommendations userProfile={myProfile} allJobs={jobs} onNavigate={onNavigate} setActiveTab={setActiveTab} />}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">User Statistics</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.slice(0, 2)}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="count" fill="#3B82F6" barSize={40} radius={[10, 10, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Latest Activity</h3>
                            <ul className="space-y-4">
                                {jobs.slice(0, 3).map((job, index) => (
                                    <li key={index} className="flex items-start space-x-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                        <Briefcase size={20} className="text-blue-500 mt-1" />
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{job.title}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{job.company}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'jobs' && <Jobs searchTerm={searchTerm} onNavigate={onNavigate}/>}
            {activeTab === 'events' && <Events searchTerm={searchTerm} />}
            {activeTab === 'posts' && <MyPosts searchTerm={searchTerm} />}
        </div>
    );
};

const extractResumeData = async (base64Data, mimeType) => {
    const API_KEY = process.env.REACT_APP_GOOGLE_AI_API_KEY;
    if (!API_KEY) {
        console.error("Google AI API Key is missing. Please set REACT_APP_GOOGLE_AI_API_KEY in your .env.local file.");
        return null;
    }
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

    const prompt = `
        Analyze this resume. Extract the following details into a valid JSON format.
        - "name": string
        - "graduationYear": number
        - "branch": string
        - "skills": array of strings
        - "education": an array of objects, where each object has "degree", "institution", and "year".
        - "experience": an array of objects, where each object has "role", "company", "startDate", and "endDate".
        If a value or section cannot be found, set it to null or an empty array.
    `;
    const payload = {
        contents: [{
            parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }]
        }],
        generation_config: {
            response_mime_type: "application/json",
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("--- Google AI API Error ---");
            console.error("Status:", response.status, response.statusText);
            console.error("Response Body:", responseData);
            return null;
        }

        if (!responseData.candidates || responseData.candidates.length === 0) {
            console.error("Google AI API did not return any candidates. Response:", responseData);
            return null;
        }

        const jsonString = responseData.candidates[0].content.parts[0].text;
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("A network error occurred or the response was not valid JSON. Error:", error);
        return null;
    }
};

const getAIMatchScore = async (viewerProfile, targetProfile) => {
    const API_URL = process.env.REACT_APP_MATCH_SCORE_API_URL;
    if (!API_URL) {
        console.error("Match Score API URL is missing.");
        return 0;
    }

    const payload = {
        viewer_branch: viewerProfile.branch || '',
        viewer_skills: (viewerProfile.skills || []).join('|'),
        target_branch: targetProfile.branch || '',
        target_skills: (targetProfile.skills || []).join('|'),
        target_company: targetProfile.company || ''
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("API Error:", response.statusText);
            return 0;
        }

        const result = await response.json();
        return result.score;

    } catch (error) {
        console.error("Failed to fetch match score:", error);
        return 0;
    }
};

const getAIJobRecommendations = async (userProfile, jobs) => {
    if (!userProfile || !jobs || jobs.length === 0) {
        return [];
    }
    
    const API_URL = process.env.REACT_APP_JOB_RECOMMENDATION_API_URL;
    if (!API_URL) {
        console.error("Job Recommendation API URL is missing.");
        return [];
    }

    const payload = {
        user_profile: {
            skills: (userProfile.skills || []).join('|'),
            branch: userProfile.branch || '',
        },
        jobs: jobs.map(job => ({
            id: job.id,
            skills: (job.skills || []).join('|'),
            branch: job.branch || '',
        })),
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error("Custom API Error:", await response.text());
            throw new Error("Custom API request failed");
        }
        
        const recommendedIds = await response.json();
        return recommendedIds;

    } catch (error) {
        console.error("Error calling custom job recommendation API:", error);
        return [];
    }
};

// --- REPLACE THE JobRecommendations COMPONENT ---

const JobRecommendations = ({ userProfile, allJobs, onNavigate, setActiveTab }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    const isProfileComplete = userProfile && userProfile.skills?.length > 0 && userProfile.branch;

    // Helper to calculate Match Score locally
    // Robust Match Score Function
    const calculateMatchScore = (userSkills, jobSkills) => {
        if (!userSkills || !jobSkills) return 0;

        // 1. Normalize User Skills to an array of lowercase strings
        let uSkills = Array.isArray(userSkills) ? userSkills : userSkills.split(',').map(s => s.trim());
        uSkills = uSkills.map(s => s.toLowerCase());

        // 2. Normalize Job Skills to an array of lowercase strings
        let jSkills = Array.isArray(jobSkills) ? jobSkills : jobSkills.split(',').map(s => s.trim());
        jSkills = jSkills.map(s => s.toLowerCase());

        if (jSkills.length === 0) return 0;

        // 3. Find Matches
        const matchingSkills = jSkills.filter(jobSkill => 
            uSkills.some(userSkill => userSkill.includes(jobSkill) || jobSkill.includes(userSkill))
        );
        
        // 4. Calculate Percentage
        const score = (matchingSkills.length / jSkills.length) * 100;
        return Math.min(Math.round(score), 100);
    };

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (isProfileComplete && allJobs && allJobs.length > 0) {
                try {
                    setLoading(true);
                    
                    // 1. Get AI Recommendations (Keep your existing API logic)
                    const recommendedIds = await getAIJobRecommendations(userProfile, allJobs);
                    
                    let processedJobs = [];

                    if (Array.isArray(recommendedIds) && recommendedIds.length > 0) {
                        // Filter jobs returned by AI
                        processedJobs = allJobs.filter(job => recommendedIds.includes(job.id));
                    } else {
                        // Fallback: If AI fails or returns nothing, use local filtering
                         processedJobs = allJobs.filter(job => 
                            job.branch === userProfile.branch || 
                            calculateMatchScore(userProfile.skills, job.skills) > 30
                        );
                    }

                    // 2. Calculate Score & Rank for display
                    const rankedJobs = processedJobs.map(job => ({
                        ...job,
                        matchScore: calculateMatchScore(userProfile.skills, job.skills || [])
                    }));

                    // 3. Sort by Match Score (Highest first)
                    rankedJobs.sort((a, b) => b.matchScore - a.matchScore);

                    setRecommendations(rankedJobs);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [userProfile, allJobs, isProfileComplete]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-32 bg-gray-100 rounded-lg"></div>
                 <p className="mt-4 text-sm text-blue-500 font-medium">Analyzing your profile matches...</p>
            </div>
        );
    }
    
    if (!isProfileComplete) {
        return (
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg p-8 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-all duration-500"></div>
                <div className="relative z-10">
                    <Sparkles size={40} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-2xl font-bold text-white mb-2">Unlock AI Job Matching</h3>
                    <p className="text-gray-300 mb-6">Add your skills and branch to get ranked job recommendations.</p>
                    <button
                        onClick={() => onNavigate('profile')}
                        className="px-6 py-2 bg-white text-gray-900 font-bold rounded-full shadow-lg hover:bg-gray-100 transition-transform transform hover:scale-105"
                    >
                        Complete Profile
                    </button>
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700">
                <h3 className="text-xl font-bold text-white flex items-center">
                    <Sparkles size={20} className="text-yellow-300 mr-2" />
                    Top Picks for You
                </h3>
                <p className="text-blue-100 text-sm mt-1">Based on your skills & branch profile</p>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recommendations.slice(0, 5).map((job, index) => (
                    <div key={job.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 transition-colors">
                                        {job.title}
                                    </h4>
                                    {index === 0 && (
                                        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center border border-yellow-200">
                                            <Sparkles size={10} className="mr-1" /> #1 Match
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-2">{job.company}</p>
                                
                                {/* Rank/Score Bar */}
                                <div className="flex items-center mt-3">
                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
                                        <div 
                                            className={`h-full rounded-full ${job.matchScore >= 80 ? 'bg-green-500' : job.matchScore >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`} 
                                            style={{ width: `${job.matchScore}%` }}
                                        ></div>
                                    </div>
                                    <span className={`text-sm font-bold ${job.matchScore >= 80 ? 'text-green-600' : 'text-blue-600'}`}>
                                        {job.matchScore}% Match
                                    </span>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => setActiveTab('jobs')}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 text-center">
                <button onClick={() => setActiveTab('jobs')} className="text-sm text-blue-600 font-medium hover:underline">
                    View all {recommendations.length} matches
                </button>
            </div>
        </div>
    );
};
const AlumniProfileCard = ({ profile, user, connections, handleConnect }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col transition-all hover:shadow-2xl h-full">
            <div className="flex items-center space-x-4 mb-4">
                <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <User size={32} className="text-gray-500" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{profile.name}</h3>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{profile.headline || profile.role}</p>
                </div>
            </div>
            
            {profile.aiMatchScore !== undefined && (
                <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-center">
                    <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                        <Sparkles size={16} className="inline-block mr-1" />
                        AI Match Score: {profile.aiMatchScore}/10
                    </p>
                </div>
            )}

            <div className="space-y-2 text-left text-sm flex-grow">
                <p className="text-gray-800 dark:text-gray-200 flex items-center"><Briefcase size={16} className="mr-2 text-gray-500" />{profile.currentJob || 'N/A'} at {profile.company || 'N/A'}</p>
                <p className="text-gray-800 dark:text-gray-200 flex items-center"><GraduationCap size={16} className="mr-2 text-gray-500" />{profile.branch}, Graduated {profile.graduationYear}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                    {profile.skills?.slice(0, 3).map((skill, i) => (
                        <span key={i} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full dark:bg-gray-700 dark:text-gray-300">{skill}</span>
                    ))}
                </div>
            </div>

            <button
                onClick={() => handleConnect(profile.id)}
                disabled={!user || user.uid === profile.id || connections.includes(profile.id)}
                className={`mt-4 w-full px-4 py-2 text-white font-semibold rounded-full transition-colors ${!user || user.uid === profile.id || connections.includes(profile.id) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {connections.includes(profile.id) ? 'Connected' : 'Connect'}
            </button>
        </div>
    );
};

const AlumniDirectory = ({ searchTerm }) => {
    const { dbInstance, appId, user, isAuthReady } = useAppContext();
    const [profiles, setProfiles] = useState([]);
    const [myProfile, setMyProfile] = useState(null);
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('rank');
    const [selectedYear, setSelectedYear] = useState(null);

    useEffect(() => {
        if (!dbInstance || !appId || !isAuthReady) return;

        const fetchAndScoreProfiles = async () => {
            setLoading(true);
            setError('');
            try {
                const myProfileData = user ? await getUserProfile(dbInstance, user.uid, appId) : null;
                setMyProfile(myProfileData);

                const profilesQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/users`), where("role", "==", "alumni"));
                const snapshot = await getDocs(profilesQuery);
                let alumniProfiles = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                
                if (myProfileData) {
                    alumniProfiles = alumniProfiles.filter(profile => profile.id !== myProfileData.id);
                }

                if (myProfileData) {
                    // =================================================================
                    // !!! PERFORMANCE WARNING !!!
                    // The code below makes one API call for EVERY alumni profile.
                    // With 1000 alumni, this is 1000 API calls on every page load.
                    // This is NOT scalable and will be very slow and expensive.
                    //
                    // RECOMMENDED SOLUTION:
                    // 1. Create a Firebase Cloud Function that triggers when a user's
                    //    profile is updated.
                    // 2. Inside the function, calculate and store match scores between
                    //    that user and other relevant profiles.
                    // 3. Save these pre-calculated scores in Firestore.
                    // 4. This page should then simply fetch the pre-calculated scores
                    //    from Firestore, which is much faster and cheaper.
                    // =================================================================
                    const scoredProfiles = await Promise.all(
                        alumniProfiles.map(async (profile) => {
                            const score = await getAIMatchScore(myProfileData, profile);
                            return { ...profile, aiMatchScore: score };
                        })
                    );
                    scoredProfiles.sort((a, b) => (b.aiMatchScore || 0) - (a.aiMatchScore || 0));
                    setProfiles(scoredProfiles);
                } else {
                    setProfiles(alumniProfiles);
                }
                
            } catch (err) {
                console.error("Error fetching or scoring profiles:", err);
                setError("Could not load alumni profiles. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchAndScoreProfiles();

        if (user) {
            const connectionsDocRef = doc(dbInstance, `artifacts/${appId}/public/data/connections`, user.uid);
            const unsubscribeConnections = onSnapshot(connectionsDocRef, (docSnap) => {
                setConnections(docSnap.exists() ? docSnap.data().connectedTo || [] : []);
            });
            return () => unsubscribeConnections();
        }
    }, [dbInstance, appId, isAuthReady, user]);
    
    const groupedByBatch = profiles.reduce((acc, profile) => {
        const year = profile.graduationYear || 'Unknown Year';
        if (!acc[year]) acc[year] = [];
        acc[year].push(profile);
        return acc;
    }, {});
    
    const sortedYears = Object.keys(groupedByBatch).sort((a, b) => b - a);
    
    useEffect(() => {
        if (sortedYears.length > 0 && !selectedYear) {
            setSelectedYear(sortedYears[0]);
        }
    }, [sortedYears, selectedYear]);


    const handleConnect = async (targetUserId) => {
        if (!user) {
            setMessage("You must be logged in to send a connection request.");
            return;
        }
        const myConnectionsRef = doc(dbInstance, `artifacts/${appId}/public/data/connections`, user.uid);
        try {
            await setDoc(myConnectionsRef, { connectedTo: arrayUnion(targetUserId) }, { merge: true });
            setMessage("Connection request sent successfully!");
        } catch (error) {
            setMessage("Failed to send connection request. Please try again.");
            console.error("Error connecting:", error);
        }
    };
    
    const filteredProfiles = profiles.filter(profile => {
        return searchTerm === '' ||
            profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            profile.currentJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            profile.skills?.some(skill => skill?.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    return (
        <div className="space-y-8 p-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Alumni Directory</h2>
            {loading && (
                <div className="flex flex-col items-center justify-center min-h-[30vh]">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <span className="text-xl text-gray-600 dark:text-gray-400 mt-2">Fetching and ranking alumni...</span>
                </div>
            )}
            
            {!loading && (
                <>
                    {error && <div className="p-4 rounded-xl bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200">{error}</div>}
                    <div className="flex space-x-2 border-b-2 border-gray-200 dark:border-gray-700">
                        <button onClick={() => setActiveTab('rank')} className={`py-2 px-4 font-semibold ${activeTab === 'rank' ? 'border-b-4 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>By Rank</button>
                        <button onClick={() => setActiveTab('batch')} className={`py-2 px-4 font-semibold ${activeTab === 'batch' ? 'border-b-4 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>By Batch</button>
                    </div>
                    <div className="mt-6">
                        {activeTab === 'rank' && (
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Top Matches</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredProfiles.slice(0, 20).map(profile => (
                                        <AlumniProfileCard key={profile.id} profile={profile} user={user} connections={connections} handleConnect={handleConnect} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'batch' && (
                            <div>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {sortedYears.map(year => (
                                        <button key={year} onClick={() => setSelectedYear(year)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedYear === year ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                            {year}
                                        </button>
                                    ))}
                                </div>
                                {selectedYear && groupedByBatch[selectedYear] ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {groupedByBatch[selectedYear].map(profile => (
                                            <AlumniProfileCard key={profile.id} profile={profile} user={user} connections={connections} handleConnect={handleConnect} />
                                        ))}
                                    </div>
                                ) : <p>Select a batch to view alumni.</p>}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};


// --- REPLACE THE Jobs COMPONENT ---

// --- REPLACE THE Jobs COMPONENT ---

const Jobs = ({ searchTerm, onNavigate }) => { // <--- 1. Add onNavigate here
    const { dbInstance, appId, user, isAuthReady } = useAppContext();
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [myProfile, setMyProfile] = useState(null);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterConfig, setFilterConfig] = useState({ type: 'All', location: 'All' });

    // Form State
    const [jobData, setJobData] = useState({ title: '', company: '', location: '', type: 'Full-time', applicationUrl: '', description: '', skills: '' });
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!dbInstance || !appId || !isAuthReady || !user) return;
        setIsLoading(true);
        const jobsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/jobs`), orderBy('postedAt', 'desc'));
        const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
            const jobsList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setJobs(jobsList);
            if (!selectedJob && jobsList.length > 0) setSelectedJob(jobsList[0]);
            setIsLoading(false);
        });
        getUserProfile(dbInstance, user.uid, appId).then(setMyProfile);
        return () => unsubscribe();
    }, [dbInstance, appId, user, isAuthReady]);

    const handleInputChange = (e) => setJobData({ ...jobData, [e.target.name]: e.target.value });

    const handlePostJob = async (e) => {
        e.preventDefault();
        if (!myProfile || myProfile.role !== 'alumni') return setMessage('Only verified alumni can post jobs.');
        try {
            await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/jobs`), {
                ...jobData,
                skills: jobData.skills.split(',').map(s => s.trim()),
                postedBy: myProfile.name,
                postedById: user.uid, // This ID is needed for messaging
                postedAt: serverTimestamp(),
                applicants: 0
            });
            setMessage('Job posted successfully!');
            setIsPostModalOpen(false);
            setJobData({ title: '', company: '', location: '', type: 'Full-time', applicationUrl: '', description: '', skills: '' });
        } catch (error) { setMessage('Failed to post job.'); }
    };

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.company.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterConfig.type === 'All' || job.type === filterConfig.type;
        const isRemote = job.location?.toLowerCase().includes('remote');
        let matchesLocation = true;
        if (filterConfig.location === 'Remote') matchesLocation = isRemote;
        if (filterConfig.location === 'On-site') matchesLocation = !isRemote;
        return matchesSearch && matchesType && matchesLocation;
    });

    const JobListItem = ({ job, isSelected, onClick }) => (
        <div onClick={onClick} className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isSelected ? 'bg-blue-50 dark:bg-gray-800 border-l-4 border-l-blue-600' : 'bg-white dark:bg-gray-800'}`}>
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-lg text-gray-500">{job.company?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-base truncate ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{job.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{job.company}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center"><MapPin size={12} className="mr-1" /> {job.location || 'Remote'}</span>
                        <span>•</span>
                        <span>{job.postedAt?.toDate ? new Date(job.postedAt.toDate()).toLocaleDateString() : 'Recent'}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const JobDetailView = ({ job }) => {
        if (!job) return <div className="flex items-center justify-center h-full text-gray-400">Select a job to view details</div>;
        
        // 2. Add Messaging Logic
        const handleMessageClick = () => {
            if (user && job.postedById && job.postedById !== user.uid) {
                onNavigate('messenger', job.postedById);
            } else if (job.postedById === user.uid) {
                alert("You cannot message yourself!");
            } else {
                alert("Cannot message this user.");
            }
        };

        return (
            <div className="h-full flex flex-col bg-white dark:bg-gray-800 overflow-y-auto custom-scrollbar">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                    <div className="absolute -bottom-10 left-8">
                        <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-center border-4 border-white dark:border-gray-800">
                            <Building2 size={32} className="text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="pt-12 px-8 pb-8 flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title}</h2>
                            <div className="text-lg text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2">
                                {job.company} <span className="text-blue-500"><CheckCircle2 size={16} /></span>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                <span className="flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"><MapPin size={14} className="mr-1" /> {job.location || 'Remote'}</span>
                                <span className="flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"><Clock size={14} className="mr-1" /> {job.type || 'Full-time'}</span>
                                <span className="flex items-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded font-medium"><Globe size={14} className="mr-1" /> Actively Hiring</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a href={job.applicationUrl} target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">Apply Now</a>
                        </div>
                    </div>

                    <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About the job</h3>
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{job.description}</p>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Skills Required</h3>
                        <div className="flex flex-wrap gap-2">
                            {Array.isArray(job.skills) ? job.skills.map((skill, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-100 dark:border-blue-800">{skill}</span>
                            )) : <span className="text-gray-500 italic">No specific skills listed</span>}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Meet the Poster</h3>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <User size={20} className="text-gray-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{job.postedBy}</p>
                                <p className="text-xs text-gray-500">Alumni Member</p>
                            </div>
                            {/* 3. Update Button with Handler */}
                            <button 
                                onClick={handleMessageClick}
                                className="ml-auto text-blue-600 text-sm font-semibold hover:underline"
                            >
                                Message
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col max-w-7xl mx-auto px-0 md:px-4">
            <div className="flex justify-between items-center py-4 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 md:rounded-t-2xl relative">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Job Board</h2>
                    <p className="text-sm text-gray-500 hidden sm:block">Find your next opportunity or hire talent.</p>
                </div>
                
                <div className="flex gap-3 relative">
                    <div className="relative">
                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-colors ${isFilterOpen || filterConfig.type !== 'All' || filterConfig.location !== 'All' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            <Filter size={16} /> Filters
                            {(filterConfig.type !== 'All' || filterConfig.location !== 'All') && <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>}
                        </button>

                        {isFilterOpen && (
                            <div className="absolute top-12 right-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-fade-in">
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Job Type</h4>
                                    <select value={filterConfig.type} onChange={(e) => setFilterConfig({...filterConfig, type: e.target.value})} className="w-full p-2 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="All">All Types</option>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Internship">Internship</option>
                                    </select>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Location</h4>
                                    <div className="flex gap-2">
                                        {['All', 'Remote', 'On-site'].map(loc => (
                                            <button key={loc} onClick={() => setFilterConfig({...filterConfig, location: loc})} className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${filterConfig.location === loc ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>{loc}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t dark:border-gray-700 flex justify-between">
                                    <button onClick={() => setFilterConfig({type: 'All', location: 'All'})} className="text-xs text-red-500 hover:underline">Reset</button>
                                    <button onClick={() => setIsFilterOpen(false)} className="text-xs text-blue-600 font-bold hover:underline">Done</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {myProfile?.role === 'alumni' && (
                        <button onClick={() => setIsPostModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-sm font-bold shadow-md hover:opacity-90 transition-all">
                            <PlusCircle size={16} /> Post Job
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden border-l border-r border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 md:rounded-b-2xl shadow-sm">
                <div className={`w-full md:w-2/5 lg:w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto ${selectedJob ? 'hidden md:block' : 'block'}`}>
                    {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div> : 
                     filteredJobs.length > 0 ? filteredJobs.map(job => <JobListItem key={job.id} job={job} isSelected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} />) : 
                     <div className="p-8 text-center text-gray-500">No jobs found matching your criteria.</div>}
                </div>
                <div className={`w-full md:w-3/5 lg:w-2/3 bg-gray-50 dark:bg-gray-900 ${!selectedJob ? 'hidden md:block' : 'block'}`}>
                    {selectedJob ? (
                        <div className="h-full relative">
                            <button onClick={() => setSelectedJob(null)} className="md:hidden absolute top-4 left-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow-md"><ArrowLeft size={20} /></button>
                            <JobDetailView job={selectedJob} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Briefcase size={64} className="mb-4 opacity-20" />
                            <p>Select a job from the list to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {isPostModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Post a New Opportunity</h3>
                            <button onClick={() => setIsPostModalOpen(false)}><X size={24} className="text-gray-500 hover:text-gray-700" /></button>
                        </div>
                        
                        <form onSubmit={handlePostJob} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Job Title</label><input type="text" name="title" value={jobData.title} onChange={handleInputChange} className="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Senior React Developer" required /></div>
                                <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Company Name</label><input type="text" name="company" value={jobData.company} onChange={handleInputChange} className="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. TechCorp Inc." required /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Location</label><input type="text" name="location" value={jobData.location} onChange={handleInputChange} className="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. New York, NY (or Remote)" required /></div>
                                <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Job Type</label><select name="type" value={jobData.type} onChange={handleInputChange} className="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></div>
                            </div>
                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Application Link</label><input type="url" name="applicationUrl" value={jobData.applicationUrl} onChange={handleInputChange} className="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://" required /></div>
                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Required Skills</label><input type="text" name="skills" value={jobData.skills} onChange={handleInputChange} className="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. React, Node.js, Python" /></div>
                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Job Description</label><textarea name="description" value={jobData.description} onChange={handleInputChange} className="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-900 h-40 resize-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the role..." required /></div>
                        </form>
                        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                            <button onClick={() => setIsPostModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-600 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            <button onClick={handlePostJob} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all">Post Job</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 
// const Jobs = ({ searchTerm }) => {
//     const { dbInstance, appId, user, isAuthReady } = useAppContext();
//     const [jobs, setJobs] = useState([]);
//     const [myProfile, setMyProfile] = useState(null);
//     const [isPostModalOpen, setIsPostModalOpen] = useState(false);
//     const [jobTitle, setJobTitle] = useState('');
//     const [jobCompany, setJobCompany] = useState('');
//     const [jobApplicationUrl, setJobApplicationUrl] = useState('');
//     const [jobDescription, setJobDescription] = useState('');

//     const [message, setMessage] = useState('');
    
//     const clearFormAndCloseModal = () => {
//         setIsPostModalOpen(false);
//         setJobTitle('');
//         setJobCompany('');
//         setJobApplicationUrl('');
//         setJobDescription('');
//     };

//     useEffect(() => {
//         if (!dbInstance || !appId || !isAuthReady || !user) return;

//         const jobsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/jobs`));
//         const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
//             const jobsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
//             setJobs(jobsData);
//         }, (error) => console.error("Error fetching jobs:", error.code, error.message));

//         getUserProfile(dbInstance, user.uid, appId).then(setMyProfile);

//         return () => unsubscribeJobs();
//     }, [dbInstance, appId, user, isAuthReady]);

//     const handlePostJob = async (e) => {
//         e.preventDefault();
//         if (!dbInstance || !appId || !user || !myProfile || myProfile.role !== 'alumni') {
//             setMessage('You must be a verified alumni to post a job.');
//             return;
//         }
//         try {
//             await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/jobs`), {
//                 title: jobTitle,
//                 company: jobCompany,
//                 applicationUrl: jobApplicationUrl,
//                 description: jobDescription,
//                 postedBy: myProfile.name,
//                 postedById: user.uid,
//                 postedAt: serverTimestamp(),
//             });
//             setMessage('Job posted successfully!');
//             clearFormAndCloseModal();
//         } catch (error) {
//             console.error("Error posting job:", error);
//             setMessage('Failed to post job. Please try again.');
//         }
//     };

//     const filteredJobs = jobs.filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.company.toLowerCase().includes(searchTerm.toLowerCase()) || job.description.toLowerCase().includes(searchTerm.toLowerCase()));

//     return (
//         <div className="space-y-8 p-4">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Jobs</h2>
//                 {myProfile?.role === 'alumni' && (
//                     <button onClick={() => setIsPostModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
//                         Post a Job
//                     </button>
//                 )}
//             </div>
//             {message && (
//                 <div className="p-4 rounded-xl bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200">
//                     {message}
//                 </div>
//             )}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                 {filteredJobs.length > 0 ? (
//                     filteredJobs.map((job) => (
//                         <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col transition-all hover:shadow-2xl">
//                             <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{job.title}</h3>
//                             <p className="font-semibold text-gray-800 dark:text-gray-200">{job.company}</p>
//                             <p className="mt-2 flex-1 text-gray-600 dark:text-gray-400">{job.description}</p>
//                             <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">Posted by: {job.postedBy}</p>
//                             <p className="text-xs text-gray-400 dark:text-gray-600">Posted on: {job.postedAt?.toDate().toLocaleDateString()}</p>
//                             <a
//                                 href={job.applicationUrl}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="mt-4 block text-center px-4 py-2 bg-green-600 text-white rounded-full font-semibold transition-colors hover:bg-green-700"
//                             >
//                                 View & Apply on Company Site
//                             </a>
//                         </div>
//                     ))
//                 ) : (
//                     <div className="col-span-full text-center text-gray-500 dark:text-gray-400 italic text-lg">No job postings available.</div>
//                 )}
//             </div>

//             {isPostModalOpen && (
//                 <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
//                     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg mx-4">
//                         <div className="flex justify-between items-center mb-6">
//                             <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Post a New Job</h3>
//                             <button onClick={clearFormAndCloseModal} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
//                                 <X size={24} />
//                             </button>
//                         </div>
//                         <form onSubmit={handlePostJob} className="space-y-4">
//                             <div>
//                                 <label className="block text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
//                                 <input
//                                     type="text"
//                                     value={jobTitle}
//                                     onChange={(e) => setJobTitle(e.target.value)}
//                                     className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
//                                     required
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-gray-700 dark:text-gray-300 mb-1">Company</label>
//                                 <input
//                                     type="text"
//                                     value={jobCompany}
//                                     onChange={(e) => setJobCompany(e.target.value)}
//                                     className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
//                                     required
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-gray-700 dark:text-gray-300 mb-1">Application Link (URL)</label>
//                                 <input
//                                     type="url"
//                                     value={jobApplicationUrl}
//                                     onChange={(e) => setJobApplicationUrl(e.target.value)}
//                                     className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
//                                     placeholder="https://company.com/careers/job-id"
//                                     required
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-gray-700 dark:text-gray-300 mb-1">Description</label>
//                                 <textarea
//                                     value={jobDescription}
//                                     onChange={(e) => setJobDescription(e.target.value)}
//                                     className="w-full p-3 rounded-lg border h-32 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
//                                     required
//                                 />
//                             </div>
//                             <button type="submit" className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
//                                 Submit Job
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };
// --- REPLACE THE Events COMPONENT ---

const Events = ({ searchTerm }) => {
    const { dbInstance, appId, user, isAuthReady } = useAppContext();
    const [events, setEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [myProfile, setMyProfile] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [eventData, setEventData] = useState({ title: '', description: '', date: '', time: '', location: '' }); // Added time
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'registered'

    useEffect(() => {
        if (!dbInstance || !appId || !isAuthReady) return;

        setLoading(true);
        const eventsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/events`), orderBy("postedAt", "desc"));
        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(eventsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            setLoading(false);
        });

        return () => unsubscribeEvents();
    }, [dbInstance, appId, isAuthReady]);

    useEffect(() => {
        if (!user || !dbInstance || !appId || events.length === 0) {
            setMyRegistrations([]);
            return;
        };

        getUserProfile(dbInstance, user.uid, appId).then(setMyProfile);
        
        // Optimize: Check registrations (Note: Ideally, store this in user profile to avoid N+1 reads)
        const fetchRegistrations = async () => {
            const registeredEventIds = [];
            await Promise.all(events.map(async (event) => {
                const regRef = doc(dbInstance, `artifacts/${appId}/public/data/events/${event.id}/registrations`, user.uid);
                const docSnap = await getDoc(regRef);
                if (docSnap.exists()) registeredEventIds.push(event.id);
            }));
            setMyRegistrations(registeredEventIds);
        };
        fetchRegistrations();
    }, [user, dbInstance, appId, events]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEventData(prev => ({ ...prev, [name]: value }));
    };

    const displayMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handlePostEvent = async (e) => {
        e.preventDefault();
        if (!user || !myProfile || (myProfile.role !== 'alumni' && myProfile.role !== 'admin')) {
            return displayMessage('Only alumni/admins can post events.', 'error');
        }
        try {
            await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/events`), {
                ...eventData,
                organizer: myProfile.name,
                organizerId: user.uid,
                postedAt: serverTimestamp(),
                registrationCount: 0,
            });
            displayMessage('Event created successfully!');
            setIsModalOpen(false);
            setEventData({ title: '', description: '', date: '', time: '', location: '' });
        } catch (error) {
            displayMessage('Failed to post event.', 'error');
        }
    };
    
    // Handle Register/Unregister logic (Keep existing logic, just cleaner code)
    const toggleRegistration = async (event, isRegistered) => {
        if (!user || !myProfile) return displayMessage("Please log in.", 'error');

        const eventRef = doc(dbInstance, `artifacts/${appId}/public/data/events`, event.id);
        const regRef = doc(dbInstance, `artifacts/${appId}/public/data/events/${event.id}/registrations`, user.uid);
        const batch = writeBatch(dbInstance);

        try {
            if (isRegistered) {
                batch.delete(regRef);
                batch.update(eventRef, { registrationCount: increment(-1) });
                await batch.commit();
                setMyRegistrations(prev => prev.filter(id => id !== event.id));
                displayMessage(`Unregistered from "${event.title}".`);
            } else {
                batch.set(regRef, {
                    applicantId: user.uid,
                    applicantName: myProfile.name,
                    applicantEmail: user.email,
                    registeredAt: serverTimestamp()
                });
                batch.update(eventRef, { registrationCount: increment(1) });
                await batch.commit();
                setMyRegistrations(prev => [...prev, event.id]);
                displayMessage(`Registered for "${event.title}"!`);
            }
        } catch (error) {
            displayMessage("Action failed. Please try again.", 'error');
        }
    };

    // --- RENDER HELPERS ---
    
    // Helper to format date into { month: 'OCT', day: '25' }
    const getDateParts = (dateString) => {
        if (!dateString) return { month: 'TBD', day: '--' };
        const date = new Date(dateString);
        return {
            month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
            day: date.getDate(),
            full: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        };
    };

    const filteredEvents = events.filter(event => {
        const matchesSearch = (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const isMyEvent = activeTab === 'registered' ? myRegistrations.includes(event.id) : true;
        return matchesSearch && isMyEvent;
    });

    // Event Card Component (Professional List View)
    const EventCard = ({ event }) => {
        const isRegistered = myRegistrations.includes(event.id);
        const isOrganizer = user ? event.organizerId === user.uid : false;
        const { month, day, full } = getDateParts(event.date);

        return (
            <div className="group bg-white dark:bg-gray-800 rounded-2xl p-0 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row overflow-hidden">
                {/* Date Side (Visual) */}
                <div className="md:w-32 bg-gray-50 dark:bg-gray-900/50 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                    <span className="text-sm font-bold text-red-500 dark:text-red-400 tracking-wider mb-1">{month}</span>
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{day}</span>
                </div>

                {/* Content Side */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors mb-2">
                                    {event.title}
                                </h3>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <span className="flex items-center"><Clock size={16} className="mr-1.5" /> {event.time || 'Time TBD'}</span>
                                    <span className="flex items-center"><MapPin size={16} className="mr-1.5" /> {event.location}</span>
                                </div>
                            </div>
                            {/* Organizer Badge */}
                            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                                <span className="mr-1">By</span> {event.organizer}
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4">
                            {event.description}
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Users size={16} className="mr-2 text-green-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-200 mr-1">{event.registrationCount || 0}</span>
                            Attendees
                        </div>
                        
                        <button
                            onClick={() => !isOrganizer && toggleRegistration(event, isRegistered)}
                            disabled={!user || isOrganizer}
                            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all transform active:scale-95 flex items-center ${
                                isOrganizer 
                                ? 'bg-gray-100 text-gray-400 cursor-default' 
                                : isRegistered 
                                ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' 
                                : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5'
                            }`}
                        >
                            {isOrganizer ? 'Organizer' : isRegistered ? 'Registered' : <>Register Now <ChevronRight size={16} className="ml-1" /></>}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Discover workshops, reunions, and webinars.</p>
                </div>
                {myProfile && (myProfile.role === 'alumni' || myProfile.role === 'admin') && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full shadow-lg hover:opacity-90 transition-all">
                        <PlusCircle size={20} /> Host Event
                    </button>
                )}
            </div>

            {/* Message Alert */}
            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in-down ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    {message.text}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button 
                    onClick={() => setActiveTab('all')} 
                    className={`pb-3 px-6 text-sm font-semibold transition-colors relative ${activeTab === 'all' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    All Events
                    {activeTab === 'all' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
                </button>
                <button 
                    onClick={() => setActiveTab('registered')} 
                    className={`pb-3 px-6 text-sm font-semibold transition-colors relative ${activeTab === 'registered' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    My Registrations
                    {activeTab === 'registered' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
                </button>
            </div>

            {/* Events List */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
            ) : filteredEvents.length > 0 ? (
                <div className="space-y-6">
                    {filteredEvents.map(event => <EventCard key={event.id} event={event} />)}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No events found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or check back later.</p>
                </div>
            )}

            {/* Create Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Host an Event</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-500 hover:text-gray-700" /></button>
                        </div>
                        <form onSubmit={handlePostEvent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title</label>
                                <input type="text" name="title" value={eventData.title} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Annual Alumni Meetup 2024" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                    <input type="date" name="date" value={eventData.date} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                                    <input type="time" name="time" value={eventData.time} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location / Link</label>
                                <input type="text" name="location" value={eventData.location} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none" placeholder="University Auditorium or Zoom Link" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <textarea name="description" value={eventData.description} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-32 resize-none outline-none" placeholder="Describe the event agenda..." required />
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all transform active:scale-95">Publish Event</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
// const Events = ({ searchTerm }) => {
//     const { dbInstance, appId, user, isAuthReady } = useAppContext();
//     const [events, setEvents] = useState([]);
//     const [myRegistrations, setMyRegistrations] = useState([]);
//     const [myProfile, setMyProfile] = useState(null);
//     const [isModalOpen, setIsModalOpen] = useState(false);
//     const [eventData, setEventData] = useState({ title: '', description: '', date: '', location: '' });
//     const [message, setMessage] = useState({ text: '', type: '' });
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         if (!dbInstance || !appId || !isAuthReady) return;

//         setLoading(true);
//         const eventsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/events`), orderBy("postedAt", "desc"));
//         const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
//             const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//             setEvents(eventsData);
//             setLoading(false);
//         }, (error) => {
//             console.error("Error fetching events:", error.code, error.message);
//             setMessage({ text: 'Could not fetch events.', type: 'error' });
//             setLoading(false);
//         });

//         return () => unsubscribeEvents();
//     }, [dbInstance, appId, isAuthReady]);

//     useEffect(() => {
//         if (!user || !dbInstance || !appId || events.length === 0) {
//             setMyRegistrations([]);
//             return;
//         };

//         getUserProfile(dbInstance, user.uid, appId).then(setMyProfile);
        
//         // =================================================================
//         // !!! PERFORMANCE WARNING !!!
//         // The code below makes one database read for EVERY event to check
//         // if the current user is registered. This is an "N+1" query problem.
//         // With 100 events, this is 101 database reads on page load.
//         //
//         // RECOMMENDED SOLUTION:
//         // When a user registers for an event, also store that event's ID
//         // in a subcollection under the USER's document.
//         // e.g., /users/{userId}/registrations/{eventId}
//         // This page would then only need to fetch a single list of IDs
//         // from the current user's document, which is much more efficient.
//         // =================================================================
//         const fetchRegistrations = async () => {
//             const registeredEventIds = [];
//             const registrationChecks = events.map(event => {
//                 const registrationRef = doc(dbInstance, `artifacts/${appId}/public/data/events/${event.id}/registrations`, user.uid);
//                 return getDoc(registrationRef).then(docSnap => {
//                     if (docSnap.exists()) {
//                         registeredEventIds.push(event.id);
//                     }
//                 });
//             });

//             try {
//                 await Promise.all(registrationChecks);
//                 setMyRegistrations(registeredEventIds);
//             } catch (error) {
//                  console.error("Error fetching registrations:", error);
//                  setMessage({ text: 'Could not fetch your registrations.', type: 'error' });
//             }
//         };

//         fetchRegistrations();

//     }, [user, dbInstance, appId, events]);

//     const handleInputChange = (e) => {
//         const { name, value } = e.target;
//         setEventData(prev => ({ ...prev, [name]: value }));
//     };

//     const displayMessage = (text, type = 'success', duration = 3000) => {
//         setMessage({ text, type });
//         setTimeout(() => setMessage({ text: '', type: '' }), duration);
//     };

//     const handlePostEvent = async (e) => {
//         e.preventDefault();
//         if (!user || !myProfile || (myProfile.role !== 'alumni' && myProfile.role !== 'admin')) {
//             displayMessage('You must be an administrator or alumni to post an event.', 'error');
//             return;
//         }
//         try {
//             await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/events`), {
//                 ...eventData,
//                 organizer: myProfile.name,
//                 organizerId: user.uid,
//                 postedAt: serverTimestamp(),
//                 registrationCount: 0,
//             });
//             displayMessage('Event posted successfully!');
//             setIsModalOpen(false);
//             setEventData({ title: '', description: '', date: '', location: '' });
//         } catch (error) {
//             console.error("Error posting event:", error);
//             displayMessage('Failed to post event. Please try again.', 'error');
//         }
//     };
    
//     const handleRegister = async (event) => {
//         if (!user || !myProfile) {
//             displayMessage("You must be logged in to register.", 'error');
//             return;
//         }

//         const eventRef = doc(dbInstance, `artifacts/${appId}/public/data/events`, event.id);
//         const registrationRef = doc(dbInstance, `artifacts/${appId}/public/data/events/${event.id}/registrations`, user.uid);
        
//         try {
//             const batch = writeBatch(dbInstance);
//             batch.set(registrationRef, {
//                 applicantId: user.uid,
//                 applicantName: myProfile.name,
//                 applicantEmail: user.email,
//                 eventTitle: event.title,
//                 registeredAt: serverTimestamp()
//             });
//             batch.update(eventRef, { registrationCount: increment(1) });
//             await batch.commit();
//             displayMessage(`Successfully registered for "${event.title}"!`);
//         } catch (error) {
//             console.error("Error registering for event:", error);
//             displayMessage("Registration failed. Please try again.", 'error');
//         }
//     };

//     const handleUnregister = async (event) => {
//         if (!user) return;

//         const eventRef = doc(dbInstance, `artifacts/${appId}/public/data/events`, event.id);
//         const registrationRef = doc(dbInstance, `artifacts/${appId}/public/data/events/${event.id}/registrations`, user.uid);

//         try {
//             const batch = writeBatch(dbInstance);
//             batch.delete(registrationRef);
//             batch.update(eventRef, { registrationCount: increment(-1) });
//             await batch.commit();
//             displayMessage(`You have unregistered from "${event.title}".`);
//         } catch (error) {
//             console.error("Error unregistering from event:", error);
//             displayMessage("Failed to unregister. Please try again.", 'error');
//         }
//     };

//     const filteredEvents = events.filter(event => 
//         (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//         (event.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//         (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
//     );

//     const renderContent = () => {
//         if (loading) {
//             return (
//                 <div className="flex justify-center items-center min-h-[30vh]">
//                     <Loader2 className="animate-spin text-blue-500" size={32} />
//                 </div>
//             );
//         }
//         if (filteredEvents.length > 0) {
//             return (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {filteredEvents.map((event) => {
//                         const isRegistered = myRegistrations.includes(event.id);
//                         const isOrganizer = user ? event.organizerId === user.uid : false;

//                         return (
//                             <div key={event.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col transition-all hover:shadow-2xl">
//                                 <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{event.title}</h3>
//                                 <p className="mt-2 flex-1 text-gray-600 dark:text-gray-400">{event.description}</p>
//                                 <div className="mt-4 space-y-2">
//                                     <p className="text-sm text-gray-800 dark:text-gray-200 flex items-center"><Calendar size={16} className="mr-2 text-gray-500" />{new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
//                                     <p className="text-sm text-gray-800 dark:text-gray-200 flex items-center"><MapPin size={16} className="mr-2 text-gray-500" />{event.location}</p>
//                                     <p className="text-sm text-gray-800 dark:text-gray-200 flex items-center"><User size={16} className="mr-2 text-gray-500" />{event.organizer}</p>
//                                     <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center pt-2"><Users size={16} className="mr-2 text-green-500" />Registrations: {event.registrationCount || 0}</p>
//                                 </div>
//                                 <button
//                                     onClick={() => isRegistered ? handleUnregister(event) : handleRegister(event)}
//                                     disabled={!user || isOrganizer}
//                                     className={`mt-4 w-full px-4 py-2 text-white font-semibold rounded-full transition-colors ${
//                                         isOrganizer 
//                                         ? 'bg-gray-300 cursor-not-allowed dark:bg-gray-700' 
//                                         : isRegistered 
//                                         ? 'bg-amber-600 hover:bg-amber-700' 
//                                         : 'bg-blue-500 hover:bg-blue-600'
//                                     } ${!user && !isOrganizer ? 'bg-gray-400 cursor-not-allowed dark:bg-gray-600' : ''}`}
//                                 >
//                                     {isOrganizer ? 'You are the organizer' : isRegistered ? 'Unregister' : 'Register Now'}
//                                 </button>
//                             </div>
//                         );
//                     })}
//                 </div>
//             );
//         }
//         return (
//             <div className="col-span-full text-center text-gray-500 dark:text-gray-400 italic text-lg py-10">
//                 <Frown className="mx-auto text-gray-400" size={48} />
//                 <p className="mt-4">No upcoming events.</p>
//             </div>
//         );
//     };

//     return (
//         <div className="space-y-6 p-4">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Events</h2>
//                 {myProfile && (myProfile.role === 'alumni' || myProfile.role === 'admin') && (
//                     <button onClick={() => setIsModalOpen(true)} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
//                          <PlusCircle size={20} /> Organize
//                     </button>
//                 )}
//             </div>
            
//             {message.text && (
//                 <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'}`}>
//                     {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
//                     {message.text}
//                 </div>
//             )}
            
//             {renderContent()}

//             {isModalOpen && (
//                 <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
//                     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
//                         <div className="flex justify-between items-center mb-4">
//                             <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Organize a New Event</h3>
//                             <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
//                                 <X size={24} />
//                             </button>
//                         </div>
//                         <form onSubmit={handlePostEvent} className="space-y-4">
//                             <div>
//                                 <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
//                                 <input type="text" name="title" value={eventData.title} onChange={handleInputChange} className="w-full p-2.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" required />
//                             </div>
//                             <div>
//                                 <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Description</label>
//                                 <textarea name="description" value={eventData.description} onChange={handleInputChange} className="w-full p-2.5 rounded-lg border h-28 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" required />
//                             </div>
//                             <div>
//                                 <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Date</label>
//                                 <input type="date" name="date" value={eventData.date} onChange={handleInputChange} className="w-full p-2.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" required />
//                             </div>
//                             <div>
//                                 <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Location</label>
//                                 <input type="text" name="location" value={eventData.location} onChange={handleInputChange} className="w-full p-2.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" required />
//                             </div>
//                             <button type="submit" className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
//                                 Submit Event
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// --- REPLACE THE MyPosts COMPONENT AND ADD SUB-COMPONENTS ---

// 1. Individual Post Card Component (LinkedIn Style)
// --- REPLACE THE PostCard COMPONENT ---

const PostCard = ({ post, user, userProfile, onLike, onShare }) => {
    const { dbInstance, appId } = useAppContext(); // Get DB access inside the card
    const [isLiked, setIsLiked] = useState(false);
    const [showComments, setShowComments] = useState(false); // Toggle comment section
    const [commentText, setCommentText] = useState(''); // New comment input
    const [isPostingComment, setIsPostingComment] = useState(false);

    // Check if current user already liked this post (simple local check)
    // Note: In a real app, you'd check if user.uid is in a 'likes' array in DB
    useEffect(() => {
        // This is a placeholder for visual state. 
        // Real implementation requires an array of userIds in the 'likes' field.
    }, []);

    const handleLike = () => {
        setIsLiked(!isLiked);
        onLike(post.id, !isLiked);
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !user || !userProfile) return;

        setIsPostingComment(true);
        try {
            const postRef = doc(dbInstance, `artifacts/${appId}/public/data/posts`, post.id);
            
            const newComment = {
                id: Date.now().toString(), // Simple unique ID
                text: commentText,
                authorId: user.uid,
                authorName: userProfile.name,
                authorPic: userProfile.profilePictureUrl || null,
                timestamp: new Date() // Store as Date object (Firestore converts automatically)
            };

            await updateDoc(postRef, {
                comments: arrayUnion(newComment)
            });

            setCommentText('');
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Failed to post comment");
        } finally {
            setIsPostingComment(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-4 transition-all hover:shadow-md">
            {/* Header */}
            <div className="p-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                         {/* Author Avatar */}
                         {/* Note: Ideally post.postedByPic should be stored in the post doc */}
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                            {post.postedBy?.charAt(0)}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm hover:text-blue-600 cursor-pointer hover:underline">
                            {post.postedBy}
                        </h4>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                            {post.postedAt?.toDate().toLocaleDateString()} at {post.postedAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="px-4 pb-2">
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                </p>
            </div>

            {/* Media Attachment */}
            {post.mediaUrl && (
                <div className="mt-2 w-full h-64 md:h-80 bg-gray-100 dark:bg-gray-900 overflow-hidden border-t border-b border-gray-100 dark:border-gray-700">
                    <img src={post.mediaUrl} alt="Post attachment" className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity" />
                </div>
            )}

            {/* Stats Bar */}
            <div className="px-4 py-2 flex justify-between items-center text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <div className="bg-blue-500 rounded-full p-0.5"><ThumbsUp size={10} className="text-white" /></div>
                    <span>{post.likes || 0} likes</span>
                </div>
                <button onClick={() => setShowComments(!showComments)} className="hover:text-blue-500 hover:underline">
                    {post.comments?.length || 0} comments • {post.shares || 0} shares
                </button>
            </div>

            {/* Action Buttons */}
            <div className="px-2 py-1 flex justify-between items-center">
                <button onClick={handleLike} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isLiked ? 'text-blue-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                    <ThumbsUp size={18} className={isLiked ? "fill-current" : ""} />
                    <span className="text-sm">Like</span>
                </button>
                <button onClick={() => setShowComments(!showComments)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-600 dark:text-gray-400">
                    <MessageCircle size={18} />
                    <span className="text-sm">Comment</span>
                </button>
                <button onClick={() => onShare(post)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-600 dark:text-gray-400">
                    <Share2 size={18} />
                    <span className="text-sm">Repost</span>
                </button>
            </div>

            {/* COMMENTS SECTION */}
            {showComments && (
                <div className="bg-gray-50 dark:bg-gray-900/30 p-4 border-t border-gray-100 dark:border-gray-700 rounded-b-xl animate-fade-in">
                    
                    {/* Comment Input */}
                    <div className="flex gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {userProfile?.profilePictureUrl ? (
                                <img src={userProfile.profilePictureUrl} alt="Me" className="w-full h-full object-cover" />
                            ) : (
                                <User size={20} className="text-gray-500 m-1.5" />
                            )}
                        </div>
                        <form onSubmit={handleSubmitComment} className="flex-1 relative">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button 
                                type="submit" 
                                disabled={!commentText.trim() || isPostingComment}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4">
                        {post.comments && post.comments.length > 0 ? (
                            post.comments.map((comment, index) => (
                                <div key={index} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mt-1">
                                         {comment.authorPic ? (
                                            <img src={comment.authorPic} alt={comment.authorName} className="w-full h-full object-cover" />
                                         ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-xs font-bold text-gray-600">
                                                {comment.authorName?.charAt(0)}
                                            </div>
                                         )}
                                    </div>
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-r-xl rounded-bl-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{comment.authorName}</span>
                                            <span className="text-[10px] text-gray-500">
                                                {/* Handle timestamp (can be string or Firestore timestamp) */}
                                                {comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-gray-400 italic">No comments yet. Be the first to say something!</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. Main Feed Component
const MyPosts = ({ searchTerm }) => {
    const { dbInstance, appId, user, isAuthReady } = useAppContext();
    const [posts, setPosts] = useState([]);
    const [myProfile, setMyProfile] = useState(null);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    
    // Create Post State
    const [newPostContent, setNewPostContent] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!dbInstance || !appId || !isAuthReady) return;

        // Fetch Posts
        const postsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/posts`), orderBy('postedAt', 'desc'));
        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        }, (error) => console.error("Error fetching posts:", error));

        // Fetch User Profile
        if (user) {
            getUserProfile(dbInstance, user.uid, appId).then(setMyProfile);
        }
        return () => unsubscribe();
    }, [dbInstance, appId, isAuthReady, user]);

    // Handle File Selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    // Handle Creating Post (with Image Upload)
    const handlePost = async (e) => {
        e.preventDefault();
        if (!user || !myProfile) return setMessage('Please log in.');
        
        setIsUploading(true);
        let downloadURL = null;

        try {
            // 1. Upload Image if exists
            if (mediaFile) {
                const storageRef = ref(storage, `postMedia/${user.uid}/${Date.now()}_${mediaFile.name}`);
                const snapshot = await uploadBytes(storageRef, mediaFile);
                downloadURL = await getDownloadURL(snapshot.ref);
            }

            // 2. Save Post Document
            await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/posts`), {
                content: newPostContent,
                mediaUrl: downloadURL || null,
                postedBy: myProfile.name,
                postedById: user.uid,
                postedAt: serverTimestamp(),
                likes: 0,
                shares: 0,
                comments: [],
            });

            setMessage('Posted successfully!');
            setNewPostContent('');
            setMediaFile(null);
            setMediaPreview(null);
            setIsPostModalOpen(false);
        } catch (error) {
            console.error("Error posting:", error);
            setMessage('Failed to post.');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle Like Action
    const handleLikePost = async (postId, isLiking) => {
        if(!user) return;
        const postRef = doc(dbInstance, `artifacts/${appId}/public/data/posts`, postId);
        await updateDoc(postRef, { likes: increment(isLiking ? 1 : -1) });
    };

    // Handle Share/Repost Action (Simple Reshare)
    const handleSharePost = async (originalPost) => {
        if (!user || !myProfile) return;
        const confirmShare = window.confirm("Repost this to your feed?");
        if (!confirmShare) return;

        try {
            // Create a new post referencing the old one
            await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/posts`), {
                content: `Shared a post by ${originalPost.postedBy}:\n\n${originalPost.content}`,
                mediaUrl: originalPost.mediaUrl || null,
                postedBy: myProfile.name,
                postedById: user.uid,
                postedAt: serverTimestamp(),
                isReshare: true,
                likes: 0,
                shares: 0
            });
            
            // Increment share count on original
            const originalPostRef = doc(dbInstance, `artifacts/${appId}/public/data/posts`, originalPost.id);
            await updateDoc(originalPostRef, { shares: increment(1) });
            
            alert("Reposted successfully!");
        } catch (error) {
            console.error("Error resharing:", error);
        }
    };

    const filteredPosts = posts.filter(post => 
        (post.content?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-3xl mx-auto py-6 px-4">
            
            {/* 1. "Start a Post" Bar (LinkedIn Style) */}
            {user && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                         {myProfile?.profilePictureUrl ? (
                            <img src={myProfile.profilePictureUrl} alt="Me" className="w-full h-full object-cover" />
                         ) : (
                            <User size={24} className="text-gray-500 m-3" />
                         )}
                    </div>
                    <button 
                        onClick={() => setIsPostModalOpen(true)}
                        className="flex-1 text-left px-5 py-3 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Start a post...
                    </button>
                    <button onClick={() => setIsPostModalOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg hidden sm:block">
                        <ImageIcon size={24} className="text-blue-500" />
                    </button>
                    <button onClick={() => setIsPostModalOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg hidden sm:block">
                        <FileText size={24} className="text-orange-500" />
                    </button>
                </div>
            )}

            {/* 2. Feed */}
            {message && <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg">{message}</div>}
            
            <div className="space-y-4">
                {filteredPosts.length > 0 ? (
                    filteredPosts.map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            user={user}
                            userProfile={myProfile}
                            onLike={handleLikePost}
                            onShare={handleSharePost}
                        />
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500">No posts yet. Be the first to share!</div>
                )}
            </div>

            {/* 3. Create Post Modal */}
            {isPostModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Modal Header */}
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create a post</h3>
                            <button onClick={() => setIsPostModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                                     {myProfile?.profilePictureUrl ? (
                                        <img src={myProfile.profilePictureUrl} alt="Me" className="w-full h-full object-cover" />
                                     ) : (
                                        <User size={24} className="text-gray-500 m-3" />
                                     )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{myProfile?.name}</h4>
                                    <span className="text-xs text-gray-500 border border-gray-300 rounded-full px-2 py-0.5">Anyone</span>
                                </div>
                            </div>

                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="What do you want to talk about?"
                                className="w-full h-32 p-2 text-lg bg-transparent border-none focus:ring-0 resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                            />

                            {mediaPreview && (
                                <div className="relative mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <img src={mediaPreview} alt="Preview" className="w-full max-h-60 object-contain bg-gray-50" />
                                    <button 
                                        onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                                        className="absolute top-2 right-2 bg-gray-900/70 text-white p-1 rounded-full hover:bg-black"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer (Actions) */}
                        <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between">
                            <div className="flex gap-2">
                                <label className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group tooltip-container relative">
                                    <ImageIcon size={24} className="text-gray-500 group-hover:text-blue-600" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-not-allowed opacity-50">
                                    <Briefcase size={24} className="text-gray-500" />
                                </button>
                                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-not-allowed opacity-50">
                                    <Calendar size={24} className="text-gray-500" />
                                </button>
                            </div>

                            <button 
                                onClick={handlePost} 
                                disabled={(!newPostContent.trim() && !mediaFile) || isUploading}
                                className={`px-6 py-2 rounded-full font-semibold transition-all ${(!newPostContent.trim() && !mediaFile) || isUploading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                {isUploading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={16} /> Posting
                                    </div>
                                ) : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// const MyPosts = ({ searchTerm }) => {
//     const { dbInstance, appId, user, isAuthReady } = useAppContext();
//     const [posts, setPosts] = useState([]);
//     const [myProfile, setMyProfile] = useState(null);
//     const [isPostModalOpen, setIsPostModalOpen] = useState(false);
//     const [newPostTitle, setNewPostTitle] = useState('');
//     const [newPostContent, setNewPostContent] = useState('');
//     const [message, setMessage] = useState('');

//     const clearFormAndCloseModal = () => {
//         setIsPostModalOpen(false);
//         setNewPostTitle('');
//         setNewPostContent('');
//     }

//     useEffect(() => {
//         if (!dbInstance || !appId || !isAuthReady) return;

//         const postsQuery = query(collection(dbInstance, `artifacts/${appId}/public/data/posts`), orderBy('postedAt', 'desc'));
//         const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
//             setPosts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
//         }, (error) => console.error("Error fetching posts:", error.code, error.message));

//         if (user) {
//             getUserProfile(dbInstance, user.uid, appId).then(setMyProfile);
//         }
//         return () => unsubscribe();
//     }, [dbInstance, appId, isAuthReady, user]);

//     const handlePost = async (e) => {
//         e.preventDefault();
//         if (!dbInstance || !appId || !user || !myProfile) {
//             setMessage('You must be logged in to post.');
//             return;
//         }
//         try {
//             await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/posts`), {
//                 title: newPostTitle,
//                 content: newPostContent,
//                 postedBy: myProfile.name,
//                 postedById: user.uid,
//                 postedAt: serverTimestamp(),
//                 likes: 0,
//                 comments: [],
//             });
//             setMessage('Post shared successfully!');
//             clearFormAndCloseModal();
//         } catch (error) {
//             console.error("Error posting:", error);
//             setMessage('Failed to share post. Please try again.');
//         }
//     };

//     const PostModal = () => (
//         <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg mx-4">
//                 <div className="flex justify-between items-center mb-6">
//                     <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create a New Post</h3>
//                     <button onClick={clearFormAndCloseModal} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
//                         <X size={24} />
//                     </button>
//                 </div>
//                 <form onSubmit={handlePost} className="space-y-4">
//                     <div>
//                         <label className="block text-gray-700 dark:text-gray-300 mb-1">Post Title</label>
//                         <input
//                             type="text"
//                             value={newPostTitle}
//                             onChange={(e) => setNewPostTitle(e.target.value)}
//                             className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
//                             required
//                         />
//                     </div>
//                     <div>
//                         <label className="block text-gray-700 dark:text-gray-300 mb-1">Content</label>
//                         <textarea
//                             value={newPostContent}
//                             onChange={(e) => setNewPostContent(e.target.value)}
//                             className="w-full p-3 rounded-lg border h-32 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
//                             required
//                         />
//                     </div>
//                     <button type="submit" className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
//                         Share Post
//                     </button>
//                 </form>
//             </div>
//         </div>
//     );

//     const filteredPosts = posts.filter(post => post.title.toLowerCase().includes(searchTerm.toLowerCase()) || post.content.toLowerCase().includes(searchTerm.toLowerCase()));

//     return (
//         <div className="space-y-8 p-4">
//             <div className="flex justify-between items-center">
//                 <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Posts</h2>
//                 {myProfile && (
//                     <button onClick={() => setIsPostModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
//                         <PlusCircle size={18} /> <span>Create Post</span>
//                     </button>
//                 )}
//             </div>
//             {message && (
//                 <div className="p-4 rounded-xl bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200">
//                     {message}
//                 </div>
//             )}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                 {filteredPosts.length > 0 ? (
//                     filteredPosts.map((post) => (
//                         <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col transition-all hover:shadow-2xl">
//                             <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{post.title}</h3>
//                             <p className="mt-2 flex-1 text-gray-600 dark:text-gray-400">{post.content}</p>
//                             <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">Posted by: {post.postedBy}</p>
//                             <p className="text-xs text-gray-400 dark:text-gray-600">Posted on: {post.postedAt?.toDate().toLocaleDateString()}</p>
//                         </div>
//                     ))
//                 ) : (
//                     <div className="col-span-full text-center text-gray-500 dark:text-gray-400 italic text-lg">No posts to display.</div>
//                 )}
//             </div>
//             {isPostModalOpen && <PostModal />}
//         </div>
//     );
// };

// const ConnectionsPage = ({ onViewProfile }) => {
//     const { dbInstance, appId, user } = useAppContext();
//     const [connections, setConnections] = useState([]);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         if (!user) return;

//         const fetchConnections = async () => {
//             setLoading(true);
//             try {
//                 const connectionsDocRef = doc(dbInstance, `artifacts/${appId}/public/data/connections`, user.uid);
//                 const docSnap = await getDoc(connectionsDocRef);

//                 if (docSnap.exists()) {
//                     const connectionIds = docSnap.data().connectedTo || [];
//                     const profilePromises = connectionIds.map(id => getUserProfile(dbInstance, id, appId));
//                     const connectionProfiles = await Promise.all(profilePromises);
//                     setConnections(connectionProfiles.filter(Boolean));
//                 }
//             } catch (error) {
//                 console.error("Error fetching connections:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchConnections();
//     }, [dbInstance, appId, user]);

//     if (loading) {
//         return (
//             <div className="flex justify-center items-center min-h-[50vh]">
//                 <Loader2 className="animate-spin text-blue-500" size={32} />
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-8 p-4">
//             <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Connections</h2>
//             {connections.length > 0 ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {connections.map(profile => (
//                         <div key={profile.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center transition-all hover:shadow-2xl hover:scale-105">
//                             <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
//                                 {profile.profilePictureUrl ? (
//                                     <img src={profile.profilePictureUrl} alt={profile.name} className="w-full h-full object-cover" />
//                                 ) : (
//                                     <User size={48} className="text-gray-500" />
//                                 )}
//                             </div>
//                             <h4 className="text-xl font-bold mt-4 text-gray-900 dark:text-gray-100">{profile.name}</h4>
//                             <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{profile.headline || profile.role}</p>
//                             <button onClick={() => onViewProfile(profile.id)} className="mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
//                                 View Profile
//                             </button>
//                         </div>
//                     ))}
//                 </div>
//             ) : (
//                 <p className="text-center text-gray-500 dark:text-gray-400 italic">You haven't made any connections yet. Go to the Alumni Directory to connect with others.</p>
//             )}
//         </div>
//     );
// };

// --- REPLACE THE ConnectionsPage COMPONENT ---

const ConnectionsPage = ({ onViewProfile, onMessage }) => {
    const { dbInstance, appId, user } = useAppContext();
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchConnections = async () => {
            setLoading(true);
            try {
                const connectionsDocRef = doc(dbInstance, `artifacts/${appId}/public/data/connections`, user.uid);
                const docSnap = await getDoc(connectionsDocRef);

                if (docSnap.exists()) {
                    const connectionIds = docSnap.data().connectedTo || [];
                    // Fetch profiles in parallel
                    const profilePromises = connectionIds.map(id => getUserProfile(dbInstance, id, appId));
                    const connectionProfiles = await Promise.all(profilePromises);
                    setConnections(connectionProfiles.filter(Boolean));
                }
            } catch (error) {
                console.error("Error fetching connections:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchConnections();
    }, [dbInstance, appId, user]);

    // Filter connections based on search
    const filteredConnections = connections.filter(profile => 
        profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header Section with Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Network</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{connections.length} Connections</p>
                </div>
                
                <div className="relative w-full md:w-72">
                    <input
                        type="text"
                        placeholder="Search connections..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
            </div>

            {/* Connections Grid */}
            {filteredConnections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredConnections.map((profile) => (
                        <div key={profile.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 transform hover:-translate-y-1">
                            
                            {/* Card Banner (Gradient) */}
                            <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>

                            {/* Card Body */}
                            <div className="px-6 pb-6 relative">
                                {/* Avatar (Overlapping Banner) */}
                                <div className="absolute -top-12 left-6">
                                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800 shadow-md flex items-center justify-center overflow-hidden">
                                        {profile.profilePictureUrl ? (
                                            <img src={profile.profilePictureUrl} alt={profile.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                                                <User size={36} className="text-gray-400 dark:text-gray-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Dots (Top Right) */}
                                <div className="flex justify-end pt-3">
                                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>

                                {/* User Info */}
                                <div className="mt-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors truncate">
                                        {profile.name}
                                    </h3>
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 truncate">
                                        {profile.currentJob ? `${profile.currentJob} @ ${profile.company}` : profile.role}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[40px]">
                                        {profile.headline || "Alumni Member"}
                                    </p>

                                    {/* Quick Stats / Location */}
                                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                                        <div className="flex items-center">
                                            <Briefcase size={14} className="mr-1.5" />
                                            {profile.branch || 'N/A'}
                                        </div>
                                        <div className="flex items-center">
                                            <GraduationCap size={14} className="mr-1.5" />
                                            {profile.graduationYear || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-6">
                                   <button 
                                        onClick={() => onViewProfile(profile.id)} 
                                        className="flex-1 py-2 px-4 rounded-full border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                        View Profile
                                    </button>
                                    <button 
                                       onClick={() => onMessage(profile.id)} 
                                        className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                                        title="Send Message"
                                    >
                                        <MessageCircle size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <Users size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">No connections found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">
                        {searchTerm ? `No results for "${searchTerm}"` : "Start building your network by browsing the Alumni Directory."}
                    </p>
                    {!searchTerm && (
                        <button className="mt-6 text-blue-600 font-semibold hover:underline">
                            Go to Directory
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
const ViewProfilePage = ({ profileId, onNavigate }) => {
    const { dbInstance, appId } = useAppContext();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileId) return;
        const fetchProfile = async () => {
            setLoading(true);
            const profile = await getUserProfile(dbInstance, profileId, appId);
            setProfileData(profile);
            setLoading(false);
        };
        fetchProfile();
    }, [profileId, dbInstance, appId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (!profileData) {
        return <div className="text-center p-8">Profile not found.</div>;
    }

    return (
        <div className="p-4 space-y-8">
             <button onClick={() => onNavigate('connections')} className="flex items-center text-blue-500 hover:underline mb-4">
                <ArrowLeft size={20} className="mr-1" />
                Back to Connections
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
                <ProfileHeadline {...profileData} />
                <hr className="border-gray-200 dark:border-gray-700" />
                <ExperienceSection experience={profileData?.experience || []} />
                <hr className="border-gray-200 dark:border-gray-700" />
                <EducationSection education={profileData?.education || []} />
                <hr className="border-gray-200 dark:border-gray-700" />
                <SkillsSection skills={profileData?.skills} />
            </div>
        </div>
    );
};

const NewChatModal = ({ isOpen, onClose, onSelectUser }) => {
    const { dbInstance, appId, user } = useAppContext();
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen || !user) return;

        const fetchConnections = async () => {
            setLoading(true);
            const connectionsDocRef = doc(dbInstance, `artifacts/${appId}/public/data/connections`, user.uid);
            const connectionsSnap = await getDoc(connectionsDocRef);

            if (connectionsSnap.exists()) {
                const connectionIds = connectionsSnap.data().connectedTo || [];
                const profiles = await Promise.all(
                    connectionIds.map(id => getUserProfile(dbInstance, id, appId))
                );
                setConnections(profiles.filter(Boolean));
            }
            setLoading(false);
        };

        fetchConnections();
    }, [isOpen, user, dbInstance, appId]);

    if (!isOpen) return null;

    const filteredConnections = connections.filter(conn =>
        conn.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-auto flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Message</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="relative mb-4">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search your connections..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 rounded-full border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : filteredConnections.length > 0 ? (
                        filteredConnections.map(conn => (
                            <div key={conn.id} onClick={() => onSelectUser(conn.id)} className="flex items-center p-3 space-x-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {conn.profilePictureUrl ? (
                                        <img src={conn.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={24} className="text-gray-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{conn.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{conn.headline || conn.role}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 italic py-8">No connections found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// const Messenger = () => {
//     const { dbInstance, appId, user, isAuthReady } = useAppContext();
//     const [conversations, setConversations] = useState([]);
//     const [activeChat, setActiveChat] = useState(null);
//     const [newMessage, setNewMessage] = useState('');
//     const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
//     const chatEndRef = useRef(null);

//     const formatTimestamp = (timestamp) => {
//         if (!timestamp) return '';
//         if (timestamp.toDate) { // Check if it's a Firestore timestamp
//              return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//         }
//         return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//     }

//     useEffect(() => {
//         if (!dbInstance || !user || !isAuthReady) return;
//         const q = query(collection(dbInstance, `artifacts/${appId}/public/data/messages`), where('participants', 'array-contains', user.uid));
//         const unsubscribe = onSnapshot(q, async (snapshot) => {
//             const conversationsData = await Promise.all(snapshot.docs.map(async (doc) => {
//                 const data = doc.data();
//                 const otherUserId = data.participants.find(id => id !== user.uid);
//                 const otherUserProfile = await getUserProfile(dbInstance, otherUserId, appId);
//                 return { id: doc.id, ...data, otherUser: otherUserProfile };
//             }));
//             conversationsData.sort((a, b) => (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0));
//             setConversations(conversationsData);
//         });
//         return () => unsubscribe();
//     }, [dbInstance, appId, user, isAuthReady]);

//     useEffect(() => {
//         if (activeChat?.id) {
//             const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, activeChat.id);
//             const unsubscribe = onSnapshot(chatDocRef, (doc) => {
//                 if (doc.exists()) {
//                     setActiveChat(prev => ({ ...prev, ...doc.data() }));
//                 }
//             });
//             return () => unsubscribe();
//         }
//     }, [activeChat?.id, dbInstance, appId]);

//     useEffect(() => {
//         chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//     }, [activeChat?.messages]);

//     const handleSendMessage = async () => {
//         if (newMessage.trim() === '' || !activeChat) return;

//         // Firestore does not support serverTimestamp() inside arrayUnion.
//         // We use a client-side timestamp for the message object,
//         // but still use serverTimestamp() to update the top-level 'lastUpdated' field.
//         const messagePayload = {
//             senderId: user.uid,
//             text: newMessage,
//             timestamp: new Date(),
//         };

//         const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, activeChat.id);

//         await updateDoc(chatDocRef, {
//             messages: arrayUnion(messagePayload),
//             lastUpdated: serverTimestamp()
//         });

//         setNewMessage('');
//     };

//     const handleStartNewChat = async (otherUserId) => {
//         setIsNewChatModalOpen(false);
//         if (!user || !dbInstance) return;
//         const chatId = await findOrCreateChat(dbInstance, appId, user.uid, otherUserId);
//         const chatDoc = await getDoc(doc(dbInstance, `artifacts/${appId}/public/data/messages`, chatId));
//         const otherUser = await getUserProfile(dbInstance, otherUserId, appId);
//         if (chatDoc.exists()) {
//             const newActiveChat = { id: chatDoc.id, ...chatDoc.data(), otherUser };
//             handleSelectConversation(newActiveChat);
//         }
//     };

//     const handleSelectConversation = async (conv) => {
//         setActiveChat(conv);
//         const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, conv.id);
//         await updateDoc(chatDocRef, {
//             [`lastRead.${user.uid}`]: serverTimestamp()
//         });
//     };

//     return (
//         <div className="flex w-full min-h-[calc(100vh-160px)] p-0">
//             {/* Conversation List (Left Panel) */}
//             <div className={`w-full md:w-1/3 h-full bg-white dark:bg-gray-800 border-r dark:border-gray-700 md:rounded-l-xl md:shadow-lg flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
//                 <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
//                     <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Conversations</h3>
//                     <button onClick={() => setIsNewChatModalOpen(true)} className="p-2 rounded-full text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700">
//                         <PlusCircle size={24} />
//                     </button>
//                 </div>
//                 <div className="overflow-y-auto flex-1">
//                     {conversations.map(conv => {
//                         const lastReadTime = conv.lastRead?.[user.uid]?.toMillis();
//                         const lastUpdatedTime = conv.lastUpdated?.toMillis();
//                         const isUnread = lastUpdatedTime && (!lastReadTime || lastUpdatedTime > lastReadTime);
//                         return (
//                             <div
//                                 key={conv.id}
//                                 onClick={() => handleSelectConversation(conv)}
//                                 className={`p-3 flex items-center space-x-3 cursor-pointer transition-colors border-b dark:border-gray-700 ${activeChat?.id === conv.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
//                             >
//                                 <div className="relative">
//                                     <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
//                                         {conv.otherUser?.profilePictureUrl ? (
//                                             <img src={conv.otherUser.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
//                                         ) : (
//                                             <User size={24} className="text-gray-500" />
//                                         )}
//                                     </div>
//                                     {isUnread && (
//                                         <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-800" />
//                                     )}
//                                 </div>
//                                 <div className="flex-1 overflow-hidden">
//                                     <div className="flex justify-between items-center">
//                                         <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{conv.otherUser?.name || 'Unknown User'}</p>
//                                         <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatTimestamp(conv.lastUpdated)}</span>
//                                     </div>
//                                     <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.messages?.[conv.messages.length - 1]?.text || 'No messages yet'}</p>
//                                 </div>
//                             </div>
//                         );
//                     })}
//                 </div>
//             </div>

//             {/* Active Chat Window (Right Panel) */}
//             <div className={`flex-1 flex flex-col bg-white dark:bg-gray-800 md:rounded-r-xl md:shadow-lg ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
//                 {activeChat ? (
//                     <>
//                         <div className="flex items-center p-4 border-b dark:border-gray-700">
//                             <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full mr-2">
//                                 <ArrowLeft size={20} />
//                             </button>
//                             <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
//                                 {activeChat.otherUser?.profilePictureUrl ? (
//                                     <img src={activeChat.otherUser.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
//                                 ) : (
//                                     <User size={20} className="text-gray-500" />
//                                 )}
//                             </div>
//                             <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 ml-3">{activeChat.otherUser?.name || 'Chat'}</h3>
//                         </div>
//                         <div className="flex-1 overflow-y-auto space-y-4 p-4">
//                             {activeChat.messages?.map((msg, index) => (
//                                 <div key={index} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
//                                     <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.senderId === user.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}>
//                                         <p>{msg.text}</p>
//                                         <span className="block text-xs text-right opacity-60 mt-1">{formatTimestamp(msg.timestamp)}</span>
//                                     </div>
//                                 </div>
//                             ))}
//                             <div ref={chatEndRef} />
//                         </div>
//                         <div className="p-4 border-t dark:border-gray-700">
//                             <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-full p-2">
//                                 <input
//                                     type="text"
//                                     value={newMessage}
//                                     onChange={(e) => setNewMessage(e.target.value)}
//                                     onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
//                                     placeholder="Message..."
//                                     className="flex-1 bg-transparent p-2 rounded-full text-gray-900 dark:text-gray-100 focus:outline-none"
//                                 />
//                                 <button
//                                     onClick={handleSendMessage}
//                                     className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
//                                 >
//                                     <Send size={20} />
//                                 </button>
//                             </div>
//                         </div>
//                     </>
//                 ) : (
//                      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 italic">
//                         Select a conversation or start a new one.
//                     </div>
//                 )}
//             </div>
            
//             <NewChatModal
//                 isOpen={isNewChatModalOpen}
//                 onClose={() => setIsNewChatModalOpen(false)}
//                 onSelectUser={handleStartNewChat}
//             />
//         </div>
//     );
// };

const Messenger = ({ initialUserId }) => { // <--- 1. Add prop here
    const { dbInstance, appId, user, isAuthReady } = useAppContext();
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const chatEndRef = useRef(null);

    // ... (Keep formatTimestamp function exactly the same) ...
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        if (timestamp.toDate) return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // ... (Keep existing useEffect for fetching conversations) ...
    useEffect(() => {
        if (!dbInstance || !user || !isAuthReady) return;
        const q = query(collection(dbInstance, `artifacts/${appId}/public/data/messages`), where('participants', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const conversationsData = await Promise.all(snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const otherUserId = data.participants.find(id => id !== user.uid);
                const otherUserProfile = await getUserProfile(dbInstance, otherUserId, appId);
                return { id: doc.id, ...data, otherUser: otherUserProfile };
            }));
            conversationsData.sort((a, b) => (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0));
            setConversations(conversationsData);
        });
        return () => unsubscribe();
    }, [dbInstance, appId, user, isAuthReady]);

    // 2. NEW EFFECT: Auto-open chat if initialUserId is provided
    useEffect(() => {
        const openInitialChat = async () => {
            if (initialUserId && user && dbInstance) {
                // Check if we are already in this chat to avoid loop
                if (activeChat?.otherUser?.id === initialUserId) return;

                const chatId = await findOrCreateChat(dbInstance, appId, user.uid, initialUserId);
                const chatDoc = await getDoc(doc(dbInstance, `artifacts/${appId}/public/data/messages`, chatId));
                const otherUser = await getUserProfile(dbInstance, initialUserId, appId);
                
                if (chatDoc.exists()) {
                    const newActiveChat = { id: chatDoc.id, ...chatDoc.data(), otherUser };
                    setActiveChat(newActiveChat);
                    // Mark as read
                    const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, chatId);
                    await updateDoc(chatDocRef, {
                        [`lastRead.${user.uid}`]: serverTimestamp()
                    });
                }
            }
        };
        openInitialChat();
    }, [initialUserId, user, dbInstance, appId]); // Remove activeChat from dependencies to prevent re-runs

    // ... (Keep useEffect for activeChat snapshot) ...
    useEffect(() => {
        if (activeChat?.id) {
            const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, activeChat.id);
            const unsubscribe = onSnapshot(chatDocRef, (doc) => {
                if (doc.exists()) {
                    // Only update messages, keep user profile data
                    setActiveChat(prev => ({ ...prev, ...doc.data() }));
                }
            });
            return () => unsubscribe();
        }
    }, [activeChat?.id, dbInstance, appId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChat?.messages]);

    // ... (Keep handleSendMessage, handleStartNewChat, handleSelectConversation exactly the same) ...
    const handleSendMessage = async () => {
        if (newMessage.trim() === '' || !activeChat) return;
        const messagePayload = {
            senderId: user.uid,
            text: newMessage,
            timestamp: new Date(),
        };
        const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, activeChat.id);
        await updateDoc(chatDocRef, {
            messages: arrayUnion(messagePayload),
            lastUpdated: serverTimestamp()
        });
        setNewMessage('');
    };

    const handleStartNewChat = async (otherUserId) => {
        setIsNewChatModalOpen(false);
        if (!user || !dbInstance) return;
        const chatId = await findOrCreateChat(dbInstance, appId, user.uid, otherUserId);
        const chatDoc = await getDoc(doc(dbInstance, `artifacts/${appId}/public/data/messages`, chatId));
        const otherUser = await getUserProfile(dbInstance, otherUserId, appId);
        if (chatDoc.exists()) {
            const newActiveChat = { id: chatDoc.id, ...chatDoc.data(), otherUser };
            handleSelectConversation(newActiveChat);
        }
    };

    const handleSelectConversation = async (conv) => {
        setActiveChat(conv);
        const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, conv.id);
        await updateDoc(chatDocRef, {
            [`lastRead.${user.uid}`]: serverTimestamp()
        });
    };

    // ... (Return JSX stays exactly the same) ...
    return (
        <div className="flex w-full min-h-[calc(100vh-160px)] p-0">
            {/* ... Keep all your JSX for the conversation list and chat window ... */}
            {/* Copied from previous code to ensure it works, just wrapped in the return */}
             <div className={`w-full md:w-1/3 h-full bg-white dark:bg-gray-800 border-r dark:border-gray-700 md:rounded-l-xl md:shadow-lg flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Conversations</h3>
                    <button onClick={() => setIsNewChatModalOpen(true)} className="p-2 rounded-full text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <PlusCircle size={24} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {conversations.map(conv => {
                        const lastReadTime = conv.lastRead?.[user.uid]?.toMillis();
                        const lastUpdatedTime = conv.lastUpdated?.toMillis();
                        const isUnread = lastUpdatedTime && (!lastReadTime || lastUpdatedTime > lastReadTime);
                        return (
                            <div
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`p-3 flex items-center space-x-3 cursor-pointer transition-colors border-b dark:border-gray-700 ${activeChat?.id === conv.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                        {conv.otherUser?.profilePictureUrl ? (
                                            <img src={conv.otherUser.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={24} className="text-gray-500" />
                                        )}
                                    </div>
                                    {isUnread && (
                                        <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-800" />
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{conv.otherUser?.name || 'Unknown User'}</p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatTimestamp(conv.lastUpdated)}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.messages?.[conv.messages.length - 1]?.text || 'No messages yet'}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={`flex-1 flex flex-col bg-white dark:bg-gray-800 md:rounded-r-xl md:shadow-lg ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                {activeChat ? (
                    <>
                        <div className="flex items-center p-4 border-b dark:border-gray-700">
                            <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full mr-2">
                                <ArrowLeft size={20} />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {activeChat.otherUser?.profilePictureUrl ? (
                                    <img src={activeChat.otherUser.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} className="text-gray-500" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 ml-3">{activeChat.otherUser?.name || 'Chat'}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 p-4">
                            {activeChat.messages?.map((msg, index) => (
                                <div key={index} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.senderId === user.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}>
                                        <p>{msg.text}</p>
                                        <span className="block text-xs text-right opacity-60 mt-1">{formatTimestamp(msg.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-4 border-t dark:border-gray-700">
                            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-full p-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Message..."
                                    className="flex-1 bg-transparent p-2 rounded-full text-gray-900 dark:text-gray-100 focus:outline-none"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                     <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 italic">
                        Select a conversation or start a new one.
                    </div>
                )}
            </div>

            <NewChatModal
                isOpen={isNewChatModalOpen}
                onClose={() => setIsNewChatModalOpen(false)}
                onSelectUser={handleStartNewChat}
            />
        </div>
    );
};

const MessengerSidebar = () => {
    const { dbInstance, appId, user, isAuthReady } = useAppContext();
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (!isAuthReady || !user || !dbInstance) return;
        const q = query(collection(dbInstance, `artifacts/${appId}/public/data/messages`), where('participants', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const conversationsData = await Promise.all(snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const otherUserId = data.participants.find(id => id !== user.uid);
                const otherUserProfile = await getUserProfile(dbInstance, otherUserId, appId);
                return { id: doc.id, ...data, otherUser: otherUserProfile };
            }));
            conversationsData.sort((a, b) => (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0));
            setConversations(conversationsData);
        });
        return () => unsubscribe();
    }, [dbInstance, appId, user, isAuthReady]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChat?.messages]);
    
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const handleSelectConversation = async (conv) => {
        setActiveChat(conv);
        if (isCollapsed) setIsCollapsed(false);
        const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, conv.id);
        await updateDoc(chatDocRef, { [`lastRead.${user.uid}`]: serverTimestamp() });
    };

    const handleSendMessage = async () => {
        if (newMessage.trim() === '' || !activeChat) return;
        const messagePayload = { senderId: user.uid, text: newMessage, timestamp: new Date() };
        const chatDocRef = doc(dbInstance, `artifacts/${appId}/public/data/messages`, activeChat.id);
        await updateDoc(chatDocRef, {
            messages: arrayUnion(messagePayload),
            lastUpdated: serverTimestamp()
        });
        setNewMessage('');
    };

    const handleStartNewChat = async (otherUserId) => {
        setIsNewChatModalOpen(false);
        if (!user || !dbInstance) return;

        const chatId = await findOrCreateChat(dbInstance, appId, user.uid, otherUserId);
        const chatDoc = await getDoc(doc(dbInstance, `artifacts/${appId}/public/data/messages`, chatId));
        const otherUser = await getUserProfile(dbInstance, otherUserId, appId);
        if (chatDoc.exists()) {
            const newActiveChat = { id: chatDoc.id, ...chatDoc.data(), otherUser };
            handleSelectConversation(newActiveChat);
        }
    };
    
    if (!user) return null;

    return (
        <>
            <div className="fixed bottom-0 right-4 z-40 w-80">
                <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-2xl border-l border-r border-t border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out" style={{ height: isCollapsed ? '48px' : '500px' }}>
                    <div onClick={() => setIsCollapsed(!isCollapsed)} className="flex justify-between items-center p-3 cursor-pointer bg-blue-600 text-white rounded-t-xl h-12">
                        <h3 className="font-bold">Messenger</h3>
                        <span className="text-xl transform transition-transform">{isCollapsed ? '↑' : '↓'}</span>
                    </div>
                    
                    {!isCollapsed && (
                        <div className="h-[calc(500px-48px)] flex flex-col bg-white dark:bg-gray-800">
                            {!activeChat ? (
                                <>
                                    <div className="p-2 flex justify-between items-center border-b dark:border-gray-700">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200 ml-2">Conversations</h4>
                                        <button onClick={() => setIsNewChatModalOpen(true)} className="p-2 rounded-full text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700" title="Start a new chat">
                                            <PlusCircle size={20} />
                                        </button>
                                    </div>

                                    <div className="overflow-y-auto flex-1">
                                        {conversations.length === 0 && <p className="text-center text-gray-500 p-4 italic">No conversations yet. Click '+' to start a chat.</p>}
                                        {conversations.map(conv => {
                                            const lastReadTime = conv.lastRead?.[user.uid]?.toMillis();
                                            const lastUpdatedTime = conv.lastUpdated?.toMillis();
                                            const isUnread = lastUpdatedTime && (!lastReadTime || lastUpdatedTime > lastReadTime);
                                            return (
                                                <div key={conv.id} onClick={() => handleSelectConversation(conv)} className="p-2 flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                            {conv.otherUser?.profilePictureUrl ? (<img src={conv.otherUser.profilePictureUrl} alt="p" className="w-full h-full object-cover" />) : (<User size={20} />)}
                                                        </div>
                                                        {isUnread && (<span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />)}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="font-semibold text-sm truncate">{conv.otherUser?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-500 truncate">{conv.messages?.[conv.messages.length - 1]?.text || ''}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col h-full">
                                    <div className="flex items-center p-2 border-b dark:border-gray-700 space-x-2">
                                        <button onClick={() => setActiveChat(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ArrowLeft size={20} /></button>
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                            {activeChat.otherUser?.profilePictureUrl ? (<img src={activeChat.otherUser.profilePictureUrl} alt="p" className="w-full h-full object-cover" />) : (<User size={18} />)}
                                        </div>
                                        <h4 className="font-bold text-sm flex-1 truncate">{activeChat.otherUser?.name || 'Chat'}</h4>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-3">
                                        {activeChat.messages?.map((msg, index) => (
                                            <div key={index} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] p-2 rounded-lg text-sm ${msg.senderId === user.uid ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                                    <p>{msg.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <div className="p-2 border-t dark:border-gray-700 flex items-center space-x-2">
                                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type..." className="flex-1 bg-gray-100 dark:bg-gray-700 p-2 rounded-full focus:outline-none" />
                                        <button onClick={handleSendMessage} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"><Send size={18} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <NewChatModal
                isOpen={isNewChatModalOpen}
                onClose={() => setIsNewChatModalOpen(false)}
                onSelectUser={handleStartNewChat}
            />
        </>
    );
};
// --- REPLACE THE Profile COMPONENT ---

const Profile = ({ onNavigate }) => {
    const { dbInstance, appId, user, isAuthReady } = useAppContext();
    const [profileData, setProfileData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [message, setMessage] = useState('');
    
    // File Upload States
    const [resumeFile, setResumeFile] = useState(null);
    const [isParsingResume, setIsParsingResume] = useState(false);
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImageUrlPreview, setProfileImageUrlPreview] = useState('');

    useEffect(() => {
        if (!dbInstance || !user || !appId || !isAuthReady) return;

        const fetchProfile = async () => {
            const profile = await getUserProfile(dbInstance, user.uid, appId);
            setProfileData(profile);
            setFormData(profile || { 
                name: '', headline: '', skills: [], experience: [], education: [], 
                universityId: '', branch: '', graduationYear: '' 
            });
            if (profile?.profilePictureUrl) {
                setProfileImageUrlPreview(profile.profilePictureUrl);
            }
        };
        fetchProfile();
    }, [dbInstance, user, appId, isAuthReady]);

    // --- Handlers ---

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImageFile(file);
            setProfileImageUrlPreview(URL.createObjectURL(file));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) setResumeFile(file);
    };

    const handleAutofillFromResume = async () => {
        if (!resumeFile) return setMessage('Please select a resume file first.');
        setIsParsingResume(true);
        setMessage('Analyzing resume...');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result.split(',')[1];
            try {
                const parsedData = await extractResumeData(base64Data, resumeFile.type);
                if (parsedData) {
                    setFormData(prev => ({
                        ...prev,
                        name: parsedData.name || prev.name,
                        graduationYear: parsedData.graduationYear || prev.graduationYear,
                        branch: parsedData.branch || prev.branch,
                        skills: parsedData.skills?.length > 0 ? parsedData.skills : prev.skills,
                        experience: parsedData.experience || [],
                        education: parsedData.education || []
                    }));
                    setMessage('Profile details autofilled from resume!');
                } else {
                    setMessage('Could not parse resume automatically.');
                }
            } catch (err) {
                console.error(err);
                setMessage('Error parsing resume.');
            } finally {
                setIsParsingResume(false);
            }
        };
        reader.readAsDataURL(resumeFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Saving profile...');
        let dataToSave = { ...formData };

        try {
            if (profileImageFile) {
                const storageRef = ref(storage, `profilePictures/${user.uid}`);
                const snapshot = await uploadBytes(storageRef, profileImageFile);
                dataToSave.profilePictureUrl = await getDownloadURL(snapshot.ref);
            }

            if (!profileData) {
                await createUserProfile(dbInstance, user.uid, appId, dataToSave);
            } else {
                await updateProfile(dbInstance, user.uid, appId, dataToSave);
            }

            const updatedProfile = await getUserProfile(dbInstance, user.uid, appId);
            setProfileData(updatedProfile);
            setFormData(updatedProfile);
            setIsEditing(false);
            setMessage('Profile saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error saving:", error);
            setMessage('Failed to save profile.');
        }
    };

    // Helper handlers for array fields
    const handleArrayChange = (index, field, value, section) => {
        const newArray = [...(formData[section] || [])];
        newArray[index] = { ...newArray[index], [field]: value };
        setFormData(prev => ({ ...prev, [section]: newArray }));
    };
    
    const addItem = (section, template) => {
        setFormData(prev => ({ ...prev, [section]: [...(prev[section] || []), template] }));
    };

    const removeItem = (index, section) => {
        const newArray = [...formData[section]];
        newArray.splice(index, 1);
        setFormData(prev => ({ ...prev, [section]: newArray }));
    };

    if (!isAuthReady || !user) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    // --- RENDER HELPERS ---

    const TimelineItem = ({ title, subtitle, date, description, icon: Icon }) => (
        <div className="relative pl-8 pb-8 last:pb-0 border-l-2 border-gray-100 dark:border-gray-700">
            <div className="absolute -left-[9px] top-0 bg-white dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h4>
            <div className="text-blue-600 dark:text-blue-400 font-medium text-sm mb-1">{subtitle}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3 flex items-center">
                <Calendar size={12} className="mr-1" /> {date}
            </div>
            {description && <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">{description}</p>}
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto pb-12">
            
            {/* 1. PROFILE HEADER CARD */}
            <div className="relative mb-8 group">
                {/* Banner Gradient */}
                <div className="h-48 md:h-64 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-b-3xl md:rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    {/* Decorative Circles */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                {/* Profile Info Overlay */}
                <div className="px-6 md:px-12 relative -mt-20 flex flex-col md:flex-row items-end md:items-end gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
                            <img 
                                src={isEditing ? (profileImageUrlPreview || 'https://placehold.co/400?text=User') : (profileData?.profilePictureUrl || 'https://placehold.co/400?text=User')} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {isEditing && (
                            <label className="absolute bottom-2 right-2 p-2 bg-gray-900 text-white rounded-full cursor-pointer hover:bg-black shadow-lg transition-transform hover:scale-110">
                                <Camera size={18} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        )}
                    </div>

                    {/* Name & Headline */}
                    <div className="flex-1 pb-2 text-center md:text-left">
                        {isEditing ? (
                            <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                                <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full text-2xl font-bold border-b border-gray-300 dark:border-gray-600 bg-transparent outline-none placeholder-gray-400" placeholder="Your Name" />
                                <input type="text" name="headline" value={formData.headline} onChange={(e) => setFormData({...formData, headline: e.target.value})} className="w-full text-gray-600 dark:text-gray-300 bg-transparent outline-none placeholder-gray-400" placeholder="Headline (e.g. CS Student @ University)" />
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">{profileData?.name || 'New User'}</h1>
                                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">{profileData?.headline || 'No headline added'}</p>
                                <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                    {profileData?.branch && <span className="flex items-center"><Award size={14} className="mr-1" /> {profileData.branch}</span>}
                                    {profileData?.universityId && <span className="flex items-center"><MapPin size={14} className="mr-1" /> ID: {profileData.universityId}</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pb-4 flex gap-3">
                        {isEditing ? (
                            <>
                                <button onClick={() => {setIsEditing(false); setFormData(profileData);}} className="px-6 py-2.5 rounded-full bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancel</button>
                                <button onClick={handleSubmit} className="px-6 py-2.5 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2">
                                    <CheckCircle size={18} /> Save
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2">
                                <Edit size={18} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Message Toast */}
            {message && (
                <div className="max-w-md mx-auto mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-center border border-blue-200 dark:border-blue-800 animate-fade-in-down">
                    {message}
                </div>
            )}

            {/* 2. MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
                
                {/* LEFT COLUMN (Experience & Education) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* EXPERIENCE SECTION */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl"><Briefcase size={24} /></div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Experience</h2>
                        </div>

                        {isEditing ? (
                            <div className="space-y-4">
                                {(formData.experience || []).map((exp, index) => (
                                    <div key={index} className="p-4 border rounded-xl dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 relative group">
                                        <button onClick={() => removeItem(index, 'experience')} className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-50 rounded"><X size={16} /></button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <input type="text" placeholder="Role" value={exp.role} onChange={(e) => handleArrayChange(index, 'role', e.target.value, 'experience')} className="p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 w-full" />
                                            <input type="text" placeholder="Company" value={exp.company} onChange={(e) => handleArrayChange(index, 'company', e.target.value, 'experience')} className="p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 w-full" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <input type="text" placeholder="Start Date" value={exp.startDate} onChange={(e) => handleArrayChange(index, 'startDate', e.target.value, 'experience')} className="p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 w-full" />
                                            <input type="text" placeholder="End Date" value={exp.endDate} onChange={(e) => handleArrayChange(index, 'endDate', e.target.value, 'experience')} className="p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 w-full" />
                                        </div>
                                        <textarea placeholder="Description" value={exp.description} onChange={(e) => handleArrayChange(index, 'description', e.target.value, 'experience')} className="w-full p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 h-20 resize-none" />
                                    </div>
                                ))}
                                <button onClick={() => addItem('experience', { role: '', company: '', startDate: '', endDate: '', description: '' })} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 font-semibold hover:border-blue-500 hover:text-blue-500 transition-colors">
                                    + Add Position
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {profileData?.experience?.length > 0 ? (
                                    profileData.experience.map((exp, i) => (
                                        <TimelineItem 
                                            key={i}
                                            title={exp.role}
                                            subtitle={exp.company}
                                            date={`${exp.startDate || ''} - ${exp.endDate || 'Present'}`}
                                            description={exp.description}
                                        />
                                    ))
                                ) : <p className="text-gray-500 italic">No experience listed yet.</p>}
                            </div>
                        )}
                    </div>

                    {/* EDUCATION SECTION */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl"><GraduationCap size={24} /></div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Education</h2>
                        </div>

                        {isEditing ? (
                            <div className="space-y-4">
                                {(formData.education || []).map((edu, index) => (
                                    <div key={index} className="p-4 border rounded-xl dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 relative">
                                        <button onClick={() => removeItem(index, 'education')} className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-50 rounded"><X size={16} /></button>
                                        <div className="grid grid-cols-1 gap-3">
                                            <input type="text" placeholder="Degree" value={edu.degree} onChange={(e) => handleArrayChange(index, 'degree', e.target.value, 'education')} className="p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 w-full" />
                                            <input type="text" placeholder="Institution" value={edu.institution} onChange={(e) => handleArrayChange(index, 'institution', e.target.value, 'education')} className="p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 w-full" />
                                            <input type="text" placeholder="Year" value={edu.year} onChange={(e) => handleArrayChange(index, 'year', e.target.value, 'education')} className="p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 w-full" />
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => addItem('education', { degree: '', institution: '', year: '' })} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 font-semibold hover:border-green-500 hover:text-green-500 transition-colors">
                                    + Add Education
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {profileData?.education?.length > 0 ? (
                                    profileData.education.map((edu, i) => (
                                        <TimelineItem 
                                            key={i}
                                            title={edu.degree}
                                            subtitle={edu.institution}
                                            date={edu.year}
                                        />
                                    ))
                                ) : <p className="text-gray-500 italic">No education listed yet.</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN (Sidebar) */}
                <div className="space-y-8">
                    
                    {/* Resume Autofill Widget (Edit Mode Only) */}
                    {isEditing && (
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-purple-100 dark:border-gray-700">
                            <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2"><Sparkles size={18} /> AI Resume Parser</h3>
                            <p className="text-sm text-purple-700 dark:text-gray-400 mb-4">Upload your resume to automatically fill in your experience and education.</p>
                            <input type="file" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 mb-3" />
                            <button onClick={handleAutofillFromResume} disabled={!resumeFile || isParsingResume} className="w-full py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2">
                                {isParsingResume ? <Loader2 className="animate-spin" size={18} /> : 'Autofill Profile'}
                            </button>
                        </div>
                    )}

                    {/* SKILLS SECTION */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Skills</h2>
                        {isEditing ? (
                            <div>
                                <textarea 
                                    value={formData.skills?.join(', ')} 
                                    onChange={(e) => setFormData({...formData, skills: e.target.value.split(',').map(s => s.trim())})}
                                    className="w-full h-32 p-3 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 outline-none resize-none"
                                    placeholder="React, Node.js, Python..."
                                />
                                <p className="text-xs text-gray-500 mt-2">Separate skills with commas.</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profileData?.skills?.length > 0 ? (
                                    profileData.skills.map((skill, i) => (
                                        <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                                            {skill}
                                        </span>
                                    ))
                                ) : <p className="text-gray-500 italic">No skills added.</p>}
                            </div>
                        )}
                    </div>

                    {/* DETAILS / INFO SECTION */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Details</h2>
                        <div className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div><label className="text-xs font-bold text-gray-500">University ID</label><input type="text" value={formData.universityId} onChange={(e) => setFormData({...formData, universityId: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                                    <div><label className="text-xs font-bold text-gray-500">Branch</label><input type="text" value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                                    <div><label className="text-xs font-bold text-gray-500">Graduation Year</label><input type="number" value={formData.graduationYear} onChange={(e) => setFormData({...formData, graduationYear: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 dark:text-gray-400">Role</span>
                                        <span className="font-semibold text-gray-900 dark:text-white capitalize">{profileData?.role}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 dark:text-gray-400">Branch</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{profileData?.branch || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400">Graduation</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{profileData?.graduationYear || 'N/A'}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
// const Profile = ({ onNavigate }) => {
//     const { dbInstance, appId, user, isAuthReady } = useAppContext();
//     const [profileData, setProfileData] = useState(null);
//     const [connections, setConnections] = useState([]);
//     const [isEditing, setIsEditing] = useState(false);
//     const [formData, setFormData] = useState({});
//     const [message, setMessage] = useState('');
//     const [resumeFile, setResumeFile] = useState(null);
//     const [isParsingResume, setIsParsingResume] = useState(false);
//     const [profileImageFile, setProfileImageFile] = useState(null);
//     const [profileImageUrlPreview, setProfileImageUrlPreview] = useState('');

//     useEffect(() => {
//         if (!dbInstance || !user || !appId || !isAuthReady) return;

//         const fetchProfile = async () => {
//             const profile = await getUserProfile(dbInstance, user.uid, appId);
//             setProfileData(profile);
//             setFormData(profile || { name: '', headline: '', skills: [], experience: [], education: [] });
//             if (profile?.profilePictureUrl) {
//                 setProfileImageUrlPreview(profile.profilePictureUrl);
//             }
//         };
//         fetchProfile();

//         const connectionsDocRef = doc(dbInstance, `artifacts/${appId}/public/data/connections`, user.uid);
//         const unsubscribeConnections = onSnapshot(connectionsDocRef, (docSnap) => {
//             setConnections(docSnap.exists() ? docSnap.data().connectedTo || [] : []);
//         });
//         return () => unsubscribeConnections();

//     }, [dbInstance, user, appId, isAuthReady]);

//     const handleImageChange = (e) => {
//         const file = e.target.files[0];
//         if (file) {
//             setProfileImageFile(file);
//             setProfileImageUrlPreview(URL.createObjectURL(file));
//         }
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setMessage('Saving...');
//         let dataToSave = { ...formData };

//         try {
//             if (profileImageFile) {
//                 const storageRef = ref(storage, `profilePictures/${user.uid}`);
//                 const snapshot = await uploadBytes(storageRef, profileImageFile);
//                 const downloadURL = await getDownloadURL(snapshot.ref);
//                 dataToSave.profilePictureUrl = downloadURL;
//             }

//             if (!profileData) {
//                 await createUserProfile(dbInstance, user.uid, appId, dataToSave);
//             } else {
//                 await updateProfile(dbInstance, user.uid, appId, dataToSave);
//             }

//             const updatedProfile = await getUserProfile(dbInstance, user.uid, appId);
//             setProfileData(updatedProfile);
//             setFormData(updatedProfile);
//             setProfileImageFile(null);
//             setMessage('Profile updated successfully!');
//             setIsEditing(false);
//         } catch (error) {
//             console.error("Error saving profile:", error);
//             setMessage('Failed to save profile. Please try again.');
//         }
//     };
    
//     const handleFileChange = (e) => {
//         const file = e.target.files[0];
//         if (!file) return;
//         setResumeFile(file);
//         setMessage('');
//     };

//     const handleAutofillFromResume = async () => {
//         if (!resumeFile) {
//             setMessage('Please select a resume file first.');
//             return;
//         }
//         setIsParsingResume(true);
//         setMessage('Parsing resume...');
//         const reader = new FileReader();
//         reader.onload = async (e) => {
//             const base64Data = e.target.result.split(',')[1];
//             try {
//                 const parsedData = await extractResumeData(base64Data, resumeFile.type);
//                 if (parsedData) {
//                     setFormData(prev => ({
//                         ...prev,
//                         name: parsedData.name || prev.name,
//                         graduationYear: parsedData.graduationYear || prev.graduationYear,
//                         branch: parsedData.branch || prev.branch,
//                         skills: parsedData.skills?.length > 0 ? parsedData.skills : prev.skills,
//                     }));
//                     setMessage('Profile details have been autofilled!');
//                 } else {
//                     setMessage('Failed to parse resume. Please fill in details manually.');
//                 }
//             } catch (err) {
//                 setMessage('Error during resume parsing. Please fill in manually.');
//                 console.error('Error parsing resume:', err);
//             } finally {
//                 setIsParsingResume(false);
//             }
//         };
//         reader.readAsDataURL(resumeFile);
//     };

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         const processedValue = name === 'graduationYear' ? parseInt(value, 10) || '' : value;
//         setFormData(prev => ({ ...prev, [name]: processedValue }));
//     };

//     const handleSkillsChange = (e) => {
//         const skills = e.target.value.split(',').map(s => s.trim());
//         setFormData(prev => ({ ...prev, skills }));
//     };

//     const handleExperienceChange = (index, field, value) => {
//         const newExperience = [...(formData.experience || [])];
//         newExperience[index] = { ...newExperience[index], [field]: value };
//         setFormData(prev => ({ ...prev, experience: newExperience }));
//     };

//     const addExperience = () => {
//         setFormData(prev => ({
//             ...prev,
//             experience: [...(prev.experience || []), { role: '', company: '', startDate: '', endDate: '', description: '' }]
//         }));
//     };

//     const removeExperience = (index) => {
//         const newExperience = [...formData.experience];
//         newExperience.splice(index, 1);
//         setFormData(prev => ({ ...prev, experience: newExperience }));
//     };

//     const handleEducationChange = (index, field, value) => {
//         const newEducation = [...(formData.education || [])];
//         newEducation[index] = { ...newEducation[index], [field]: value };
//         setFormData(prev => ({ ...prev, education: newEducation }));
//     };

//     const addEducation = () => {
//         setFormData(prev => ({
//             ...prev,
//             education: [...(prev.education || []), { degree: '', institution: '', year: '' }]
//         }));
//     };

//     const removeEducation = (index) => {
//         const newEducation = [...formData.education];
//         newEducation.splice(index, 1);
//         setFormData(prev => ({ ...prev, education: newEducation }));
//     };

//     if (!isAuthReady || !user) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
//     if (!profileData && !isEditing) return <div className="text-center p-8"><button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-blue-600 text-white rounded-full">Create Profile</button></div>;

//     return (
//         <div className="p-4 space-y-8">
//             {message && <div className="p-4 rounded-xl bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200">{message}</div>}
            
//             <div className="flex justify-between items-center">
//                 <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Profile</h2>
//                 {!isEditing && profileData && (
//                     <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
//                         <Edit size={18} />
//                         <span>Edit Profile</span>
//                     </button>
//                 )}
//             </div>

//             {isEditing ? (
//                 <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
//                     <div className="flex flex-col items-center space-y-4">
//                         <img
//                             src={profileImageUrlPreview || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=Pic'}
//                             alt="Profile Preview"
//                             className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
//                         />
//                         <label htmlFor="profile-picture-upload" className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-800 text-sm font-semibold rounded-full hover:bg-gray-300">
//                             Change Picture
//                         </label>
//                         <input id="profile-picture-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
//                     </div>
                    
//                     <div className="p-4 border border-dashed dark:border-gray-600 rounded-lg space-y-3">
//                          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Update with Resume</h4>
//                          <p className="text-sm text-gray-600 dark:text-gray-400">Upload a new resume to automatically fill in your details below.</p>
//                          <div>
//                             <label className="block text-gray-700 dark:text-gray-300 mb-1">Resume File</label>
//                             <input type="file" onChange={handleFileChange} className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
//                          </div>
//                          <button type="button" onClick={handleAutofillFromResume} className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-full hover:bg-gray-300 transition-colors flex items-center justify-center disabled:opacity-50" disabled={!resumeFile || isParsingResume}>
//                              {isParsingResume ? ( <><Loader2 className="animate-spin mr-2" size={20} /> Parsing...</> ) : 'Autofill from Resume'}
//                          </button>
//                     </div>
                    
//                     <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 pt-4">Basic Info</h3>
//                     <div><label>Name</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full p-3 rounded-lg border dark:bg-gray-700" required /></div>
//                     <div><label>University ID</label><input type="text" name="universityId" value={formData.universityId || ''} onChange={handleChange} className="w-full p-3 rounded-lg border dark:bg-gray-700" /></div>
                    
//                     <div>
//                         <label className="block text-gray-700 dark:text-gray-300 mb-1">Graduation Year</label>
//                         <input type="number" name="graduationYear" value={formData.graduationYear || ''} onChange={handleChange} className="w-full p-3 rounded-lg border dark:bg-gray-700" />
//                     </div>

//                     <div>
//                         <label className="block text-gray-700 dark:text-gray-300 mb-1">Branch</label>
//                         <input
//                             type="text"
//                             name="branch"
//                             value={formData.branch || ''}
//                             onChange={handleChange}
//                             placeholder="e.g., Computer Science, Mechanical Engineering"
//                             className="w-full p-3 rounded-lg border dark:bg-gray-700"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-gray-700 dark:text-gray-300 mb-1">Headline</label>
//                         <input type="text" name="headline" value={formData.headline || ''} onChange={handleChange} className="w-full p-3 rounded-lg border dark:bg-gray-700" />
//                     </div>
                    
//                     <hr className="border-gray-200 dark:border-gray-700" />
//                     <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Experience</h3>
//                     {formData.experience?.map((exp, index) => (
//                         <div key={index} className="space-y-2 border p-4 rounded-lg dark:border-gray-700 relative">
//                             <button type="button" onClick={() => removeExperience(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X size={16} /></button>
//                             <input type="text" value={exp.role} onChange={(e) => handleExperienceChange(index, 'role', e.target.value)} placeholder="Role (e.g., Software Engineer, Marketing Intern)" className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
//                             <input type="text" value={exp.company} onChange={(e) => handleExperienceChange(index, 'company', e.target.value)} placeholder="Company (e.g., Google, University Dept.)" className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
//                         </div>
//                     ))}
//                     <button type="button" onClick={addExperience} className="w-full text-blue-500 font-semibold border-2 border-dashed border-blue-300 rounded-lg p-3 hover:bg-blue-50 transition-colors">Add Experience / Internship</button>

//                      <hr className="border-gray-200 dark:border-gray-700" />
//                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Education</h3>
//                      {formData.education?.map((edu, index) => (
//                          <div key={index} className="space-y-2 border p-4 rounded-lg dark:border-gray-700 relative">
//                              <button type="button" onClick={() => removeEducation(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X size={16} /></button>
//                              <input type="text" value={edu.degree} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} placeholder="Degree" className="w-full p-2 rounded-lg border dark:bg-gray-700" />
//                              <input type="text" value={edu.institution} onChange={(e) => handleEducationChange(index, 'institution', e.target.value)} placeholder="Institution" className="w-full p-2 rounded-lg border dark:bg-gray-700" />
//                              <input type="text" value={edu.year} onChange={(e) => handleEducationChange(index, 'year', e.target.value)} placeholder="Year of Graduation" className="w-full p-2 rounded-lg border dark:bg-gray-700" />
//                          </div>
//                      ))}
//                      <button type="button" onClick={addEducation} className="w-full text-blue-500 font-semibold border-2 border-dashed border-blue-300 rounded-lg p-3 hover:bg-blue-50 transition-colors">Add Education</button>

//                     <hr className="border-gray-200 dark:border-gray-700" />
//                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Skills</h3>
//                      <div>
//                          <label className="block text-gray-700 dark:text-gray-300 mb-1">Skills (comma-separated)</label>
//                          <input type="text" name="skills" value={formData.skills?.join(', ')} onChange={handleSkillsChange} className="w-full p-3 rounded-lg border dark:bg-gray-700" />
//                      </div>

//                     <div className="flex space-x-4 pt-4">
//                         <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700">Save Profile</button>
//                         <button type="button" onClick={() => { setIsEditing(false); setMessage(''); }} className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 font-semibold rounded-full hover:bg-gray-400">Cancel</button>
//                     </div>
//                 </form>
//             ) : (
//                 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
//                     <ProfileHeadline {...profileData} profilePictureUrl={profileData?.profilePictureUrl} />
//                     <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
//                         <GraduationCap size={20} className="text-gray-500" />
//                         <span className="font-semibold">University ID:</span>
//                         <span className="font-mono">{profileData?.universityId || 'Not Provided'}</span>
//                     </div>
//                     <hr className="dark:border-gray-700" />
//                     <ExperienceSection experience={profileData?.experience || []} />
//                     <hr className="dark:border-gray-700" />
//                     <EducationSection education={profileData?.education || []} />
//                     <hr className="dark:border-gray-700" />
//                     <SkillsSection skills={profileData?.skills} />
//                     <hr className="dark:border-gray-700" />
//                     <ConnectionsSection connections={connections} />
//                 </div>
//             )}
//         </div>
//     );
// };
const MainContent = () => {
    const [currentPage, setCurrentPage] = useState('home');
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageContext, setPageContext] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const { user, dbInstance, isAuthReady, appId } = useAppContext();

    useEffect(() => {
        if (user && dbInstance && isAuthReady) {
            getUserProfile(dbInstance, user.uid, appId).then(profile => {
                setUserRole(profile?.role);
            });
        } else {
            setUserRole(null);
        }
    }, [user, dbInstance, isAuthReady, appId]);
    const handleNavigate = (page, context = null) => {
    setCurrentPage(page);
    setPageContext(context);
};
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setCurrentPage('home');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const handleSignIn = async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const handleSignUp = async (email, password, role, formData) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        if (newUser) {
            const profileData = role === 'student' ? {
                name: formData.name, email: newUser.email, role: role, headline: '', currentJob: '',
                company: '', graduationYear: parseInt(formData.graduationYear, 10) || null, skills: formData.skills,
                branch: formData.branch, 
                universityId: formData.universityId,
                isVerified: false, resumeUrl: '', experience: [], education: []
            } : {
                name: '', email: newUser.email, role: role, headline: '', currentJob: '', company: '',
                graduationYear: '', skills: [], branch: '', 
                universityId: '',
                isVerified: false, resumeUrl: '',
                experience: [], education: []
            };
            await createUserProfile(db, newUser.uid, appId, profileData);
        }
    };
    
    const renderPage = () => {
        if (!isAuthReady) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4 text-center">
                    <Loader2 className="animate-spin mr-2" size={32} />
                    <span className="text-xl text-gray-600 dark:text-gray-400">Connecting to services...</span>
                </div>
            );
        }
        if (!user && !['home'].includes(currentPage)) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Please Log In</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">You need to be authenticated to access this page.</p>
                </div>
            );
        }

        switch (currentPage) {
            case 'home':
                return <HomePage onNavigate={handleNavigate} />;
            case 'alumni':
                return <AlumniDirectory searchTerm={searchTerm} />;
            case 'dashboard':
                return <Dashboard onNavigate={handleNavigate} searchTerm={searchTerm} />;
            case 'profile':
                return <Profile onNavigate={handleNavigate} />;
            case 'messenger':
                return <Messenger initialUserId={pageContext} />;
            case 'connections':
                return <ConnectionsPage onViewProfile={(id) => handleNavigate('viewProfile', id)} onMessage={(id) => handleNavigate('messenger', id)} />;
            case 'viewProfile':
                return <ViewProfilePage profileId={pageContext} onNavigate={handleNavigate} />;
            default:
                return <HomePage onNavigate={handleNavigate} />;
        }
    };

    return (
        <div className="font-sans bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300">
            <Header
                onNavigate={handleNavigate}
                onSignOut={handleSignOut}
                onSignIn={handleSignIn}
                onSignUp={handleSignUp}
                currentPage={currentPage}
                onContributionClick={() => setIsContributionModalOpen(true)}
                onSearch={setSearchTerm}
                userRole={userRole}
            />
            <main className="container mx-auto p-4 flex-1">
                {renderPage()}
            </main>
            
            <MessengerSidebar />

            <button
                onClick={() => setIsChatbotOpen(!isChatbotOpen)}
                className="fixed bottom-4 left-4 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
                aria-label="Open Chatbot"
            >
                {isChatbotOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>
            <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
            <ContributionModal isOpen={isContributionModalOpen} onClose={() => setIsContributionModalOpen(false)} />
            <footer className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-8 mt-12">
                <div className="container mx-auto text-center space-y-4">
                    <p className="font-semibold text-lg">Contact Admin</p>
                    <div className="flex justify-center space-x-4">
                        <a href="mailto:admin@alumniconnect.com" className="hover:text-blue-500 transition-colors flex items-center">
                            <Mail size={20} className="mr-1" /> admin@alumniconnect.com
                        </a>
                        <a href="tel:+1234567890" className="hover:text-blue-500 transition-colors flex items-center">
                            <Phone size={20} className="mr-1" /> +1 (234) 567-890
                        </a>
                    </div>
                </div>
            </footer>
 
        </div>
    );
}; 

export default function App() 
{
    return (
        <AppProvider>
            <MainContent />
        </AppProvider>
    );
}
