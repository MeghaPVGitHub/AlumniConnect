import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
    getFirestore, doc, getDoc, collection, query, onSnapshot,
    updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch, where
} from 'firebase/firestore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import {
    LayoutDashboard, Users, Briefcase, Calendar, CheckCircle, Trash2, LogOut,
    PlusCircle, Edit, Search, ChevronLeft, ChevronRight, X, User
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// --- Firebase Configuration ---
// IMPORTANT: For security, these values should be in a .env.local file in your project's root.
const firebaseConfig = {
    apiKey: "AIzaSyBssAz87jCPmDNMZ5b_VVgzr0pQctvINZA",
    authDomain: "alumni-connect-system.firebaseapp.com",
    projectId: "alumni-connect-system",
    storageBucket: "alumni-connect-system.firebasestorage.app",
    messagingSenderId: "707277154710",
    appId: "1:707277154710:web:37af2bd2e1c1c94804d5b7"
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = "default-app-id"; // This should match your main app's appId if used in paths

// --- Admin App Context ---
const AdminAppContext = createContext(null);

const AdminAppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUser.uid);
                try {
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                        setUser(currentUser);
                        setIsAdmin(true);
                    } else {
                        toast.error("Access denied. You are not an administrator.");
                        await signOut(auth);
                        setUser(null);
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Error checking admin status:", error);
                    toast.error("Failed to verify admin status.");
                    await signOut(auth);
                    setUser(null);
                    setIsAdmin(false);
                }
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const value = { user, isAdmin, isAuthReady };

    return (
        <AdminAppContext.Provider value={value}>
            {children}
        </AdminAppContext.Provider>
    );
};

const useAdminAuth = () => useContext(AdminAppContext);

// --- Admin API Functions ---
const verifyAlumniProfile = async (userId) => {
    try {
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
        await updateDoc(userDocRef, { isVerified: true });
        toast.success("Alumni verified successfully.");
    } catch (error) {
        console.error("Error verifying alumni:", error);
        toast.error("Failed to verify alumni.");
    }
};

const approveJobPosting = async (jobId) => {
    try {
        const jobDocRef = doc(db, `artifacts/${appId}/public/data/jobs`, jobId);
        await updateDoc(jobDocRef, { isApproved: true });
        toast.success("Job posting approved.");
    } catch (error) {
        console.error("Error approving job:", error);
        toast.error("Failed to approve job.");
    }
};

const deleteContent = async (collectionName, docId) => {
    try {
        const docRef = doc(db, `artifacts/${appId}/public/data/${collectionName}`, docId);
        await deleteDoc(docRef);
        toast.success(`${collectionName.slice(0, -1)} deleted successfully.`);
    } catch (error) {
        console.error(`Error deleting ${collectionName}:`, error);
        toast.error(`Failed to delete ${collectionName.slice(0, -1)}.`);
    }
};

// --- UI Components ---

const StatCard = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center transition-transform hover:scale-105">
        <div className="bg-blue-100 text-blue-600 p-4 rounded-full mr-4">
            {icon}
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmColor = 'bg-red-600', confirmHoverColor = 'hover:bg-red-700' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all scale-95 animate-in fade-in-0 zoom-in-95">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-gray-600 mt-2 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancel</button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-white rounded-md font-semibold ${confirmColor} ${confirmHoverColor}`}>Confirm</button>
                </div>
            </div>
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center space-x-2 mt-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 rounded-md hover:bg-gray-300"><ChevronLeft size={20} /></button>
            <span className="font-medium">Page {currentPage} of {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 rounded-md hover:bg-gray-300"><ChevronRight size={20} /></button>
        </div>
    );
};

const UserProfileModal = ({ user, onClose }) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><X /></button>
                <div className="flex items-center mb-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mr-6">
                        <User size={40} className="text-gray-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
                        <p className="text-gray-600">{user.email}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div><strong className="text-gray-600">Role:</strong> <span className="capitalize">{user.role}</span></div>
                    <div><strong className="text-gray-600">University ID:</strong> {user.universityId || 'N/A'}</div>
                    {user.role === 'alumni' && <div><strong className="text-gray-600">Graduation Year:</strong> {user.graduationYear || 'N/A'}</div>}
                    {user.role === 'alumni' && <div><strong className="text-gray-600">Status:</strong> {user.isVerified ? <span className="text-green-600 font-semibold">Verified</span> : <span className="text-yellow-600 font-semibold">Pending</span>}</div>}
                    <div><strong className="text-gray-600">Bio:</strong> <p className="mt-1 text-gray-700">{user.bio || 'No bio provided.'}</p></div>
                    <div><strong className="text-gray-600">Skills:</strong> <div className="flex flex-wrap gap-2 mt-1">{user.skills?.map(skill => <span key={skill} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">{skill}</span>) || 'No skills listed.'}</div></div>
                </div>
            </div>
        </div>
    );
};

