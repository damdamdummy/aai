import React, { useState, useEffect, useRef } from 'react';
import { Eye, Download, RefreshCw, Lock, Unlock, Search, MessageCircle, Settings, Save, Edit2 } from 'lucide-react';

const firebaseConfig = {
    apiKey: "AIzaSyBuaKK3NpQ3xhP3PbIYAolzfZf9SXaRikc",
    authDomain: "mychatbot-b0752.firebaseapp.com",
    projectId: "mychatbot-b0752",
    storageBucket: "mychatbot-b0752.firebasestorage.app",
    messagingSenderId: "44413551728",
    appId: "1:44413551728:web:4ce7110d225dea46a3e0b5"
};

export default function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [messages, setMessages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [anthropicApiKey, setAnthropicApiKey] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const messagesEndRef = useRef(null);
    const dbRef = useRef(null);
    const authRef = useRef(null);

    useEffect(() => {
        initFirebase();
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadConfig();
            listenToChats();
        }
    }, [isAuthenticated]);

    const initFirebase = async () => {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getFirestore, collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { getAuth, signInWithEmailAndPassword, signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            const auth = getAuth(app);

            dbRef.current = { db, collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, onSnapshot };
            authRef.current = { auth, signInWithEmailAndPassword, signOut };

            setInitializing(false);
        } catch (error) {
            console.error('Firebase init error:', error);
            alert('Failed to initialize Firebase. Check your config.');
            setInitializing(false);
        }
    };

    const handleLogin = async () => {
        try {
            const { auth, signInWithEmailAndPassword } = authRef.current;
            await signInWithEmailAndPassword(auth, email, password);
            setIsAuthenticated(true);
            setEmail('');
            setPassword('');
        } catch (error) {
            alert('Login failed! Check your email and password.');
            console.error(error);
        }
    };

    const handleLogout = async () => {
        try {
            const { auth, signOut } = authRef.current;
            await signOut(auth);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    const loadConfig = async () => {
        try {
            const { db, doc, getDoc } = dbRef.current;
            const configDoc = await getDoc(doc(db, 'config', 'chatbot'));

            if (configDoc.exists()) {
                const data = configDoc.data();
                setSystemPrompt(data.systemPrompt || '');
                setAnthropicApiKey(data.anthropicApiKey || '');
                setAdminPassword(data.adminPassword || '');
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const { db, doc, updateDoc } = dbRef.current;
            await updateDoc(doc(db, 'config', 'chatbot'), {
                systemPrompt,
                anthropicApiKey,
                adminPassword
            });
            alert('Configuration saved successfully!');
            setEditMode(false);
        } catch (error) {
            alert('Failed to save configuration');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const listenToChats = () => {
        try {
            const { db, collection, onSnapshot, query, orderBy } = dbRef.current;
            const q = query(collection(db, 'chats'), orderBy('timestamp', 'asc'));

            onSnapshot(q, (snapshot) => {
                const chatHistory = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.role && data.content) {
                        chatHistory.push({
                            id: doc.id,
                            role: data.role,
                            content: data.content,
                            timestamp: data.timestamp
                        });
                    }
                });
                setMessages(chatHistory);
            });
        } catch (error) {
            console.error('Failed to listen to chats:', error);
        }
    };

    const downloadChat = () => {
        const chatText = messages.map(m => {
            const time = new Date(m.timestamp).toLocaleString('id-ID');
            return `[${time}] ${m.role === 'user' ? 'Sophia' : 'Adam'}: ${m.content}`;
        }).join('\n\n');

        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    };

    const clearChat = async () => {
        if (confirm('Yakin mau hapus semua chat history? Ini permanent!')) {
            try {
                const { db, collection, getDocs, deleteDoc, doc } = dbRef.current;
                const snapshot = await getDocs(collection(db, 'chats'));

                const deletePromises = [];
                snapshot.forEach((document) => {
                    deletePromises.push(deleteDoc(doc(db, 'chats', document.id)));
                });

                await Promise.all(deletePromises);
                alert('Chat history berhasil dihapus!');
            } catch (error) {
                alert('Gagal hapus chat history');
                console.error(error);
            }
        }
    };

    const filteredMessages = messages.filter(m =>
        m.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        totalMessages: messages.length,
        sophiaMessages: messages.filter(m => m.role === 'user').length,
        adamMessages: messages.filter(m => m.role === 'assistant').length,
        lastActive: messages.length > 0
            ? new Date(messages[messages.length - 1].timestamp).toLocaleString('id-ID')
            : 'Belum ada aktivitas'
    };

    if (initializing) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                    <div className="flex items-center justify-center mb-6">
                        <Lock className="w-12 h-12 text-purple-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Admin Dashboard</h1>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="admin@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="Enter password"
                            />
                        </div>
                        <button
                            onClick={handleLogin}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-6 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Eye className="w-8 h-8 text-purple-400" />
                            <div>
                                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                                <p className="text-sm text-gray-400">Monitoring: Adam & Sophia</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                        >
                            <Unlock className="w-4 h-4" />
                            Logout
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-700 rounded-lg p-4">
                            <div className="text-gray-400 text-sm mb-1">Total Messages</div>
                            <div className="text-2xl font-bold">{stats.totalMessages}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                            <div className="text-gray-400 text-sm mb-1">Sophia</div>
                            <div className="text-2xl font-bold text-pink-400">{stats.sophiaMessages}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                            <div className="text-gray-400 text-sm mb-1">Adam (AI)</div>
                            <div className="text-2xl font-bold text-purple-400">{stats.adamMessages}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                            <div className="text-gray-400 text-sm mb-1">Last Active</div>
                            <div className="text-xs font-medium">{stats.lastActive.split(' ')[1] || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Config */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Configuration Panel */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                Configuration
                            </h2>
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-all"
                            >
                                <Edit2 className="w-4 h-4" />
                                {editMode ? 'Cancel' : 'Edit'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Anthropic API Key
                                </label>
                                <input
                                    type="password"
                                    value={anthropicApiKey}
                                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                                    disabled={!editMode}
                                    className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 text-sm"
                                    placeholder="sk-ant-..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    System Prompt / Personality
                                </label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    disabled={!editMode}
                                    rows={12}
                                    className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 text-sm font-mono"
                                    placeholder="Enter system prompt..."
                                />
                            </div>

                            {editMode && (
                                <button
                                    onClick={saveConfig}
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Chat Monitor */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Controls */}
                    <div className="bg-gray-800 rounded-lg p-4 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={downloadChat}
                                disabled={messages.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download className="w-4 h-4" />
                                Download
                            </button>
                            <button
                                onClick={clearChat}
                                disabled={messages.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear History
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search messages..."
                                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Chat History */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            Chat History
                            {searchTerm && (
                                <span className="text-sm text-gray-400">
                                    ({filteredMessages.length} results)
                                </span>
                            )}
                        </h2>

                        {filteredMessages.length === 0 ? (
                            <div className="text-center text-gray-400 py-12">
                                {messages.length === 0 ? 'Belum ada chat history' : 'No messages found'}
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {filteredMessages.map((msg, idx) => (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className="max-w-[75%]">
                                            <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                                                <span className="font-medium">
                                                    {msg.role === 'user' ? 'Sophia' : 'Adam (AI)'}
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(msg.timestamp).toLocaleString('id-ID')}</span>
                                            </div>
                                            <div
                                                className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                    ? 'bg-gradient-to-r from-pink-600 to-pink-500'
                                                    : 'bg-gray-700'
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}