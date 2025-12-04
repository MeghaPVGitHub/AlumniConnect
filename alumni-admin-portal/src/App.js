/* global __firebase_config, __app_id, __initial_auth_token */
import React, { useState, useEffect, createContext, useContext, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import {
    getFirestore, doc, getDoc, collection, query, onSnapshot,
    updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch, where, getDocs, setDoc
} from 'firebase/firestore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
    LayoutDashboard, Users, Briefcase, Calendar, CheckCircle, Trash2, LogOut,
    PlusCircle, Edit, Search, ChevronLeft, ChevronRight, X, User, ArrowUpCircle,
    Upload, FileText, Download, Shield, Menu
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyBssAz87jCPmDNMZ5b_VVgzr0pQctvINZA",
        authDomain: "alumni-connect-system.firebaseapp.com",
        projectId: "alumni-connect-system",
        storageBucket: "alumni-connect-system.firebasestorage.app",
        messagingSenderId: "707277154710",
        appId: "1:707277154710:web:37af2bd2e1c1c94804d5b7"
      };
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Admin App Context ---
const AdminAppContext = createContext(null);

const AdminAppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && auth.currentUser === null) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                }
            } catch (error) {
                console.error("Custom token sign-in failed:", error);
                toast.error("Could not initialize user session.");
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setIsAdmin(true);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setIsAuthReady(true);
        });

        initializeAuth();
        return () => unsubscribe();
    }, []);

    const value = { user, isAdmin, isAuthReady };
    return <AdminAppContext.Provider value={value}>{children}</AdminAppContext.Provider>;
};

const useAdminAuth = () => useContext(AdminAppContext);

// --- Utilities ---
const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return []; // Header + 1 row minimum
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const entry = {};
        headers.forEach((header, index) => {
            let val = values[index]?.trim();
            // Basic cleaning
            if (val) val = val.replace(/^"|"$/g, '');
            entry[header] = val;
        });
        return entry;
    });
};

// --- Admin API Functions ---
const verifyAlumniProfile = async (userId) => {
    try {
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
        await updateDoc(userDocRef, { isVerified: true });
        toast.success("Alumni verified successfully.");
    } catch (error) {
        toast.error("Failed to verify alumni.");
    }
};

const approveJobPosting = async (jobId) => {
    try {
        const jobDocRef = doc(db, `artifacts/${appId}/public/data/jobs`, jobId);
        await updateDoc(jobDocRef, { isApproved: true });
        toast.success("Job posting approved.");
    } catch (error) {
        toast.error("Failed to approve job.");
    }
};

const deleteContent = async (collectionName, docId) => {
    try {
        const docRef = doc(db, `artifacts/${appId}/public/data/${collectionName}`, docId);
        await deleteDoc(docRef);
        toast.success(`${collectionName.slice(0, -1)} deleted.`);
    } catch (error) {
        toast.error(`Failed to delete content.`);
    }
};

const upgradeBatchToAlumni = async (graduationYear) => {
    if (!graduationYear || isNaN(parseInt(graduationYear, 10))) {
        toast.error("Please enter a valid graduation year.");
        return { success: false };
    }
    const batch = writeBatch(db);
    const studentsQuery = query(
        collection(db, `artifacts/${appId}/public/data/users`),
        where("role", "==", "student"),
        where("graduationYear", "==", parseInt(graduationYear, 10))
    );
    try {
        const querySnapshot = await getDocs(studentsQuery);
        if (querySnapshot.empty) {
            toast.error(`No students found for class of ${graduationYear}.`);
            return { success: false };
        }
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { role: "alumni", isVerified: false });
        });
        await batch.commit();
        toast.success(`Upgraded ${querySnapshot.size} students to Alumni status.`);
        return { success: true };
    } catch (error) {
        toast.error("Batch upgrade failed.");
        return { success: false };
    }
};

// --- UI Components ---

