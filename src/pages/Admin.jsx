import React, { useState, useEffect, useRef } from 'react';
import { Eye, Download, Lock, Unlock, Search, MessageCircle, Settings, Save, Edit2, Key, Send, Bot, User, ChevronDown, ChevronUp, BarChart2, X, CornerUpLeft } from 'lucide-react';

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
    const [chatbotPassword, setChatbotPassword] = useState('');
    const [botEnabled, setBotEnabled] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [manualMessage, setManualMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);

    const [replyingTo, setReplyingTo] = useState(null); // { id, content, role }

    const messagesEndRef = useRef(null);
    const dbRef = useRef(null);
    const authRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => { initFirebase(); }, []);
    useEffect(() => {
        if (isAuthenticated) { loadConfig(); listenToChats(); }
    }, [isAuthenticated]);
    useEffect(() => { scrollToBottom(); }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const initFirebase = async () => {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getFirestore, collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, onSnapshot, addDoc, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { getAuth, signInWithEmailAndPassword, signOut, connectAuthEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            const auth = getAuth(app);

            // emulator
            if (window.location.hostname === 'localhost') {
                connectFirestoreEmulator(db, 'localhost', 8080);
                connectAuthEmulator(auth, 'http://localhost:9099');
            }

            // set ref 
            dbRef.current = { db, collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, onSnapshot, addDoc };
            authRef.current = { auth, signInWithEmailAndPassword, signOut };

            setInitializing(false);
        } catch (error) {
            console.error('Firebase init error:', error);
            alert('Failed to initialize Firebase.');
            setInitializing(false);
        }
    };

    const handleLogin = async () => {
        try {
            const { auth, signInWithEmailAndPassword } = authRef.current;
            await signInWithEmailAndPassword(auth, email, password);
            setIsAuthenticated(true);
            setEmail(''); setPassword('');
        } catch (error) {
            alert('Login failed! Check your email and password.');
        }
    };

    const handleLogout = async () => {
        try {
            const { auth, signOut } = authRef.current;
            await signOut(auth);
            setIsAuthenticated(false);
        } catch (error) { console.error('Logout error:', error); }
    };

    const handleKeyPress = (e) => { if (e.key === 'Enter') handleLogin(); };

    const loadConfig = async () => {
        try {
            const { db, doc, getDoc } = dbRef.current;
            const configDoc = await getDoc(doc(db, 'config', 'chatbot'));
            if (configDoc.exists()) {
                const data = configDoc.data();
                setSystemPrompt(data.systemPrompt || '');
                setAnthropicApiKey(data.anthropicApiKey || '');
                setChatbotPassword(data.accessPassword || '');
                setBotEnabled(data.botEnabled !== false);
            }
        } catch (error) { console.error('Failed to load config:', error); }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const { db, doc, updateDoc } = dbRef.current;
            await updateDoc(doc(db, 'config', 'chatbot'), {
                systemPrompt, anthropicApiKey, accessPassword: chatbotPassword, botEnabled
            });
            alert('Configuration saved!');
            setEditMode(false);
        } catch (error) {
            alert('Failed to save configuration');
        } finally { setSaving(false); }
    };

    const toggleBot = async () => {
        const newBotEnabled = !botEnabled;
        setBotEnabled(newBotEnabled);
        try {
            const { db, doc, updateDoc } = dbRef.current;
            await updateDoc(doc(db, 'config', 'chatbot'), { botEnabled: newBotEnabled });
            alert(newBotEnabled ? 'Bot AI diaktifkan' : 'Manual mode aktif');
        } catch (error) {
            setBotEnabled(!newBotEnabled);
            alert('Failed to toggle bot status');
        }
    };

    const sendManualMessage = async () => {
        if (!manualMessage.trim() || sendingMessage) return;
        setSendingMessage(true);
        try {
            const { db, collection, addDoc } = dbRef.current;

            const payload = {
                role: 'model',
                content: manualMessage,
                timestamp: new Date().toISOString(),
                manual: true,
            };

            if (replyingTo) {
                payload.replyTo = replyingTo.id;
            }

            await addDoc(collection(db, 'chats'), payload);
            setManualMessage('');
            setReplyingTo(null);
        } catch (error) {
            alert('Failed to send message');
        } finally { setSendingMessage(false); }
    };

    const handleManualMessageKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendManualMessage(); }
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
                            timestamp: data.timestamp,
                            manual: data.manual || false,
                            replyTo: data.replyTo || null, // ← ambil field replyTo
                        });
                    }
                });
                setMessages(chatHistory);
            });
        } catch (error) { console.error('Failed to listen to chats:', error); }
    };

    const downloadChat = () => {
        const chatText = messages.map(m => {
            const time = new Date(m.timestamp).toLocaleString('id-ID');
            const sender = m.role === 'user' ? 'Sophia' : 'Adam' + (m.manual ? ' (Manual)' : ' (AI)');
            return '[' + time + '] ' + sender + ': ' + m.content;
        }).join('\n\n');
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat-history-' + new Date().toISOString().split('T')[0] + '.txt';
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
                alert('Chat history dihapus!');
            } catch (error) {
                alert('Gagal hapus chat history');
            }
        }
    };

    const filteredMessages = messages.filter(m =>
        m.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getReplySource = (replyToId) => {
        return messages.find(m => m.id === replyToId) || null;
    };

    const stats = {
        totalMessages: messages.length,
        sophiaMessages: messages.filter(m => m.role === 'user').length,
        adamMessages: messages.filter(m => m.role === 'model').length,
        manualMessages: messages.filter(m => m.manual).length,
        lastActive: messages.length > 0
            ? new Date(messages[messages.length - 1].timestamp).toLocaleString('id-ID')
            : 'Belum ada aktivitas'
    };

    if (initializing) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950">
                <div className="text-center text-white">
                    <div className="w-10 h-10 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500 text-xs tracking-widest uppercase">Loading</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-6 h-6 text-zinc-300" />
                        </div>
                        <h1 className="spfont text-xl font-semibold text-white tracking-tight">Welcome, Adam.</h1>
                    </div>
                    <div className="space-y-3">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="spfontr w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                            placeholder="Email"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="spfontr w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                            placeholder="Password"
                        />
                        <button
                            onClick={handleLogin}
                            className="spfont w-full py-3 bg-white text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-all"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
            <style>{`
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
                .collapse-body {
                    overflow: hidden;
                    transition: max-height 0.3s ease, opacity 0.25s ease, padding 0.25s ease;
                }
                .collapse-body.open { max-height: 700px; opacity: 1; }
                .collapse-body.closed { max-height: 0; opacity: 0; }

                .reply-btn {
                    opacity: 0.35;
                    transition: opacity 0.15s ease;
                }

                .reply-btn:hover, .reply-btn:active {
                    opacity: 1;
                }

                @font-face {
                    font-family: 'SFPro';
                    src: url('/fonts/sfptb.ttf') format('truetype');
                    font-weight: bold;
                    font-style: normal;
                }
                .spfont {
                    font-family: 'SFPro', -apple-system, 'SF Pro Text', sans-serif;
                }

                @font-face {
                    font-family: 'SFProReg';
                    src: url('/fonts/sfptr.ttf') format('truetype');
                    font-weight: normal;
                    font-style: normal;
                }
                .spfontr {
                    font-family: 'SFProReg', -apple-system, 'SF Pro Text', sans-serif;
                }

                @font-face {
                    font-family: 'SFProSB';
                    src: url('/fonts/sfptb.ttf') format('truetype');
                    font-weight: bold;
                    font-style: normal;
                }
                .spfontsb {
                    font-family: 'SFProSB', -apple-system, 'SF Pro Text', sans-serif;
                }
            `}</style>

            <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <Eye className="w-3.5 h-3.5 text-zinc-300" />
                    </div>
                    <span className="spfont font-bold text-sm">My Panel</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleBot}
                        className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (botEnabled ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white text-zinc-900 hover:bg-zinc-200")}
                    >
                        {botEnabled ? <><Bot className="spfont w-3 h-3" />AI On</> : <><User className="spfont w-3 h-3" />Manual</>}
                    </button>
                    <button onClick={handleLogout} className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors">
                        <Unlock className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

                {/* STATS  */}
                <div className="flex-shrink-0 border-b border-zinc-800">
                    <button
                        onClick={() => setStatsOpen(!statsOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="spfont text-xs font-medium text-zinc-400 uppercase tracking-widest">Stats</span>
                            <span className="spfontr text-zinc-600 text-xs normal-case tracking-normal font-normal">{stats.totalMessages} pesan</span>
                        </div>
                        {statsOpen ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                    </button>
                    <div className={"collapse-body " + (statsOpen ? "open" : "closed")}>
                        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                            {[
                                { label: 'Total', value: stats.totalMessages, color: 'text-white' },
                                { label: 'Sophia', value: stats.sophiaMessages, color: 'text-zinc-300' },
                                { label: 'Adam (AI)', value: stats.adamMessages - stats.manualMessages, color: 'text-zinc-300' },
                                { label: 'Manual', value: stats.manualMessages, color: 'text-zinc-400' },
                            ].map((s) => (
                                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                    <div className="text-zinc-600 text-xs mb-1">{s.label}</div>
                                    <div className={"text-xl font-bold " + s.color}>{s.value}</div>
                                </div>
                            ))}
                            <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                <div className="text-zinc-600 text-xs mb-1">Last Active</div>
                                <div className="text-sm text-zinc-300">{stats.lastActive}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONFIG  */}
                <div className="flex-shrink-0 border-b border-zinc-800">
                    <button
                        onClick={() => setConfigOpen(!configOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="spfont text-xs font-medium text-zinc-400 uppercase tracking-widest">Configuration</span>
                        </div>
                        {configOpen ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                    </button>
                    <div className={"collapse-body " + (configOpen ? "open" : "closed")}>
                        <div className="px-4 pb-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-600">Edit config</span>
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 transition-all"
                                >
                                    {editMode ? <><X className="w-3 h-3" />Cancel</> : <><Edit2 className="w-3 h-3" />Edit</>}
                                </button>
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-xs text-zinc-500 mb-1.5"><Key className="w-3 h-3" />Access Password</label>
                                <input
                                    type="text"
                                    value={chatbotPassword}
                                    onChange={(e) => setChatbotPassword(e.target.value)}
                                    disabled={!editMode}
                                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40 text-sm"
                                    placeholder="Chatbot access password"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1.5">Gemini API Key</label>
                                <input
                                    type="password"
                                    value={anthropicApiKey}
                                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                                    disabled={!editMode}
                                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40 text-sm"
                                    placeholder="AIza..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1.5">System Prompt</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    disabled={!editMode}
                                    rows={5}
                                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40 text-sm font-mono resize-none"
                                    placeholder="System prompt..."
                                />
                            </div>
                            {editMode && (
                                <button
                                    onClick={saveConfig}
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-all disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* SEARCH + CONTROLS */}
                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/40">
                    <Search className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search chat..."
                        className="spfont flex-1 bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm"
                    />
                    {searchTerm && <span className="text-zinc-500 text-xs">{filteredMessages.length}</span>}
                    <button onClick={downloadChat} disabled={messages.length === 0} className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                    </button>
                    {/* <button onClick={clearChat} disabled={messages.length === 0} className="p-1.5 text-zinc-600 hover:text-red-400 disabled:opacity-30 transition-colors" title="Clear">
                        <X className="w-4 h-4" />
                    </button> */}
                </div>

                {/* CHAT HISTORY */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {filteredMessages.length === 0 ? (
                        <div className="text-center text-zinc-700 py-16 text-sm">
                            {messages.length === 0 ? 'Belum ada chat history' : 'No messages found'}
                        </div>
                    ) : (
                        filteredMessages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            const replySource = msg.replyTo ? getReplySource(msg.replyTo) : null;

                            return (
                                <div key={msg.id || idx} className={"flex msg-wrapper " + (isUser ? 'justify-start' : 'justify-end')}>


                                    {isUser ? (
                                        <button
                                            className="reply-btn self-center mr-2 p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                                            title="Reply"
                                            onClick={() => {
                                                setReplyingTo({ id: msg.id, content: msg.content, role: msg.role });
                                                textareaRef.current?.focus();
                                            }}
                                        >
                                            <CornerUpLeft className="w-3.5 h-3.5" />
                                        </button>
                                    ) : null}


                                    <div className="max-w-[78%] flex flex-col">
                                        {/* Label nama + waktu */}
                                        <div className={"w-full text-xs text-zinc-600 mb-1 flex items-center gap-1.5 px-1 " + (msg.role === 'model' ? 'justify-end' : 'justify-start')}>
                                            <span className="spfont font-bold text-zinc-400">{msg.role === 'user' ? 'Pia 😙🤍' : 'Adam'}</span>
                                            {msg.role === 'model' && (
                                                <span className="spfontr flex items-center gap-0.5 text-zinc-600">
                                                    {msg.manual ? <><User className="w-2.5 h-2.5" />manual</> : <><Bot className="w-2.5 h-2.5" />AI</>}
                                                </span>
                                            )}
                                            <span className="text-zinc-800">·</span>
                                            <span className="spfontr">
                                                {new Date(msg.timestamp).toLocaleString('id-ID', {
                                                    day: '2-digit', month: '2-digit', year: '2-digit',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        <div className={"flex flex-col " + (msg.role === 'model' ? 'items-end' : 'items-start')}>


                                            {replySource && (
                                                <div className={
                                                    "mb-1 px-3 py-1.5 rounded-xl text-xs max-w-full " +
                                                    "bg-zinc-900 border-l-2 border-zinc-500 text-zinc-400 " +
                                                    "truncate cursor-default"
                                                }
                                                    style={{ maxWidth: '100%' }}
                                                    title={replySource.content}
                                                >
                                                    <span className="spfontsb text-zinc-500 font-semibold mr-1">
                                                        {replySource.role === 'user' ? 'Pia' : 'Adam'}:
                                                    </span>
                                                    <span className="spfontr truncate">
                                                        {replySource.content.length > 80
                                                            ? replySource.content.slice(0, 80) + '…'
                                                            : replySource.content}
                                                    </span>
                                                </div>
                                            )}



                                            <div className={"inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed " + (
                                                isUser
                                                    ? 'bg-zinc-700 text-zinc-100'
                                                    : msg.manual
                                                        ? 'bg-zinc-800 border border-zinc-600 text-zinc-200'
                                                        : 'bg-zinc-800 text-zinc-300'
                                            )}>
                                                <p className="spfontsb font-normal whitespace-pre-wrap break-words">{msg.content}</p>
                                            </div>
                                        </div>
                                    </div>


                                    {!isUser ? (
                                        <button
                                            className="reply-btn self-center ml-2 p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                                            title="Reply"
                                            onClick={() => {
                                                setReplyingTo({ id: msg.id, content: msg.content, role: msg.role });
                                                textareaRef.current?.focus();
                                            }}
                                        >
                                            <CornerUpLeft className="w-3.5 h-3.5" />
                                        </button>
                                    ) : null}
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* MANUAL INPUT */}
            <div className="flex-shrink-0 bg-zinc-900 border-t border-zinc-800">
                {!botEnabled && (
                    <div className="px-4 pt-2 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-zinc-500" />
                        <span className="spfontsb text-xs text-zinc-500">Manual mode</span>
                    </div>
                )}


                {replyingTo && (
                    <div className="flex items-center gap-2 px-4 pt-2 pb-1 border-t border-zinc-800">
                        <CornerUpLeft className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <div className="flex-1 text-xs text-zinc-400 truncate">
                            <span className="text-zinc-500 font-semibold mr-1">
                                {replyingTo.role === 'user' ? 'Pia' : 'Adam'}:
                            </span>
                            {replyingTo.content.length > 80
                                ? replyingTo.content.slice(0, 80) + '…'
                                : replyingTo.content}
                        </div>
                        <button
                            onClick={() => setReplyingTo(null)}
                            className="p-0.5 text-zinc-600 hover:text-zinc-300 flex-shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}


                <div className="flex items-end gap-2 px-4 py-3">
                    <textarea
                        ref={textareaRef}
                        value={manualMessage}
                        onChange={(e) => setManualMessage(e.target.value)}
                        onKeyPress={handleManualMessageKeyPress}
                        placeholder={botEnabled ? "..." : "..."}
                        className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 resize-none"
                        rows="1"
                        disabled={sendingMessage}
                        style={{ maxHeight: '120px' }}
                    />
                    <button
                        onClick={sendManualMessage}
                        disabled={sendingMessage || !manualMessage.trim()}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                    >
                        {sendingMessage
                            ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" />
                            : <Send className="w-4 h-4" />
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}