import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, Download, Lock, Unlock, Search, Settings, Save, Edit2, Key, Send, Bot, User, ChevronDown, ChevronUp, BarChart2, X, CornerUpLeft, Loader2 } from 'lucide-react';

const firebaseConfig = {
    apiKey: "AIzaSyBuaKK3NpQ3xhP3PbIYAolzfZf9SXaRikc",
    authDomain: "mychatbot-b0752.firebaseapp.com",
    projectId: "mychatbot-b0752",
    storageBucket: "mychatbot-b0752.firebasestorage.app",
    messagingSenderId: "44413551728",
    appId: "1:44413551728:web:4ce7110d225dea46a3e0b5"
};

const PAGE_SIZE = 100;
const BOTTOM_THRESHOLD = 120;

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
    const [replyingTo, setReplyingTo] = useState(null);
    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [adminReactions, setAdminReactions] = useState({});
    const [userReactions, setUserReactions] = useState({});
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const EMOJIS = [
        { emoji: '❤️', label: 'love' },
        { emoji: '👍', label: 'thumbs up' },
        { emoji: '👎', label: 'thumbs down' },
        { emoji: '😢', label: 'sad' },
        { emoji: '😂', label: 'laugh' },
        { emoji: '😡', label: 'angry' },
        { emoji: '😮', label: 'surprise' },
    ];

    const messagesEndRef = useRef(null);

    const chatContainerRef = useRef(null);
    const dbRef = useRef(null);
    const authRef = useRef(null);
    const textareaRef = useRef(null);
    const unsubscribeRef = useRef(null);
    const messageRefsMap = useRef({});

    // Pagination refs
    const hasMoreRef = useRef(true);
    const loadingOlderRef = useRef(false);
    const lastDocRef = useRef(null);

    // Auto-scroll ref
    const autoScrollRef = useRef(true);

    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { loadingOlderRef.current = loadingOlder; }, [loadingOlder]);

    const registerMessageRef = useCallback((id, el) => {
        if (el) messageRefsMap.current[id] = el;
        else delete messageRefsMap.current[id];
    }, []);


    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const handleBackToBottom = () => {
        autoScrollRef.current = true;
        setShowScrollBtn(false);
        scrollToBottom('smooth');
    };


    const scrollToMessage = useCallback(async (targetId) => {
        const el = messageRefsMap.current[targetId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(targetId);
            setTimeout(() => setHighlightedMessageId(null), 1800);
        } else {
            try {
                const { db, doc, getDoc } = dbRef.current;
                const snap = await getDoc(doc(db, 'chats', targetId));
                if (!snap.exists()) return;
                const data = snap.data();
                const fetched = { id: snap.id, role: data.role, content: data.content, timestamp: data.timestamp, manual: data.manual || false, replyTo: data.replyTo || null };
                setMessages(prev => prev.find(m => m.id === targetId) ? prev : [fetched, ...prev]);
                setTimeout(() => {
                    const elAfter = messageRefsMap.current[targetId];
                    if (elAfter) {
                        elAfter.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setHighlightedMessageId(targetId);
                        setTimeout(() => setHighlightedMessageId(null), 1800);
                    }
                }, 150);
            } catch (err) { console.warn('[scrollToMessage] tidak ditemukan:', targetId, err); }
        }
    }, []);


    useEffect(() => {
        if (loadingOlderRef.current) return;
        if (!autoScrollRef.current) return;
        scrollToBottom('smooth');
    }, [messages]);


    useEffect(() => {
        if (!activeEmojiPicker) return;
        const handler = (e) => {
            if (!e.target.closest('.emoji-picker') && !e.target.closest('.react-btn')) setActiveEmojiPicker(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activeEmojiPicker]);

    useEffect(() => { initFirebase(); }, []);
    useEffect(() => () => { unsubscribeRef.current?.(); }, []);


    const loadOlderChatsRef = useRef(null);

    const chatContainerCallbackRef = useCallback((node) => {

        if (chatContainerRef.current) {
            chatContainerRef.current.removeEventListener('scroll', onScrollHandler);
        }
        chatContainerRef.current = node;
        if (!node) return;


        node.addEventListener('scroll', onScrollHandler, { passive: true });

    }, []);


    function onScrollHandler() {
        const c = chatContainerRef.current;
        if (!c) return;
        const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < BOTTOM_THRESHOLD;
        autoScrollRef.current = nearBottom;
        setShowScrollBtn(!nearBottom);
        if (c.scrollTop < 100) loadOlderChatsRef.current?.();
    }


    const initFirebase = async () => {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const {
                getFirestore, collection, getDocs, query, orderBy, limit, startAfter,
                doc, getDoc, updateDoc, deleteDoc, onSnapshot, addDoc, connectFirestoreEmulator
            } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { getAuth, signInWithEmailAndPassword, signOut, connectAuthEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            const auth = getAuth(app);

            if (window.location.hostname === 'localhost') {
                connectFirestoreEmulator(db, 'localhost', 8080);
                connectAuthEmulator(auth, 'http://localhost:9099');
            }

            dbRef.current = { db, collection, getDocs, query, orderBy, limit, startAfter, doc, getDoc, updateDoc, deleteDoc, onSnapshot, addDoc };
            authRef.current = { auth, signInWithEmailAndPassword, signOut };
            setInitializing(false);
        } catch (err) {
            console.error('Firebase init error:', err);
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
        } catch (err) { alert('Login failed! Check your email and password.'); }
    };

    const handleLogout = async () => {
        try { const { auth, signOut } = authRef.current; await signOut(auth); setIsAuthenticated(false); }
        catch (err) { console.error('Logout error:', err); }
    };

    const handleLoginKeyPress = (e) => { if (e.key === 'Enter') handleLogin(); };


    const loadConfig = async () => {
        try {
            const { db, doc, getDoc } = dbRef.current;
            const snap = await getDoc(doc(db, 'config', 'chatbot'));
            if (snap.exists()) {
                const data = snap.data();
                setSystemPrompt(data.systemPrompt || '');
                setAnthropicApiKey(data.anthropicApiKey || '');
                setChatbotPassword(data.accessPassword || '');
                setBotEnabled(data.botEnabled !== false);
            }
        } catch (err) { console.error('Failed to load config:', err); }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const { db, doc, updateDoc } = dbRef.current;
            await updateDoc(doc(db, 'config', 'chatbot'), { systemPrompt, anthropicApiKey, accessPassword: chatbotPassword, botEnabled });
            alert('Configuration saved!');
            setEditMode(false);
        } catch (err) { alert('Failed to save configuration'); }
        finally { setSaving(false); }
    };

    const toggleBot = async () => {
        const next = !botEnabled;
        setBotEnabled(next);
        try {
            const { db, doc, updateDoc } = dbRef.current;
            await updateDoc(doc(db, 'config', 'chatbot'), { botEnabled: next });
            alert(next ? 'Bot AI diaktifkan' : 'Manual mode aktif');
        } catch (err) { setBotEnabled(!next); alert('Failed to toggle bot status'); }
    };


    const loadInitialChats = async () => {
        try {
            const { db, collection, getDocs, query, orderBy, limit } = dbRef.current;
            const q = query(collection(db, 'chats'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs;

            lastDocRef.current = docs.length > 0 ? docs[docs.length - 1] : null;
            const hasMorePages = docs.length === PAGE_SIZE;
            setHasMore(hasMorePages); hasMoreRef.current = hasMorePages;

            const chatHistory = docs
                .map(d => { const data = d.data(); return { id: d.id, role: data.role, content: data.content, timestamp: data.timestamp, manual: data.manual || false, replyTo: data.replyTo || null }; })
                .filter(m => m.role && m.content)
                .reverse();

            const adminMap = {}, userMap = {};
            docs.forEach(d => {
                const data = d.data();
                if (data.adminReaction) adminMap[d.id] = data.adminReaction;
                if (data.userReaction) userMap[d.id] = data.userReaction;
            });

            setMessages(chatHistory);
            setAdminReactions(adminMap);
            setUserReactions(userMap);
        } catch (err) { console.error('Failed to load initial chats:', err); }
    };


    const loadOlderChats = async () => {
        if (loadingOlderRef.current || !hasMoreRef.current || !lastDocRef.current) return;

        loadingOlderRef.current = true;
        setLoadingOlder(true);

        const container = chatContainerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;

        try {
            const { db, collection, getDocs, query, orderBy, limit, startAfter } = dbRef.current;
            const q = query(collection(db, 'chats'), orderBy('timestamp', 'desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs;

            if (docs.length === 0) { setHasMore(false); hasMoreRef.current = false; return; }

            lastDocRef.current = docs[docs.length - 1];
            const hasMorePages = docs.length === PAGE_SIZE;
            setHasMore(hasMorePages); hasMoreRef.current = hasMorePages;

            const olderMessages = docs
                .map(d => { const data = d.data(); return { id: d.id, role: data.role, content: data.content, timestamp: data.timestamp, manual: data.manual || false, replyTo: data.replyTo || null }; })
                .filter(m => m.role && m.content)
                .reverse();

            const adminMap = {}, userMap = {};
            docs.forEach(d => {
                const data = d.data();
                if (data.adminReaction) adminMap[d.id] = data.adminReaction;
                if (data.userReaction) userMap[d.id] = data.userReaction;
            });

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const fresh = olderMessages.filter(m => !existingIds.has(m.id));
                return fresh.length > 0 ? [...fresh, ...prev] : prev;
            });
            setAdminReactions(prev => ({ ...adminMap, ...prev }));
            setUserReactions(prev => ({ ...userMap, ...prev }));

            requestAnimationFrame(() => {
                if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
            });
        } catch (err) {
            console.error('Failed to load older chats:', err);
        } finally {
            loadingOlderRef.current = false;
            setLoadingOlder(false);
        }
    };


    loadOlderChatsRef.current = loadOlderChats;


    const startRealtimeListener = () => {
        unsubscribeRef.current?.();
        const { db, collection, onSnapshot, query, orderBy, limit } = dbRef.current;
        const q = query(collection(db, 'chats'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const snapMessages = [], adminMap = {}, userMap = {};
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (!data.role || !data.content) return;
                snapMessages.push({ id: docSnap.id, role: data.role, content: data.content, timestamp: data.timestamp, manual: data.manual || false, replyTo: data.replyTo || null });
                if (data.adminReaction) adminMap[docSnap.id] = data.adminReaction;
                if (data.userReaction) userMap[docSnap.id] = data.userReaction;
            });
            snapMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const updated = prev.map(m => { const s = snapMessages.find(x => x.id === m.id); return s ? { ...m, content: s.content, replyTo: s.replyTo, manual: s.manual } : m; });
                const newOnes = snapMessages.filter(m => !existingIds.has(m.id));
                return newOnes.length > 0 ? [...updated, ...newOnes] : updated;
            });
            setAdminReactions(prev => ({ ...prev, ...adminMap }));
            setUserReactions(prev => ({ ...prev, ...userMap }));
        });
        unsubscribeRef.current = unsubscribe;
    };


    useEffect(() => {
        if (!isAuthenticated) return;
        loadConfig();
        loadInitialChats();
        startRealtimeListener();

    }, [isAuthenticated]);


    const sendManualMessage = async () => {
        if (!manualMessage.trim() || sendingMessage) return;
        setSendingMessage(true);
        autoScrollRef.current = true;
        setShowScrollBtn(false);
        try {
            const { db, collection, addDoc } = dbRef.current;
            const payload = { role: 'model', content: manualMessage, timestamp: new Date().toISOString(), manual: true };
            if (replyingTo) payload.replyTo = replyingTo.id;
            await addDoc(collection(db, 'chats'), payload);
            setManualMessage('');
            setReplyingTo(null);
        } catch (err) { alert('Failed to send message'); }
        finally { setSendingMessage(false); }
    };

    const handleManualMessageKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendManualMessage(); } };


    const handleReaction = async (msgId, emoji) => {
        setActiveEmojiPicker(null);
        try {
            const { db, doc, updateDoc } = dbRef.current;
            const current = adminReactions[msgId];
            const next = current === emoji ? null : emoji;
            await updateDoc(doc(db, 'chats', msgId), { adminReaction: next || null });
            setAdminReactions(prev => ({ ...prev, [msgId]: next }));
        } catch (err) { console.error('Failed to update reaction:', err); }
    };


    const downloadChat = () => {
        const text = messages.map(m => `[${new Date(m.timestamp).toLocaleString('id-ID')}] ${m.role === 'user' ? 'Sophia' : 'Adam' + (m.manual ? ' (Manual)' : ' (AI)')}: ${m.content}`).join('\n\n');
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: `chat-history-${new Date().toISOString().split('T')[0]}.txt` });
        a.click();
    };


    const filteredMessages = messages.filter(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const getReplySource = (id) => messages.find(m => m.id === id) || null;
    const stats = {
        totalMessages: messages.length,
        sophiaMessages: messages.filter(m => m.role === 'user').length,
        adamMessages: messages.filter(m => m.role === 'model').length,
        manualMessages: messages.filter(m => m.manual).length,
        lastActive: messages.length > 0 ? new Date(messages[messages.length - 1].timestamp).toLocaleString('id-ID') : 'Belum ada aktivitas'
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
            <div className="app-shell min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <style>{`
                    .app-shell { position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100dvh; overflow: hidden; display: flex; flex-direction: column; }
                    @font-face { font-family: 'SFPro'; src: url('/fonts/sfptb.ttf') format('truetype'); font-weight: normal; }
                    .spfont { font-family: 'SFPro', -apple-system, 'SF Pro Text', sans-serif; }
                    @font-face { font-family: 'SFProReg'; src: url('/fonts/sfptr.ttf') format('truetype'); font-weight: normal; }
                    .spfontr { font-family: 'SFProReg', -apple-system, 'SF Pro Text', sans-serif; }
                `}</style>
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-6 h-6 text-zinc-300" />
                        </div>
                        <h1 className="font-bold text-xl text-white tracking-tight">Welcome, Adam.</h1>
                    </div>
                    <div className="space-y-3">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyPress={handleLoginKeyPress}
                            className="font-normal w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm" placeholder="Email" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={handleLoginKeyPress}
                            className="font-normal w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm" placeholder="Password" />
                        <button onClick={handleLogin} className="font-bold w-full py-3 bg-white text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-all">Login</button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="app-shell flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
            <style>{`
                .app-shell { position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100dvh; overflow: hidden; display: flex; flex-direction: column;  }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
                .collapse-body { overflow: hidden; transition: max-height 0.3s ease, opacity 0.25s ease; }
                .collapse-body.open { max-height: 700px; opacity: 1; }
                .collapse-body.closed { max-height: 0; opacity: 0; }
                .msg-wrapper { position: relative; }
                .reply-btn { opacity: 0; transition: opacity 0.15s ease; }
                .react-btn { opacity: 0; transition: opacity 0.15s ease; }
                .msg-wrapper:hover .reply-btn { opacity: 1; }
                .msg-wrapper:hover .react-btn { opacity: 1; }
                .emoji-picker {
                    display: flex; gap: 2px; background: #18181b; border: 1px solid #3f3f46;
                    border-radius: 999px; padding: 4px 6px; position: absolute; bottom: 2rem;
                    max-width: 90vw; width: max-content; z-index: 100;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.5); animation: popIn 0.12s ease; white-space: nowrap;
                }
                @keyframes popIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
                .emoji-btn-item { font-size: 1.1rem; cursor: pointer; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transition: background 0.1s, transform 0.1s; border: none; background: transparent; }
                .emoji-btn-item:hover { background: #3f3f46; transform: scale(1.25); }
                .reaction-badge { font-size: 0.8rem; background: #27272a; border: 1px solid #3f3f46; border-radius: 999px; padding: 1px 6px; cursor: pointer; transition: border-color 0.15s; line-height: 1.4; user-select: none; }
                .reaction-badge:hover { border-color: #71717a; }
                .reaction-badge-readonly { font-size: 0.8rem; background: #1c1c1f; border: 1px dashed #3f3f46; border-radius: 999px; padding: 1px 6px; cursor: default; line-height: 1.4; user-select: none; opacity: 0.65; }
                .reply-preview-clickable { cursor: pointer; transition: opacity 0.15s; }
                .reply-preview-clickable:hover { opacity: 0.7; }
                .msg-highlight { animation: highlightPulse 1.8s ease-out forwards; border-radius: 12px; }
                @keyframes highlightPulse { 0% { background-color: rgba(161,161,170,0.15); } 60% { background-color: rgba(161,161,170,0.08); } 100% { background-color: transparent; } }
              
                .back-to-bottom-admin {
                    position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%);
                    z-index: 20; display: flex; align-items: center; gap: 5px;
                    background: rgba(39,39,42,0.95); color: #d4d4d8;
                    border: 1px solid #52525b; border-radius: 999px;
                    padding: 5px 14px 5px 10px; cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4); font-size: 0.75rem;
                    transition: background 0.15s, transform 0.15s;
                    animation: fadeInUp 0.2s ease;
                    font-family: -apple-system, 'SF Pro Text', sans-serif;
                }
                .back-to-bottom-admin:hover { background: rgba(63,63,70,0.98); transform: translateX(-50%) translateY(-2px); }
                @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
                @font-face { font-family: 'SFPro'; src: url('/fonts/sfptb.ttf') format('truetype'); font-weight: normal; }
                .spfont { font-family: 'SFPro', -apple-system, 'SF Pro Text', sans-serif; }
                @font-face { font-family: 'SFProReg'; src: url('/fonts/sfptr.ttf') format('truetype'); font-weight: normal; }
                .spfontr { font-family: 'SFProReg', -apple-system, 'SF Pro Text', sans-serif; }
                @font-face { font-family: 'SFProSB'; src: url('/fonts/sfptsb.ttf') format('truetype'); font-weight: normal; }
                .spfontsb { font-family: 'SFProSB', -apple-system, 'SF Pro Text', sans-serif; }
                @font-face { font-family: 'SFProM'; src: url('/fonts/sfptm.ttf') format('truetype'); font-weight: normal; }
                .spfontm { font-family: 'SFProM', -apple-system, 'SF Pro Text', sans-serif; }
            `}</style>

            {/* Header */}
            <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <Eye className="w-3.5 h-3.5 text-zinc-300" />
                    </div>
                    <span className="spfont font-bold text-sm">My Panel</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleBot}
                        className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (botEnabled ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white text-zinc-900 hover:bg-zinc-200")}>
                        {botEnabled ? <><Bot className="w-3 h-3" />AI On</> : <><User className="w-3 h-3" />Manual</>}
                    </button>
                    <button onClick={handleLogout} className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors">
                        <Unlock className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Collapsible panels (Stats + Config + Search) */}
            <div className="flex-shrink-0 flex flex-col">
                {/* STATS */}
                <div className="border-b border-zinc-800">
                    <button onClick={() => setStatsOpen(!statsOpen)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900 transition-colors">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="spfont text-xs font-medium text-zinc-400 uppercase tracking-widest">Stats</span>
                            <span className="spfontr text-zinc-600 text-xs">{stats.totalMessages} pesan</span>
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
                            ].map(s => (
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

                {/* CONFIG */}
                <div className="border-b border-zinc-800">
                    <button onClick={() => setConfigOpen(!configOpen)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900 transition-colors">
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
                                <button onClick={() => setEditMode(!editMode)} className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 transition-all">
                                    {editMode ? <><X className="w-3 h-3" />Cancel</> : <><Edit2 className="w-3 h-3" />Edit</>}
                                </button>
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-xs text-zinc-500 mb-1.5"><Key className="w-3 h-3" />Access Password</label>
                                <input type="text" value={chatbotPassword} onChange={(e) => setChatbotPassword(e.target.value)} disabled={!editMode}
                                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40 text-sm" placeholder="Chatbot access password" />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1.5">Gemini API Key</label>
                                <input type="password" value={anthropicApiKey} onChange={(e) => setAnthropicApiKey(e.target.value)} disabled={!editMode}
                                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40 text-sm" placeholder="AIza..." />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1.5">System Prompt</label>
                                <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} disabled={!editMode} rows={5}
                                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40 text-sm font-mono resize-none" placeholder="System prompt..." />
                            </div>
                            {editMode && (
                                <button onClick={saveConfig} disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-all disabled:opacity-50">
                                    <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* SEARCH */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/40">
                    <Search className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search chat..."
                        className="spfont flex-1 bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm" />
                    {searchTerm && <span className="text-zinc-500 text-xs">{filteredMessages.length}</span>}
                    <button onClick={downloadChat} disabled={messages.length === 0} className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                    </button>
                    {/* <button onClick={clearChat} disabled={messages.length === 0} className="p-1.5 text-zinc-600 hover:text-red-400 disabled:opacity-30 transition-colors" title="Clear">
                        <X className="w-4 h-4" />
                    </button> */}
                </div>
            </div>

            {/* ── CHAT HISTORY + floating button ── */}

            <div className="flex-1 min-h-0 relative">

                <div
                    ref={chatContainerCallbackRef}
                    className="h-full overflow-y-auto px-4 py-4 space-y-3"
                >
                    {loadingOlder && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                        </div>
                    )}
                    {!hasMore && messages.length > 0 && (
                        <p className="text-center text-zinc-700 text-xs py-1 spfontr">— Awal percakapan —</p>
                    )}

                    {filteredMessages.length === 0 ? (
                        <div className="text-center text-zinc-700 py-16 text-sm">
                            {messages.length === 0 ? 'Belum ada chat history' : 'No messages found'}
                        </div>
                    ) : (
                        filteredMessages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            const replySource = msg.replyTo ? getReplySource(msg.replyTo) : null;
                            const isHighlighted = highlightedMessageId === msg.id;

                            return (
                                <div key={msg.id || idx}
                                    ref={(el) => registerMessageRef(msg.id, el)}
                                    className={"flex msg-wrapper " + (isUser ? 'justify-start' : 'justify-end') + (isHighlighted ? ' msg-highlight' : '')}
                                >
                                    <div className="max-w-[78%] flex flex-col">
                                        <div className={"w-full text-xs text-zinc-600 mb-1 flex items-center gap-1.5 px-1 " + (msg.role === 'model' ? 'justify-end' : 'justify-start')}>
                                            <span className="spfont font-bold text-zinc-100 tracking-wide">{msg.role === 'user' ? 'Pipipiw 😙🤍' : 'Adam'}</span>
                                            {msg.role === 'model' && (
                                                <span className="spfontr flex items-center gap-0.5 text-zinc-600">
                                                    {msg.manual ? <><User className="w-2.5 h-2.5" />manual</> : <><Bot className="w-2.5 h-2.5" />AI</>}
                                                </span>
                                            )}
                                            <span className="spfont text-zinc-300">·</span>
                                            <span className="spfontm">{new Date(msg.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>

                                        <div className={"flex flex-col " + (msg.role === 'model' ? 'items-end' : 'items-start')}>
                                            {replySource && (
                                                <div className="reply-preview-clickable mb-1 px-3 py-1.5 rounded-xl text-xs w-full bg-zinc-900 border-l-2 border-zinc-500 text-zinc-400 truncate"
                                                    title="Klik untuk melihat pesan asli" onClick={() => scrollToMessage(msg.replyTo)}>
                                                    <span className="spfontsb text-zinc-500 font-semibold mr-1">{replySource.role === 'user' ? 'Pia' : 'Adam'}:</span>
                                                    <span className="spfontr">{replySource.content.length > 80 ? replySource.content.slice(0, 80) + '…' : replySource.content}</span>
                                                </div>
                                            )}
                                            <div className="relative group">
                                                <div className={"inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed " + (isUser ? 'bg-zinc-700 text-zinc-100' : msg.manual ? 'bg-zinc-800 border border-zinc-600 text-zinc-200' : 'bg-zinc-800 text-zinc-300')}>
                                                    <p className="spfontr tracking-wide whitespace-pre-wrap break-words">{msg.content}</p>
                                                </div>

                                                {activeEmojiPicker === msg.id && (
                                                    <div className="emoji-picker" style={{ bottom: '2.5rem', left: isUser ? '-1rem' : 'auto', right: !isUser ? '-1rem' : 'auto' }}>
                                                        {EMOJIS.map(({ emoji, label }) => <button key={label} className="emoji-btn-item" title={label} onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>)}
                                                    </div>
                                                )}
                                                <button className="react-btn absolute -bottom-1 flex items-center justify-center w-8 h-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg p-1 transition-all"
                                                    style={{ [isUser ? 'right' : 'left']: '-2.5rem' }} title="React"
                                                    onClick={() => setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id)}>
                                                    <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>☻</span>
                                                </button>
                                                <button className="reply-btn absolute -bottom-1 flex items-center justify-center w-8 h-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg p-1 transition-all"
                                                    style={{ [isUser ? 'right' : 'left']: '-1.5rem' }} title="Reply"
                                                    onClick={() => { setReplyingTo({ id: msg.id, content: msg.content, role: msg.role }); textareaRef.current?.focus(); }}>
                                                    <CornerUpLeft className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {(adminReactions[msg.id] || userReactions[msg.id]) && (
                                                <div className={"flex gap-1 mt-1 " + (isUser ? 'justify-start' : 'justify-end')}>
                                                    {adminReactions[msg.id] && <button className="reaction-badge" onClick={() => handleReaction(msg.id, adminReactions[msg.id])} title="Klik untuk hapus">{adminReactions[msg.id]}</button>}
                                                    {userReactions[msg.id] && <span className="reaction-badge-readonly" title="Reaction Pia (readonly)">{userReactions[msg.id]}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>


                {showScrollBtn && (
                    <button className="back-to-bottom-admin" onClick={handleBackToBottom}>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Ke bawah
                    </button>
                )}
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
                            <span className="text-zinc-500 font-semibold mr-1">{replyingTo.role === 'user' ? 'Pia' : 'Adam'}:</span>
                            {replyingTo.content.length > 80 ? replyingTo.content.slice(0, 80) + '…' : replyingTo.content}
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-0.5 text-zinc-600 hover:text-zinc-300 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}
                <div className="flex items-end gap-2 px-4 py-3">
                    <textarea ref={textareaRef} value={manualMessage} onChange={(e) => setManualMessage(e.target.value)} onKeyPress={handleManualMessageKeyPress}
                        placeholder="..." className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 resize-none"
                        rows="1" disabled={sendingMessage} style={{ maxHeight: '120px' }} />
                    <button onClick={sendManualMessage} disabled={sendingMessage || !manualMessage.trim()}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                        {sendingMessage ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