const EventRegistrantsModal = ({ isOpen, onClose, eventId }) => {
    const [registrants, setRegistrants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !eventId) {
            setRegistrants([]);
            return;
        }

        setLoading(true);
        const registrantsQuery = query(collection(db, `artifacts/${appId}/public/data/events/${eventId}/registrations`));
        
        const unsubscribe = onSnapshot(registrantsQuery, (snapshot) => {
            const registrantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRegistrants(registrantsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching registrants:", error);
            toast.error("Could not fetch event registrants.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [eventId, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Event Registrants</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <p>Loading...</p>
                    ) : registrants.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left">
                                <tr>
                                    <th className="p-2 font-semibold">Applicant Name</th>
                                    <th className="p-2 font-semibold">Email</th>
                                    <th className="p-2 font-semibold">Registered At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrants.map(reg => (
                                    <tr key={reg.id} className="border-b">
                                        <td className="p-2">{reg.applicantName}</td>
                                        <td className="p-2">{reg.applicantEmail}</td>
                                        <td className="p-2">{reg.registeredAt?.toDate().toLocaleString() || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No one has registered for this event yet.</p>
                    )}
                </div>
            </div>
        </div>
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
            if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please check your credentials and try again.');
            } else {
                setError('An unexpected login error occurred. Please try again later.');
            }
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm"><h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Admin Portal</h1>{error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}<form onSubmit={handleLogin} className="space-y-4"><div><label className="block text-sm font-medium text-gray-600">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500" required /></div><div><label className="block text-sm font-medium text-gray-600">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500" required /></div><button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400">{loading ? 'Logging in...' : 'Login'}</button></form></div></div>
    );
};

const DashboardPage = () => {
    const [stats, setStats] = useState({ users: 0, alumni: 0, students: 0, jobs: 0, events: 0 });
    const [roleDistribution, setRoleDistribution] = useState([]);
    const COLORS = ['#0088FE', '#00C49F'];

    useEffect(() => {
        const usersQuery = query(collection(db, `artifacts/${appId}/public/data/users`));
        const jobsQuery = query(collection(db, `artifacts/${appId}/public/data/jobs`), where("isApproved", "==", true));
        const eventsQuery = query(collection(db, `artifacts/${appId}/public/data/events`));

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => doc.data());
            const alumniCount = usersData.filter(u => u.role === 'alumni' && u.isVerified).length;
            const studentCount = usersData.filter(u => u.role === 'student').length;
            setStats(prev => ({ ...prev, users: usersData.length, alumni: alumniCount, students: studentCount }));
            setRoleDistribution([{ name: 'Verified Alumni', value: alumniCount }, { name: 'Students', value: studentCount }]);
        }, (error) => console.error("Error fetching users:", error));

        const unsubJobs = onSnapshot(jobsQuery, (snapshot) => setStats(prev => ({ ...prev, jobs: snapshot.size })), (error) => console.error("Error fetching jobs:", error));
        const unsubEvents = onSnapshot(eventsQuery, (snapshot) => setStats(prev => ({ ...prev, events: snapshot.size })), (error) => console.error("Error fetching events:", error));

        return () => { unsubUsers(); unsubJobs(); unsubEvents(); };
    }, []);

    return (
        <div className="space-y-8"><h2 className="text-3xl font-bold text-gray-800">Dashboard</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><StatCard title="Total Users" value={stats.users} icon={<Users />} /><StatCard title="Verified Alumni" value={stats.alumni} icon={<CheckCircle />} /><StatCard title="Current Students" value={stats.students} icon={<Users />} /><StatCard title="Active Jobs" value={stats.jobs} icon={<Briefcase />} /><StatCard title="Upcoming Events" value={stats.events} icon={<Calendar />} /></div><div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-xl font-bold text-gray-800 mb-4">User Role Distribution</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>{roleDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div>
    );
};

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [gradYearFilter, setGradYearFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewUser, setViewUser] = useState(null);
    const ITEMS_PER_PAGE = 10;

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, userIds: [], userNames: '' });
    const [verifyModal, setVerifyModal] = useState({ isOpen: false, userIds: [], userNames: '' });

    useEffect(() => {
        const usersQuery = query(collection(db, `artifacts/${appId}/public/data/users`));
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            toast.error("Could not fetch user data.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchTerm, gradYearFilter]);

    const filteredAndSortedUsers = useMemo(() => {
        let filtered = users.filter(user => user.role !== 'admin');

        if (filter === 'pending') filtered = filtered.filter(u => u.role === 'alumni' && !u.isVerified);
        else if (filter !== 'all') filtered = filtered.filter(u => u.role === filter);

        if (searchTerm) filtered = filtered.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        if (gradYearFilter) filtered = filtered.filter(u => u.graduationYear?.toString() === gradYearFilter);

        return [...filtered].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [users, filter, searchTerm, gradYearFilter, sortConfig]);
    
    const totalPages = Math.ceil(filteredAndSortedUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = filteredAndSortedUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
    };
    
    const handleSelectUser = (userId) => setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    const handleSelectAll = (e) => setSelectedUsers(e.target.checked ? paginatedUsers.map(u => u.id) : []);
    
    const openBulkVerifyModal = () => setVerifyModal({ isOpen: true, userIds: selectedUsers, userNames: `${selectedUsers.length} user(s)` });
    const handleBulkVerifyConfirm = async () => {
        const batch = writeBatch(db);
        verifyModal.userIds.forEach(id => batch.update(doc(db, `artifacts/${appId}/public/data/users`, id), { isVerified: true }));
        try {
            await batch.commit();
            toast.success(`${verifyModal.userIds.length} users verified.`);
        } catch (error) { toast.error("Bulk verification failed."); console.error(error); }
        setVerifyModal({ isOpen: false, userIds: [], userNames: '' });
        setSelectedUsers([]);
    };

    const openBulkDeleteModal = () => setDeleteModal({ isOpen: true, userIds: selectedUsers, userNames: `${selectedUsers.length} user(s)` });
    const handleBulkDeleteConfirm = async () => {
        const batch = writeBatch(db);
        deleteModal.userIds.forEach(id => batch.delete(doc(db, `artifacts/${appId}/public/data/users`, id)));
        try {
            await batch.commit();
            toast.success(`${deleteModal.userIds.length} users deleted.`);
        } catch (error) { toast.error("Bulk deletion failed."); console.error(error); }
        setDeleteModal({ isOpen: false, userIds: [], userNames: '' });
        setSelectedUsers([]);
    };
    
    const handleClearFilters = () => {
        setSearchTerm('');
        setGradYearFilter('');
    };

    const SortableHeader = ({ children, name }) => (
        <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort(name)}>
            <div className="flex items-center justify-between">
                {children}
                {sortConfig.key === name && <span className="ml-2">{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>}
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            <UserProfileModal user={viewUser} onClose={() => setViewUser(null)} />
            <ConfirmationModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, userIds: [], userNames: '' })} onConfirm={handleBulkDeleteConfirm} title="Confirm Bulk Deletion" message={`Are you sure you want to permanently remove ${deleteModal.userNames}? This action cannot be undone.`} />
            <ConfirmationModal isOpen={verifyModal.isOpen} onClose={() => setVerifyModal({ isOpen: false, userIds: [], userNames: '' })} onConfirm={handleBulkVerifyConfirm} title="Confirm Bulk Verification" message={`Are you sure you want to verify ${verifyModal.userNames} as alumni?`} confirmColor="bg-green-600" confirmHoverColor="hover:bg-green-700" />
            <h2 className="text-3xl font-bold text-gray-800">User Management</h2>
            <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 border rounded-md" /></div>
                    <div className="flex gap-2"><input type="number" placeholder="Filter by Graduation Year" value={gradYearFilter} onChange={(e) => setGradYearFilter(e.target.value)} className="w-full p-2 border rounded-md" /><button onClick={handleClearFilters} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-600">Clear</button></div>
                </div>
                <div className="flex space-x-2 border-b">{['all', 'pending', 'alumni', 'student'].map(tab => (<button key={tab} onClick={() => setFilter(tab)} className={`py-2 px-4 capitalize ${filter === tab ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500'}`}>{tab === 'pending' ? 'Pending Verification' : tab}</button>))}</div>
            </div>
            {selectedUsers.length > 0 && (<div className="bg-blue-50 p-3 rounded-md flex items-center justify-between"><p className="font-semibold text-blue-800">{selectedUsers.length} user(s) selected</p><div className="space-x-2"><button onClick={openBulkVerifyModal} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">Verify Selected</button><button onClick={openBulkDeleteModal} className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600">Delete Selected</button></div></div>)}
            <div className="bg-white rounded-lg shadow-md overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-3 w-4"><input type="checkbox" onChange={handleSelectAll} checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0} /></th><SortableHeader name="name">Name</SortableHeader><SortableHeader name="email">Email</SortableHeader><th className="p-3">University ID</th><SortableHeader name="graduationYear">Graduation Year</SortableHeader><SortableHeader name="role">Role</SortableHeader><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{loading ? (<tr><td colSpan="8" className="text-center p-4"><div className="flex justify-center items-center"><svg className="animate-spin h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading users...</div></td></tr>) : paginatedUsers.length === 0 ? (<tr><td colSpan="8" className="text-center p-4 text-gray-500">No users match the current filters.</td></tr>) : paginatedUsers.map(user => (<tr key={user.id} className="border-b hover:bg-gray-50"><td className="p-3"><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelectUser(user.id)} /></td><td className="p-3 font-medium text-blue-600 hover:underline cursor-pointer" onClick={() => setViewUser(user)}>{user.name || 'N/A'}</td><td className="p-3">{user.email}</td><td className="p-3 font-mono text-gray-600">{user.universityId || 'N/A'}</td><td className="p-3">{user.graduationYear || 'N/A'}</td><td className="p-3 capitalize">{user.role}</td><td className="p-3">{user.role === 'alumni' ? (user.isVerified ? <span className="text-green-600 font-semibold">Verified</span> : <span className="text-yellow-600 font-semibold">Pending</span>) : 'N/A'}</td><td className="p-3 flex items-center space-x-2">{user.role === 'alumni' && !user.isVerified && (<button onClick={() => verifyAlumniProfile(user.id)} className="text-green-600 hover:text-green-800" title="Verify Alumni"><CheckCircle /></button>)}<button onClick={() => setDeleteModal({ isOpen: true, userIds: [user.id], userNames: `"${user.name}"`})} className="text-red-600 hover:text-red-800" title="Remove User"><Trash2 /></button></td></tr>))}</tbody></table></div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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

    const openModal = (itemToEdit = null) => { setEditingItem(itemToEdit); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };

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
                toast.success(`${collectionName.slice(0, -1)} updated successfully.`);
            } else {
                const dataToPost = { ...data, postedBy: 'Admin', postedById: auth.currentUser.uid, postedAt: serverTimestamp(), isApproved: true };
                await addDoc(collection(db, `artifacts/${appId}/public/data/${collectionName}`), dataToPost);
                toast.success(`${collectionName.slice(0, -1)} created successfully.`);
            }
            closeModal();
        } catch (error) { console.error("Error submitting form:", error); toast.error("An error occurred. Please try again."); }
    };

    const renderFormFields = () => {
        const fields = activeTab === 'jobs' 
            ? [
                {name: 'title', label: 'Job Title'}, 
                {name: 'company', label: 'Company'}, 
                {name: 'applicationUrl', label: 'Application URL', type: 'url'}, 
                {name: 'description', label: 'Description', type: 'textarea'}
              ]
            : [
                {name: 'title', label: 'Event Title'}, 
                {name: 'date', label: 'Date', type: 'date'}, 
                {name: 'location', label: 'Location'}, 
                {name: 'description', label: 'Description', type: 'textarea'}
              ];
        return fields.map(field => (<div key={field.name}><label className="block text-sm font-medium text-gray-700">{field.label}</label>{field.type === 'textarea' ? (<textarea name={field.name} defaultValue={editingItem?.[field.name] || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" rows="4" required />) : (<input type={field.type || 'text'} name={field.name} defaultValue={editingItem?.[field.name] || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />)}</div>));
    };

    return (
        <div className="space-y-6">
            <EventRegistrantsModal isOpen={isRegistrantsModalOpen} onClose={() => setIsRegistrantsModalOpen(false)} eventId={selectedEventId} />
            {isModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">{editingItem ? 'Edit' : 'Create New'} {activeTab === 'jobs' ? 'Job' : 'Event'}</h3><button onClick={closeModal}><X /></button></div><form onSubmit={handleFormSubmit} className="space-y-4">{renderFormFields()}<div className="flex justify-end space-x-2 pt-4"><button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingItem ? 'Save Changes' : 'Create'}</button></div></form></div></div>)}
            <div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-gray-800">Content Management</h2><button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"><PlusCircle size={18} className="mr-2" /> Create New</button></div>
            <div className="flex space-x-2 border-b"><button onClick={() => setActiveTab('jobs')} className={`py-2 px-4 ${activeTab === 'jobs' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}>Jobs</button><button onClick={() => setActiveTab('events')} className={`py-2 px-4 ${activeTab === 'events' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}>Events</button></div>
            <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                {activeTab === 'jobs' ? (
                    <table className="w-full text-sm">
                        <thead><tr className="text-left"><th className="p-2">Title</th><th className="p-2">Company</th><th className="p-2">URL</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
                        <tbody>{jobs.map(job => (<tr key={job.id} className="border-b"><td className="p-2">{job.title}</td><td className="p-2">{job.company}</td><td className="p-2"><a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a></td><td className="p-2">{job.isApproved ? <span className="text-green-600">Approved</span> : <span className="text-yellow-600">Pending</span>}</td><td className="p-2 flex space-x-2">{!job.isApproved && <button onClick={() => approveJobPosting(job.id)} className="text-green-600 hover:text-green-800"><CheckCircle /></button>}<button onClick={() => openModal(job)} className="text-blue-600 hover:text-blue-800"><Edit /></button><button onClick={() => deleteContent('jobs', job.id)} className="text-red-600 hover:text-red-800"><Trash2 /></button></td></tr>))}</tbody>
                    </table>
                ) : (
                    <table className="w-full text-sm">
                        <thead><tr className="text-left"><th className="p-2">Title</th><th className="p-2">Date</th><th className="p-2">Registrations</th><th className="p-2">Actions</th></tr></thead>
                        <tbody>{events.map(event => (<tr key={event.id} className="border-b"><td className="p-2">{event.title}</td><td className="p-2">{event.date}</td><td className="p-2"><button onClick={() => handleViewRegistrants(event.id)} className="text-blue-600 font-semibold hover:underline">{event.registrationCount || 0}</button></td><td className="p-2 flex space-x-2"><button onClick={() => openModal(event)} className="text-blue-600 hover:text-blue-800"><Edit /></button><button onClick={() => deleteContent('events', event.id)} className="text-red-600 hover:text-red-800"><Trash2 /></button></td></tr>))}</tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// --- Main Admin Panel Layout & Routing ---

const AdminPanelLayout = () => {
    const navLinks = [
        { to: "/dashboard", icon: <LayoutDashboard className="mr-3" />, text: "Dashboard" },
        { to: "/users", icon: <Users className="mr-3" />, text: "User Management" },
        { to: "/content", icon: <Briefcase className="mr-3" />, text: "Content" },
    ];

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans"><aside className="w-64 bg-white shadow-lg flex flex-col"><div className="p-4 text-2xl font-bold text-blue-600 border-b">Admin Panel</div><nav className="flex-1 p-4 space-y-2">{navLinks.map(link => (<NavLink key={link.to} to={link.to} className={({ isActive }) => `w-full text-left p-3 rounded-md flex items-center hover:bg-gray-100 font-medium ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}>{link.icon} {link.text}</NavLink>))}</nav><div className="p-4 border-t"><button onClick={() => signOut(auth)} className="w-full text-left p-3 rounded-md flex items-center hover:bg-gray-100 text-gray-600"><LogOut className="mr-3" /> Logout</button></div></aside><main className="flex-1 p-8"><Outlet /></main></div>
    );
};

const ProtectedRoute = ({ isAdmin }) => {
    if (!isAdmin) return <Navigate to="/login" replace />;
    return <AdminPanelLayout />;
};

const AppRoutes = () => {
    const { isAdmin, isAuthReady } = useAdminAuth();

    if (!isAuthReady) {
        return <div className="min-h-screen flex items-center justify-center text-xl">Loading Authentication...</div>;
    }

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

// --- Root Application Component ---
export default function App() {
    return (
        <AdminAppProvider>
            <Toaster position="top-right" reverseOrder={false} />
            <HashRouter>
                <AppRoutes />
            </HashRouter>
        </AdminAppProvider>
    );
}