const StatCard = ({ title, value, icon, color = "blue" }) => {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-emerald-50 text-emerald-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-orange-50 text-orange-600"
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center">
            <div className={`p-4 rounded-xl mr-5 ${colorClasses[color] || colorClasses.blue}`}>
                {icon}
            </div>
            <div>
                <p className="text-slate-500 text-sm font-medium tracking-wide uppercase">{title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
            </div>
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} transform transition-all scale-100 overflow-hidden flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const EventRegistrantsModal = ({ isOpen, onClose, eventId }) => {
    const [registrants, setRegistrants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !eventId) return;

        setLoading(true);
        const registrantsRef = collection(db, `artifacts/${appId}/public/data/events/${eventId}/registrations`);
        const unsubscribe = onSnapshot(registrantsRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRegistrants(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching registrants:", error);
            toast.error("Could not fetch registrants.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, eventId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Event Registrants" maxWidth="max-w-2xl">
            {loading ? (
                 <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : registrants.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No registrants yet.</p>
            ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 font-semibold text-slate-600">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Registered At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {registrants.map((reg) => (
                                <tr key={reg.id}>
                                    <td className="px-4 py-3 font-medium text-slate-800">{reg.applicantName || reg.name || 'N/A'}</td>
                                    <td className="px-4 py-3 text-slate-600">{reg.applicantEmail || reg.email || 'N/A'}</td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {reg.registeredAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="mt-4 flex justify-end">
                 <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Close</button>
            </div>
        </Modal>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmColor = 'bg-red-600', confirmText = "Confirm" }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <p className="text-slate-600 mb-8 leading-relaxed">{message}</p>
        <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={onConfirm} className={`px-5 py-2.5 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all ${confirmColor}`}>{confirmText}</button>
        </div>
    </Modal>
);

const CSVImportModal = ({ isOpen, onClose }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const parsed = parseCSV(text);
                setPreview(parsed.slice(0, 5)); // Preview first 5
            };
            reader.readAsText(selectedFile);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const users = parseCSV(text);
            const batch = writeBatch(db);
            let operationCount = 0;
            
            users.forEach((userData) => {
                if (userData.email && userData.name) {
                    const newId = userData.email.replace(/[^a-zA-Z0-9]/g, '_');
                    const docRef = doc(db, `artifacts/${appId}/public/data/users`, newId);
                    
                    batch.set(docRef, {
                        name: userData.name,
                        email: userData.email,
                        role: userData.role?.toLowerCase() || 'student',
                        universityId: userData.universityid || userData.universityId || '',
                        graduationYear: parseInt(userData.graduationyear || userData.graduationYear) || null,
                        isVerified: userData.role?.toLowerCase() === 'alumni' ? false : true,
                        createdAt: serverTimestamp()
                    });
                    operationCount++;
                }
            });

            if (operationCount > 0) {
                try {
                    await batch.commit();
                    toast.success(`Successfully imported ${operationCount} users.`);
                    onClose();
                    setFile(null);
                    setPreview([]);
                } catch (err) {
                    console.error(err);
                    toast.error("Error importing users. Check console.");
                }
            } else {
                toast.error("No valid data found in CSV.");
            }
            setLoading(false);
        };
        reader.readAsText(file);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Users via CSV" maxWidth="max-w-2xl">
            <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                    <p className="font-semibold mb-2">Instructions:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Upload a <strong>.csv</strong> file.</li>
                        <li>Required headers: <code className="bg-slate-200 px-1 rounded">email</code>, <code className="bg-slate-200 px-1 rounded">name</code>, <code className="bg-slate-200 px-1 rounded">role</code></li>
                        <li>Optional: <code className="bg-slate-200 px-1 rounded">universityId</code>, <code className="bg-slate-200 px-1 rounded">graduationYear</code></li>
                    </ul>
                    <div className="mt-3 text-xs text-slate-400">Example: john@doe.com, John Doe, student, 123456, 2024</div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                    <Upload className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                    <p className="text-slate-600 font-medium">{file ? file.name : "Click to upload CSV"}</p>
                </div>

                {preview.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Preview (First 5 rows):</h4>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="min-w-full text-xs text-left">
                                <thead className="bg-slate-100 font-semibold text-slate-600">
                                    <tr>
                                        {Object.keys(preview[0]).map(k => <th key={k} className="px-2 py-1">{k}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, i) => (
                                        <tr key={i} className="border-t border-slate-100">
                                            {Object.values(row).map((v, j) => <td key={j} className="px-2 py-1 truncate max-w-[150px]">{v}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button onClick={handleImport} disabled={!file || loading} className="flex items-center bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all">
                        {loading ? "Importing..." : "Run Import"}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- Page Components ---

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.code === 'auth/invalid-credential' ? 'Invalid credentials.' : 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
                <div className="text-center mb-8">
                    <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <Shield size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Admin Portal</h1>
                    <p className="text-slate-500 text-sm mt-2">Sign in to manage the alumni network</p>
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center"><X size={16} className="mr-2"/>{error}</div>}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" required />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" required />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-200 transition-all disabled:opacity-70">
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const DashboardPage = () => {
    const [stats, setStats] = useState({ users: 0, alumni: 0, students: 0, jobs: 0, events: 0 });
    const [roleDistribution, setRoleDistribution] = useState([]);
    
    // Modern Palette
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

    useEffect(() => {
        const usersQuery = query(collection(db, `artifacts/${appId}/public/data/users`));
        const jobsQuery = query(collection(db, `artifacts/${appId}/public/data/jobs`), where("isApproved", "==", true));
        const eventsQuery = query(collection(db, `artifacts/${appId}/public/data/events`));

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => doc.data());
            const alumniCount = usersData.filter(u => u.role === 'alumni' && u.isVerified).length;
            const studentCount = usersData.filter(u => u.role === 'student').length;
            const pendingCount = usersData.filter(u => u.role === 'alumni' && !u.isVerified).length;
            
            setStats(prev => ({ ...prev, users: usersData.length, alumni: alumniCount, students: studentCount }));
            setRoleDistribution([
                { name: 'Verified Alumni', value: alumniCount },
                { name: 'Students', value: studentCount },
                { name: 'Pending', value: pendingCount }
            ]);
        });

        const unsubJobs = onSnapshot(jobsQuery, (snapshot) => setStats(prev => ({ ...prev, jobs: snapshot.size })));
        const unsubEvents = onSnapshot(eventsQuery, (snapshot) => setStats(prev => ({ ...prev, events: snapshot.size })));

        return () => { unsubUsers(); unsubJobs(); unsubEvents(); };
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
                <p className="text-slate-500 mt-1">Real-time insights into platform activity</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={stats.users} icon={<Users size={24} />} color="blue" />
                <StatCard title="Verified Alumni" value={stats.alumni} icon={<CheckCircle size={24} />} color="green" />
                <StatCard title="Active Jobs" value={stats.jobs} icon={<Briefcase size={24} />} color="purple" />
                <StatCard title="Upcoming Events" value={stats.events} icon={<Calendar size={24} />} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">User Distribution</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={5}>
                                    {roleDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-xl shadow-lg text-white flex flex-col justify-center items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <Users size={200} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 relative z-10">Administrative Actions</h3>
                    <p className="text-indigo-100 mb-8 max-w-md relative z-10">Manage the community effectively. Use the sidebar to access verification queues, content moderation, and user databases.</p>
                    <button className="bg-white text-indigo-700 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow-lg relative z-10">
                        View Action Items
                    </button>
                </div>
            </div>
        </div>
    );
};

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [gradYearFilter, setGradYearFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Modals
    const [viewUser, setViewUser] = useState(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, year: '' });
    
    const ITEMS_PER_PAGE = 8;

    useEffect(() => {
        const usersQuery = query(collection(db, `artifacts/${appId}/public/data/users`));
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const filteredUsers = useMemo(() => {
        let res = users.filter(user => user.role !== 'admin');
        if (filter === 'pending') res = res.filter(u => u.role === 'alumni' && !u.isVerified);
        else if (filter !== 'all') res = res.filter(u => u.role === filter);
        if (searchTerm) res = res.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        if (gradYearFilter) res = res.filter(u => u.graduationYear?.toString() === gradYearFilter);
        return res;
    }, [users, filter, searchTerm, gradYearFilter]);

    const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    const handleExport = () => {
        const dataToExport = filteredUsers;
        if (dataToExport.length === 0) {
            toast.error("No users to export.");
            return;
        }

        const headers = ["Name", "Email", "Role", "University ID", "Graduation Year", "Status"];
        const csvRows = [headers.join(",")];

        dataToExport.forEach(user => {
            const row = [
                `"${(user.name || '').replace(/"/g, '""')}"`,
                `"${(user.email || '').replace(/"/g, '""')}"`,
                user.role || '',
                `"${(user.universityId || '').replace(/"/g, '""')}"`,
                user.graduationYear || '',
                user.isVerified ? 'Verified' : 'Pending'
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported ${dataToExport.length} users.`);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <Modal isOpen={!!viewUser} onClose={() => setViewUser(null)} title="User Profile">
                {viewUser && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                                <User size={32} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-800">{viewUser.name}</h4>
                                <p className="text-slate-500">{viewUser.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-slate-500 text-xs uppercase font-semibold">Role</p>
                                <p className="font-medium capitalize text-slate-800">{viewUser.role}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-slate-500 text-xs uppercase font-semibold">Status</p>
                                <p className={`font-medium ${viewUser.isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {viewUser.isVerified ? 'Verified' : 'Pending'}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-slate-500 text-xs uppercase font-semibold">Grad Year</p>
                                <p className="font-medium text-slate-800">{viewUser.graduationYear || '-'}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-slate-500 text-xs uppercase font-semibold">Uni ID</p>
                                <p className="font-medium text-slate-800">{viewUser.universityId || '-'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <CSVImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />

            {/* Replaced generic confirmation modal with specific modal containing input */}
            <Modal isOpen={upgradeModal.isOpen} onClose={() => setUpgradeModal({ isOpen: false, year: '' })} title="Batch Upgrade Students">
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Enter the graduation year to upgrade all matching <strong>Students</strong> to <strong>Alumni</strong> (Pending Verification).
                    </p>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Graduation Year</label>
                        <input 
                            type="number" 
                            placeholder="e.g. 2024"
                            value={upgradeModal.year} 
                            onChange={(e) => setUpgradeModal(prev => ({ ...prev, year: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    
                    <div className="flex justify-end pt-4 gap-2">
                        <button onClick={() => setUpgradeModal({ isOpen: false, year: '' })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button 
                            onClick={async () => {
                                await upgradeBatchToAlumni(upgradeModal.year);
                                setUpgradeModal({ isOpen: false, year: '' });
                            }}
                            disabled={!upgradeModal.year}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            Upgrade Batch
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-slate-800">User Management</h2>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-all">
                        <Download size={18} className="mr-2" /> Export CSV
                    </button>
                    <button onClick={() => setImportModalOpen(true)} className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-all">
                        <Upload size={18} className="mr-2" /> Import CSV
                    </button>
                    <button onClick={() => setUpgradeModal({ isOpen: true, year: '' })} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-all">
                        <ArrowUpCircle size={18} className="mr-2" /> Batch Graduate
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    {['all', 'student', 'alumni', 'pending'].map(tab => (
                        <button key={tab} onClick={() => setFilter(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {tab === 'pending' ? 'Pending' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                            <th className="p-4">User</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Grad Year</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center cursor-pointer" onClick={() => setViewUser(user)}>
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 text-sm">
                                            {user.name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800">{user.name}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4"><span className="capitalize text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{user.role}</span></td>
                                <td className="p-4 text-slate-600 text-sm">{user.graduationYear || '-'}</td>
                                <td className="p-4">
                                    {user.role === 'alumni' && (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {user.isVerified ? 'Verified' : 'Pending'}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {user.role === 'alumni' && !user.isVerified && (
                                            <button onClick={() => verifyAlumniProfile(user.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Verify">
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => deleteContent('users', user.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedUsers.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-400">No users found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center space-x-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50"><ChevronLeft size={20} /></button>
                    <span className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50"><ChevronRight size={20} /></button>
                </div>
            )}
        </div>
    );
};

const ContentManagementPage = () => {
    const [activeTab, setActiveTab] = useState('jobs');
    const [jobs, setJobs] = useState([]);
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isRegistrantsModalOpen, setIsRegistrantsModalOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);

    useEffect(() => {
        const jobsQuery = query(collection(db, `artifacts/${appId}/public/data/jobs`));
        const eventsQuery = query(collection(db, `artifacts/${appId}/public/data/events`));
        const unsubJobs = onSnapshot(jobsQuery, (snapshot) => setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubEvents = onSnapshot(eventsQuery, (snapshot) => setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        return () => { unsubJobs(); unsubEvents(); };
    }, []);

    const openModal = (item = null) => { setEditingItem(item); setIsModalOpen(true); };
    
    const handleViewRegistrants = (eventId) => {
        setSelectedEventId(eventId);
        setIsRegistrantsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const collectionName = activeTab === 'jobs' ? 'jobs' : 'events';
        try {
            if (editingItem) {
                await updateDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, editingItem.id), data);
                toast.success("Updated successfully.");
            } else {
                await addDoc(collection(db, `artifacts/${appId}/public/data/${collectionName}`), {
                    ...data, postedBy: 'Admin', postedAt: serverTimestamp(), isApproved: true
                });
                toast.success("Created successfully.");
            }
            setIsModalOpen(false);
        } catch (error) { toast.error("Operation failed."); }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <EventRegistrantsModal isOpen={isRegistrantsModalOpen} onClose={() => setIsRegistrantsModalOpen(false)} eventId={selectedEventId} />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'New'} ${activeTab === 'jobs' ? 'Job' : 'Event'}`}>
                <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
                    {activeTab === 'jobs' ? (
                        <>
                            <input name="title" placeholder="Job Title" defaultValue={editingItem?.title} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            <input name="company" placeholder="Company Name" defaultValue={editingItem?.company} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            <input name="applicationUrl" placeholder="Application URL" defaultValue={editingItem?.applicationUrl} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            <textarea name="description" placeholder="Description" rows="4" defaultValue={editingItem?.description} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </>
                    ) : (
                        <>
                            <input name="title" placeholder="Event Title" defaultValue={editingItem?.title} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            <input name="date" type="date" defaultValue={editingItem?.date} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            <input name="location" placeholder="Location" defaultValue={editingItem?.location} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            <textarea name="description" placeholder="Description" rows="4" defaultValue={editingItem?.description} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </>
                    )}
                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-md transition-all">Save Content</button>
                </form>
            </Modal>

            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Content</h2>
                <button onClick={() => openModal()} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all font-medium">
                    <PlusCircle size={18} className="mr-2" /> Create {activeTab === 'jobs' ? 'Job' : 'Event'}
                </button>
            </div>

            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveTab('jobs')} className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'jobs' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Jobs</button>
                <button onClick={() => setActiveTab('events')} className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'events' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Events</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeTab === 'jobs' ? jobs : events).map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative">
                        <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(item)} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600"><Edit size={16} /></button>
                            <button onClick={() => deleteContent(activeTab === 'jobs' ? 'jobs' : 'events', item.id)} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${activeTab === 'jobs' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                            {activeTab === 'jobs' ? <Briefcase size={24} /> : <Calendar size={24} />}
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{item.title}</h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-1">{activeTab === 'jobs' ? item.company : item.date}</p>
                        
                        {activeTab === 'jobs' && !item.isApproved && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg flex items-center justify-between mt-4">
                                <span>Pending Approval</span>
                                <button onClick={() => approveJobPosting(item.id)} className="text-emerald-600 font-bold hover:underline">Approve</button>
                            </div>
                        )}
                        {activeTab === 'events' && (
                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm text-slate-500">
                                <div className="flex items-center space-x-4">
                                    <span>{item.location || 'Online'}</span>
                                    <span className="flex items-center text-slate-400" title="Registrants">
                                        <Users size={14} className="mr-1" /> {item.registrationCount || 0}
                                    </span>
                                </div>
                                <button onClick={() => handleViewRegistrants(item.id)} className="text-indigo-600 font-medium cursor-pointer hover:underline hover:text-indigo-700 transition-colors">
                                    View Attendees
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Layout ---

const AdminPanelLayout = () => {
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 sticky top-0 h-screen">
                <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
                    <div className="bg-indigo-600 p-2 rounded-lg"><Shield className="text-white" size={24}/></div>
                    <span className="text-xl font-bold text-white tracking-wide">Alumni Admin</span>
                </div>
                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <NavLink to="/dashboard" className={({ isActive }) => `flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
                        <LayoutDashboard className="mr-3" size={20} /> Dashboard
                    </NavLink>
                    <NavLink to="/users" className={({ isActive }) => `flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
                        <Users className="mr-3" size={20} /> User Management
                    </NavLink>
                    <NavLink to="/content" className={({ isActive }) => `flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
                        <FileText className="mr-3" size={20} /> Content & Events
                    </NavLink>
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => signOut(auth)} className="flex items-center w-full px-4 py-3 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all">
                        <LogOut className="mr-3" size={20} /> Sign Out
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto h-screen scroll-smooth">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

const ProtectedRoute = ({ isAdmin }) => {
    if (!isAdmin) return <Navigate to="/login" replace />;
    return <AdminPanelLayout />;
};

const AppRoutes = () => {
    const { isAdmin, isAuthReady } = useAdminAuth();
    if (!isAuthReady) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    return (
        <Routes>
            <Route path="/login" element={isAdmin ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/" element={<ProtectedRoute isAdmin={isAdmin} />}>
                <Route index element={<Navigate to="/dashboard" />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="content" element={<ContentManagementPage />} />
            </Route>
            <Route path="*" element={<Navigate to={isAdmin ? "/dashboard" : "/login"} />} />
        </Routes>
    );
};

export default function App() {
    return (
        <AdminAppProvider>
            <Toaster position="top-center" toastOptions={{ className: 'font-medium text-sm', duration: 4000 }} />
            <HashRouter>
                <AppRoutes />
            </HashRouter>
        </AdminAppProvider>
    );
}
