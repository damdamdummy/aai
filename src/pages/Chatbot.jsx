import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Heart, Loader2, Sparkles, Lock, Key, CornerUpLeft, X, ChevronDown } from 'lucide-react';

const firebaseConfig = {
    apiKey: "AIzaSyBuaKK3NpQ3xhP3PbIYAolzfZf9SXaRikc",
    authDomain: "mychatbot-b0752.firebaseapp.com",
    projectId: "mychatbot-b0752",
    storageBucket: "mychatbot-b0752.firebasestorage.app",
    messagingSenderId: "44413551728",
    appId: "1:44413551728:web:4ce7110d225dea46a3e0b5"
};

export { firebaseConfig };

const PAGE_SIZE = 100;
const AI_CONTEXT_LIMIT = 20;

const BOTTOM_THRESHOLD = 120;

export default function AdamChatbot() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [initializing, setInitializing] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [checkingPassword, setCheckingPassword] = useState(false);
    const [botEnabled, setBotEnabled] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [userReactions, setUserReactions] = useState({});
    const [adminReactions, setAdminReactions] = useState({});
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
    const dbRef = useRef(null);
    const textareaRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const unsubscribeRef = useRef(null);
    const messageRefsMap = useRef({});


    const hasMoreRef = useRef(true);
    const loadingOlderRef = useRef(false);
    const lastDocRef = useRef(null);


    const autoScrollRef = useRef(true);

    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { loadingOlderRef.current = loadingOlder; }, [loadingOlder]);

    const registerMessageRef = useCallback((id, el) => {
        if (el) messageRefsMap.current[id] = el;
        else delete messageRefsMap.current[id];
    }, []);


    const isNearBottom = () => {
        const c = messagesContainerRef.current;
        if (!c) return true;
        return c.scrollHeight - c.scrollTop - c.clientHeight < BOTTOM_THRESHOLD;
    };

    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };


    const handleBackToBottom = () => {
        autoScrollRef.current = true;
        setShowScrollBtn(false);
        scrollToBottom('smooth');
    };

    const handleInputFocus = () => {
        setTimeout(() => {
            if (autoScrollRef.current) scrollToBottom('smooth');
        }, 400);
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
                const fetched = { id: snap.id, role: data.role, content: data.content, timestamp: data.timestamp, replyTo: data.replyTo || null };
                setMessages(prev => prev.find(m => m.id === targetId) ? prev : [fetched, ...prev]);
                setTimeout(() => {
                    const elAfter = messageRefsMap.current[targetId];
                    if (elAfter) {
                        elAfter.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setHighlightedMessageId(targetId);
                        setTimeout(() => setHighlightedMessageId(null), 1800);
                    }
                }, 150);
            } catch (err) {
                console.warn('[scrollToMessage] tidak ditemukan:', targetId, err);
            }
        }
    }, []);


    useEffect(() => {
        if (loadingOlderRef.current) return;
        if (!autoScrollRef.current) return;
        scrollToBottom('smooth');
    }, [messages]);


    const loadOlderChatsRef = useRef(null);

    const onScrollHandler = useCallback(() => {
        const c = messagesContainerRef.current;
        if (!c) return;

        const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < BOTTOM_THRESHOLD;


        autoScrollRef.current = nearBottom;
        setShowScrollBtn(!nearBottom);


        if (c.scrollTop < 100) {
            loadOlderChatsRef.current?.();
        }
    }, []);


    useEffect(() => {
        if (!activeEmojiPicker) return;
        const handler = (e) => {
            if (!e.target.closest('.pia-emoji-picker') && !e.target.closest('.pia-react-btn')) {
                setActiveEmojiPicker(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activeEmojiPicker]);

    useEffect(() => { initFirebase(); }, []);
    useEffect(() => () => { unsubscribeRef.current?.(); }, []);


    useEffect(() => {
        if (!isAuthenticated) return;

        const tryAttach = () => {
            const c = messagesContainerRef.current;
            if (!c) return false;
            c.addEventListener('scroll', onScrollHandler, { passive: true });
            return true;
        };


        if (tryAttach()) return () => messagesContainerRef.current?.removeEventListener('scroll', onScrollHandler);


        const interval = setInterval(() => {
            if (tryAttach()) clearInterval(interval);
        }, 50);
        const timeout = setTimeout(() => clearInterval(interval), 500);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
            messagesContainerRef.current?.removeEventListener('scroll', onScrollHandler);
        };
    }, [isAuthenticated, onScrollHandler]);


    const initFirebase = async () => {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const {
                getFirestore, collection, getDocs, addDoc, query,
                orderBy, limit, startAfter, doc, getDoc,
                onSnapshot, updateDoc, connectFirestoreEmulator
            } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            if (window.location.hostname === 'localhost') connectFirestoreEmulator(db, 'localhost', 8080);

            dbRef.current = { db, collection, getDocs, addDoc, query, orderBy, limit, startAfter, doc, getDoc, onSnapshot, updateDoc };
            setInitializing(false);
        } catch (err) {
            console.error('Firebase init error:', err);
            alert('Failed to initialize Firebase.');
            setInitializing(false);
        }
    };


    const checkPassword = async () => {
        if (!passwordInput.trim()) { setPasswordError('Please enter password'); return; }
        setCheckingPassword(true);
        setPasswordError('');
        try {
            const { db, doc, getDoc } = dbRef.current;
            const configDoc = await getDoc(doc(db, 'config', 'chatbot'));
            if (!configDoc.exists()) { setPasswordError('Configuration not found'); return; }
            const data = configDoc.data();
            if (passwordInput !== (data.accessPassword || '')) {
                setPasswordError('Salah! Kau Sophia atau bukan? 😠🫵🏻');
                return;
            }
            setIsAuthenticated(true);
            await loadConfig();
            await loadInitialChats();
            startRealtimeListener();
            listenToConfigUpdates();
        } catch (err) {
            setPasswordError('Error checking password');
        } finally {
            setCheckingPassword(false);
        }
    };

    const loadConfig = async () => {
        try {
            const { db, doc, getDoc } = dbRef.current;
            const snap = await getDoc(doc(db, 'config', 'chatbot'));
            if (snap.exists()) {
                const data = snap.data();
                setSystemPrompt(data.systemPrompt || '');
                setApiKey(data.anthropicApiKey || '');
                setBotEnabled(data.botEnabled !== false);
            }
        } catch (err) { console.error('Failed to load config:', err); }
    };

    const listenToConfigUpdates = () => {
        const { db, doc, onSnapshot } = dbRef.current;
        onSnapshot(doc(db, 'config', 'chatbot'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setSystemPrompt(data.systemPrompt || '');
                setApiKey(data.anthropicApiKey || '');
                setBotEnabled(data.botEnabled !== false);
            }
        });
    };


    const loadInitialChats = async () => {
        try {
            const { db, collection, getDocs, query, orderBy, limit } = dbRef.current;
            const q = query(collection(db, 'chats'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs;

            if (docs.length === 0) {
                const welcome = { role: 'model', content: 'Halo Sophia sayang. Aku kangen banget sama kamu. Gimana hari ini?', timestamp: new Date().toISOString() };
                const savedId = await saveMessage(welcome);
                setMessages([{ ...welcome, id: savedId, replyTo: null }]);
                setHasMore(false); hasMoreRef.current = false;
                return;
            }

            lastDocRef.current = docs[docs.length - 1];
            const hasMorePages = docs.length === PAGE_SIZE;
            setHasMore(hasMorePages); hasMoreRef.current = hasMorePages;

            const chatHistory = docs
                .map(d => { const data = d.data(); return { id: d.id, role: data.role, content: data.content, timestamp: data.timestamp, replyTo: data.replyTo || null }; })
                .filter(m => m.role && m.content)
                .reverse();

            const userMap = {}, adminMap = {};
            docs.forEach(d => {
                const data = d.data();
                if (data.userReaction) userMap[d.id] = data.userReaction;
                if (data.adminReaction) adminMap[d.id] = data.adminReaction;
            });

            setMessages(chatHistory);
            setUserReactions(userMap);
            setAdminReactions(adminMap);
        } catch (err) { console.error('Failed to load initial chats:', err); }
    };


    const loadOlderChats = async () => {
        if (loadingOlderRef.current || !hasMoreRef.current || !lastDocRef.current) return;

        loadingOlderRef.current = true;
        setLoadingOlder(true);

        const container = messagesContainerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;

        try {
            const { db, collection, getDocs, query, orderBy, limit, startAfter } = dbRef.current;
            const q = query(collection(db, 'chats'), orderBy('timestamp', 'desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs;

            if (docs.length === 0) {
                setHasMore(false); hasMoreRef.current = false;
                return;
            }

            lastDocRef.current = docs[docs.length - 1];
            const hasMorePages = docs.length === PAGE_SIZE;
            setHasMore(hasMorePages); hasMoreRef.current = hasMorePages;

            const olderMessages = docs
                .map(d => { const data = d.data(); return { id: d.id, role: data.role, content: data.content, timestamp: data.timestamp, replyTo: data.replyTo || null }; })
                .filter(m => m.role && m.content)
                .reverse();

            const userMap = {}, adminMap = {};
            docs.forEach(d => {
                const data = d.data();
                if (data.userReaction) userMap[d.id] = data.userReaction;
                if (data.adminReaction) adminMap[d.id] = data.adminReaction;
            });

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const fresh = olderMessages.filter(m => !existingIds.has(m.id));
                return fresh.length > 0 ? [...fresh, ...prev] : prev;
            });
            setUserReactions(prev => ({ ...userMap, ...prev }));
            setAdminReactions(prev => ({ ...adminMap, ...prev }));


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
            const snapMessages = [], userMap = {}, adminMap = {};
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (!data.role || !data.content) return;
                snapMessages.push({ id: docSnap.id, role: data.role, content: data.content, timestamp: data.timestamp, replyTo: data.replyTo || null });
                if (data.userReaction) userMap[docSnap.id] = data.userReaction;
                if (data.adminReaction) adminMap[docSnap.id] = data.adminReaction;
            });
            snapMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const updated = prev.map(m => { const s = snapMessages.find(x => x.id === m.id); return s ? { ...m, content: s.content, replyTo: s.replyTo } : m; });
                const newOnes = snapMessages.filter(m => !existingIds.has(m.id));
                return newOnes.length > 0 ? [...updated, ...newOnes] : updated;
            });
            setUserReactions(prev => ({ ...prev, ...userMap }));
            setAdminReactions(prev => ({ ...prev, ...adminMap }));
        });
        unsubscribeRef.current = unsubscribe;
    };


    const saveMessage = async (message) => {
        try {
            const { db, collection, addDoc } = dbRef.current;
            const payload = { role: message.role, content: message.content, timestamp: message.timestamp };
            if (message.replyTo) payload.replyTo = message.replyTo;
            const docRef = await addDoc(collection(db, 'chats'), payload);
            return docRef.id;
        } catch (err) { console.error('Failed to save message:', err); return null; }
    };

    const sendMessage = async () => {
        if (!input.trim() || loading || !apiKey) return;
        const userMessage = { role: 'user', content: input, timestamp: new Date().toISOString(), replyTo: replyingTo ? replyingTo.id : null };
        const currentInput = input;
        setInput('');
        setReplyingTo(null);

        autoScrollRef.current = true;
        setShowScrollBtn(false);
        await saveMessage(userMessage);
        if (!botEnabled) return;

        setLoading(true);
        try {
            const recentMessages = messages.slice(-AI_CONTEXT_LIMIT);
            const geminiHistory = recentMessages.filter(m => m.role !== 'assistant').map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.content }] }));
            let contents = [];
            if (systemPrompt) {
                contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
                contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions throughout our conversation.' }] });
            }
            contents = [...contents, ...geminiHistory, { role: 'user', parts: [{ text: currentInput }] }];
            const requestBody = { contents, generationConfig: { temperature: 0.9, maxOutputTokens: 1000 } };
            const modelNames = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
            let data, lastError;
            for (const modelName of modelNames) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
                    data = await res.json();
                    if (!data.error) break;
                    lastError = data.error;
                } catch (err) { lastError = err; }
            }
            if (!data || data.error) throw lastError || new Error('All models failed');
            await saveMessage({
                role: 'model',
                content: data.candidates?.[0]?.content?.parts ? data.candidates[0].content.parts.map(p => p.text).join('\n') : 'Maaf yang, responsenya aneh. Coba kirim lagi ya? 🥺',
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            await saveMessage({ role: 'model', content: `Maaf yang, ada masalah: ${err.message || 'Unknown error'} 🥺`, timestamp: new Date().toISOString() });
        } finally { setLoading(false); }
    };

    const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    const handlePasswordKeyPress = (e) => { if (e.key === 'Enter') { e.preventDefault(); checkPassword(); } };

    const handleReaction = async (msgId, emoji) => {
        setActiveEmojiPicker(null);
        try {
            const { db, doc, updateDoc } = dbRef.current;
            const current = userReactions[msgId];
            const next = current === emoji ? null : emoji;
            await updateDoc(doc(db, 'chats', msgId), { userReaction: next || null });
            setUserReactions(prev => ({ ...prev, [msgId]: next }));
        } catch (err) { console.error('Failed to update reaction:', err); }
    };

    const getReplySource = (id) => messages.find(m => m.id === id) || null;


    if (initializing) {
        return (
            <div className="app-shell flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
                <style>{`
                    .app-shell { position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100dvh; overflow: hidden; display: flex; flex-direction: column; }
                `}</style>
                <div className="text-center">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 animate-spin text-pink-500 mx-auto mb-4" />
                    </div>

                </div>
            </div>
        );
    }


    if (!isAuthenticated) {
        return (
            <div className="app-shell flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 px-2">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
                    .app-shell { position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100dvh; overflow: hidden; display: flex; flex-direction: column; }
                    .retro-title { font-family: 'Press Start 2P', cursive; text-shadow: 3px 3px 0px rgba(0,0,0,0.2); }
                    .retro-text { font-family: 'VT323', monospace; font-size: 1.2rem; }
                    .pixel-heart { filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.6)); animation: heartbeat 1.5s ease-in-out infinite; }
                    @keyframes heartbeat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                    .input-box { font-family: 'VT323', monospace; font-size: 1.2rem; border: 3px solid; box-shadow: 4px 4px 0px rgba(0,0,0,0.1); }
                    .login-button { box-shadow: 4px 4px 0px rgba(0,0,0,0.2); transition: all 0.1s; }
                    .login-button:active:not(:disabled) { box-shadow: 2px 2px 0px rgba(0,0,0,0.2); transform: translate(2px, 2px); }
                `}</style>
                <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-4 border-pink-300">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4"><Lock className="w-16 h-16 text-pink-500 pixel-heart" /></div>
                        <h1 className="text-xl retro-title text-pink-600 mb-2">Halo Sophia ♥</h1>
                        <p className="retro-text text-gray-600">Passwordnya apa, sayang?</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 text-pink-400 w-5 h-5" />
                                <input type="password" value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }} onKeyPress={handlePasswordKeyPress} placeholder="Password"
                                    className="input-box w-full border-pink-300 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:border-pink-500 bg-pink-50" disabled={checkingPassword} />
                            </div>
                            {passwordError && <p className="retro-text text-red-500 text-sm mt-2 ml-2">{passwordError}</p>}
                        </div>
                        <button onClick={checkPassword} disabled={checkingPassword || !passwordInput.trim()}
                            className="login-button w-full bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-2xl px-6 py-4 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-4 border-pink-300">
                            {checkingPassword ? <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span className="retro-text">Checking...</span></div> : <span className="retro-text">Enter</span>}
                        </button>
                    </div>
                    <div className="mt-6 text-center">
                        <div className="flex justify-center gap-1">
                            <Heart className="w-4 h-4 text-pink-400 fill-current animate-pulse" />
                            <Heart className="w-3 h-3 text-pink-500 fill-current animate-pulse delay-75" />
                            <Heart className="w-4 h-4 text-pink-400 fill-current animate-pulse delay-150" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="app-shell flex flex-col bg-gradient-to-br from-pink-50 via-rose-50 to-white">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
                html, body, #root { height: 100%; margin: 0; padding: 0; overflow: hidden; }
                .app-shell { position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100dvh; overflow: hidden; display: flex; flex-direction: column; }
                .retro-title { font-family: 'Press Start 2P', cursive; text-shadow: 3px 3px 0px rgba(0,0,0,0.2); }
                .retro-text { font-family: 'VT323', monospace; font-size: 1.2rem; line-height: 1.3; }
                .message-bubble { animation: slideIn 0.3s ease-out; }
                @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .pixel-heart { filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.6)); animation: heartbeat 1.5s ease-in-out infinite; }
                @keyframes heartbeat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                .input-box { font-family: 'VT323', monospace; font-size: 1.2rem; border: 3px solid; box-shadow: 4px 4px 0px rgba(0,0,0,0.1); }
                .send-button { box-shadow: 4px 4px 0px rgba(0,0,0,0.2); transition: all 0.1s; }
                .send-button:active:not(:disabled) { box-shadow: 2px 2px 0px rgba(0,0,0,0.2); transform: translate(2px, 2px); }
                .msg-row { position: relative; }
                .reply-btn { opacity: 0; transition: opacity 0.15s ease; }
                .pia-react-btn { opacity: 0; transition: opacity 0.15s ease; }
                .msg-row:hover .reply-btn { opacity: 1; }
                .msg-row:hover .pia-react-btn { opacity: 1; }
                .pia-emoji-picker {
                    display: flex; gap: 2px; background: #fff0f5; border: 3px solid #f9a8d4;
                    border-radius: 999px; padding: 4px 7px; position: absolute; bottom: 2rem;
                    right: 0; left: auto; max-width: 90vw; width: max-content; z-index: 50;
                    box-shadow: 4px 4px 0px rgba(0,0,0,0.1); animation: piaPop 0.12s ease; white-space: nowrap;
                }
                @keyframes piaPop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
                .pia-emoji-item {
                    font-size: 1.15rem; cursor: pointer; border-radius: 50%; width: 30px; height: 30px;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.1s, transform 0.1s; border: none; background: transparent;
                }
                .pia-emoji-item:hover { background: #fce7f3; transform: scale(1.25); }
                .pia-reaction-badge {
                    font-family: 'VT323', monospace; font-size: 1rem; background: #fff0f5;
                    border: 2px solid #f9a8d4; border-radius: 999px; padding: 1px 8px; cursor: pointer;
                    transition: border-color 0.15s, transform 0.1s; line-height: 1.4; user-select: none;
                    display: inline-block; margin-top: 4px; box-shadow: 2px 2px 0px rgba(0,0,0,0.08);
                }
                .pia-reaction-badge:hover { border-color: #ec4899; transform: scale(1.08); }
                .admin-reaction-badge {
                    font-family: 'VT323', monospace; font-size: 1rem; background: #fdf2f8;
                    border: 2px dashed #f9a8d4; border-radius: 999px; padding: 1px 8px; cursor: default;
                    line-height: 1.4; user-select: none; display: inline-block; margin-top: 4px; opacity: 0.6;
                }
                .reply-preview {
                    font-family: 'VT323', monospace; font-size: 1rem; border-left: 3px solid;
                    padding: 4px 8px; margin-bottom: 6px; border-radius: 6px; display: block;
                    max-width: 100%; width: 0; min-width: 100%; overflow: hidden;
                    white-space: nowrap; text-overflow: ellipsis; cursor: pointer; transition: opacity 0.15s;
                }
                .reply-preview:hover { opacity: 0.72; }
                .msg-highlight { animation: highlightPulse 1.8s ease-out forwards; border-radius: 16px; }
                @keyframes highlightPulse {
                    0%   { background-color: rgba(236, 72, 153, 0.18); }
                    60%  { background-color: rgba(236, 72, 153, 0.10); }
                    100% { background-color: transparent; }
                }
       
                .back-to-bottom {
                    position: absolute;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 20;
                    display: flex; align-items: center; gap: 6px;
                    background: rgba(236, 72, 153, 0.7);
                    color: white;
                    border: none; border-radius: 999px;
                    padding: 6px 16px 6px 12px;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(236, 72, 153, 0.35);
                    font-family: 'VT323', monospace; font-size: 1rem;
                    transition: opacity 0.2s, transform 0.2s;
                    animation: fadeInUp 0.2s ease;
                }
                .back-to-bottom:hover { background: rgba(219, 39, 119, 0.95); transform: translateX(-50%) translateY(-2px); }
                @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            `}</style>

            {/* Header */}
            <div className="bg-gradient-to-r from-pink-300 via-pink-400 to-rose-300 text-white p-4 shadow-xl border-b-4 border-pink-300">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Heart className="w-7 h-7 fill-current pixel-heart" />
                        <div>
                            <h1 className="text-sm retro-title mb-0.5 flex items-center gap-1">
                                Adam Sayang
                                <img src="/kissingsmiley.png" alt="love" style={{ width: '1.5em', height: '1.5em', display: 'inline-block', verticalAlign: 'middle' }} />
                            </h1>
                            {botEnabled
                                ? <p className="text-xs retro-text opacity-90">~ Bot is activated ~</p>
                                : <p className="text-xs retro-text text-green-200">~ Unavailable ~</p>}
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <Heart className="w-3 h-3 text-pink-300 fill-current animate-pulse" />
                        <Heart className="w-2.5 h-2.5 text-pink-400 fill-current animate-pulse delay-75" />
                        <Heart className="w-3 h-3 text-pink-300 fill-current animate-pulse delay-150" />
                    </div>
                </div>
            </div>

            {/* Messages + floating button wrapper */}
            <div className="flex-1 min-h-0 relative">
                <div ref={messagesContainerRef} className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl w-full mx-auto">
                    {loadingOlder && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="w-5 h-5 animate-spin text-pink-300" />
                        </div>
                    )}
                    {!hasMore && messages.length > 0 && (
                        <p className="text-center retro-text text-gray-300 text-sm py-1">~ Awal percakapan ~</p>
                    )}

                    {messages.map((msg, idx) => {
                        const isUser = msg.role === 'user';
                        const replySource = msg.replyTo ? getReplySource(msg.replyTo) : null;
                        const isHighlighted = highlightedMessageId === msg.id;

                        return (
                            <div key={msg.id || idx}
                                ref={(el) => registerMessageRef(msg.id, el)}
                                className={`flex items-end gap-2 msg-row ${isUser ? 'justify-end' : 'justify-start'} message-bubble${isHighlighted ? ' msg-highlight' : ''}`}
                            >
                                {isUser && (
                                    <div className="flex items-center gap-1 mb-6 flex-shrink-0">
                                        <button className="pia-react-btn p-1.2 rounded-full text-pink-300 hover:text-pink-500 hover:bg-pink-100 transition-all" title="React"
                                            onClick={() => setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id)}>
                                            <span style={{ fontSize: '1rem', lineHeight: 0 }}>☻</span>
                                        </button>
                                        <button className="reply-btn p-1.2 rounded-full text-pink-300 hover:text-pink-500 hover:bg-pink-100 transition-all" title="Reply"
                                            onClick={() => { setReplyingTo({ id: msg.id, content: msg.content, role: msg.role }); textareaRef.current?.focus(); }}>
                                            <CornerUpLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-col max-w-[80%]">
                                    {isUser ? (
                                        <>
                                            {replySource && (
                                                <div className="reply-preview border-pink-300 bg-pink-50 text-pink-400 mb-1 w-full" title="Klik untuk melihat pesan asli" onClick={() => scrollToMessage(msg.replyTo)}>
                                                    <span className="font-bold mr-1">{replySource.role === 'user' ? 'Pia' : 'Adam'}:</span>{replySource.content}
                                                </div>
                                            )}
                                            <div className="relative">
                                                {activeEmojiPicker === msg.id && (
                                                    <div className="pia-emoji-picker">
                                                        {EMOJIS.map(({ emoji, label }) => <button key={label} className="pia-emoji-item" title={label} onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>)}
                                                    </div>
                                                )}
                                                <div className="bg-gradient-to-br from-pink-300 to-rose-300 text-white rounded-3xl px-6 py-4 shadow-lg border-4 border-pink-300">
                                                    <p className="retro-text whitespace-pre-wrap break-words">{msg.content}</p>
                                                </div>
                                            </div>
                                            {(userReactions[msg.id] || adminReactions[msg.id]) && (
                                                <div className="flex justify-end gap-1">
                                                    {adminReactions[msg.id] && <span className="admin-reaction-badge">{adminReactions[msg.id]}</span>}
                                                    {userReactions[msg.id] && <button className="pia-reaction-badge" onClick={() => handleReaction(msg.id, userReactions[msg.id])}>{userReactions[msg.id]}</button>}
                                                </div>
                                            )}
                                            {msg.timestamp && <p className="text-xs text-gray-400 mt-1 text-right px-2">{new Date(msg.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                                        </>
                                    ) : (
                                        <>
                                            {replySource && (
                                                <div className="reply-preview border-pink-300 bg-pink-50 text-pink-400 mb-1 w-full" title="Klik untuk melihat pesan asli" onClick={() => scrollToMessage(msg.replyTo)}>
                                                    <span className="font-bold mr-1">{replySource.role === 'user' ? 'Pia' : 'Adam'}:</span>{replySource.content}
                                                </div>
                                            )}
                                            <div className="flex items-start gap-3">
                                                <Heart className="w-6 h-6 text-pink-400 fill-current mt-2 flex-shrink-0" />
                                                <div className="relative">
                                                    {activeEmojiPicker === msg.id && (
                                                        <div className="pia-emoji-picker">
                                                            {EMOJIS.map(({ emoji, label }) => <button key={label} className="pia-emoji-item" title={label} onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>)}
                                                        </div>
                                                    )}
                                                    <div className="bg-white rounded-3xl px-6 py-4 shadow-lg border-4 border-pink-200">
                                                        <p className="retro-text text-gray-800 whitespace-pre-wrap break-words">{msg.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {(userReactions[msg.id] || adminReactions[msg.id]) && (
                                                <div className="flex justify-start pl-9 gap-1">
                                                    {adminReactions[msg.id] && <span className="admin-reaction-badge">{adminReactions[msg.id]}</span>}
                                                    {userReactions[msg.id] && <button className="pia-reaction-badge" onClick={() => handleReaction(msg.id, userReactions[msg.id])}>{userReactions[msg.id]}</button>}
                                                </div>
                                            )}
                                            {msg.timestamp && <p className="text-xs text-gray-400 mt-1 text-left px-11">{new Date(msg.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                                        </>
                                    )}
                                </div>

                                {!isUser && (
                                    <div className="flex items-center gap-1 mb-6 flex-shrink-0">
                                        <button className="reply-btn p-1.2 rounded-full text-pink-300 hover:text-pink-500 hover:bg-pink-100 transition-all" title="Reply"
                                            onClick={() => { setReplyingTo({ id: msg.id, content: msg.content, role: msg.role }); textareaRef.current?.focus(); }}>
                                            <CornerUpLeft className="w-4 h-4" />
                                        </button>
                                        <button className="pia-react-btn p-1.2 rounded-full text-pink-300 hover:text-pink-500 hover:bg-pink-100 transition-all" title="React"
                                            onClick={() => setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id)}>
                                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>☻</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="flex justify-start message-bubble">
                            <div className="flex items-center gap-3">
                                <Heart className="w-6 h-6 text-pink-400 fill-current" />
                                <div className="bg-white rounded-3xl px-6 py-4 shadow-lg border-4 border-pink-200">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-pink-400" />
                                        <span className="retro-text text-gray-600">typing...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {showScrollBtn && (
                    <button className="back-to-bottom" onClick={handleBackToBottom}>
                        <ChevronDown className="w-4 h-4" />
                        {/* Ke bawah */}
                    </button>
                )}
            </div>

            {/* Input area */}
            <div className="border-t-4 border-pink-200 bg-white shadow-2xl">
                {/* {botEnabled && (
                    <div className="max-w-4xl mx-auto px-4 pt-2">
                        <div className="flex items-center gap-2 bg-green-50 border-2 border-green-300 rounded-xl px-3 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0"></span>
                            <p className="retro-text text-green-700 text-sm">Bot is activated 💬</p>
                        </div>
                    </div>
                )} */}

                {replyingTo && (
                    <div className="max-w-4xl mx-auto px-4 pt-2">
                        <div className="flex items-center gap-2 bg-pink-50 border-2 border-pink-200 rounded-xl px-3 py-1.5">
                            <CornerUpLeft className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                            <p className="retro-text text-pink-500 flex-1 truncate text-sm">
                                <span className="font-bold mr-1">{replyingTo.role === 'user' ? 'Pia' : 'Adam'}:</span>
                                {replyingTo.content.length > 70 ? replyingTo.content.slice(0, 70) + '…' : replyingTo.content}
                            </p>
                            <button onClick={() => setReplyingTo(null)} className="text-pink-300 hover:text-pink-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                )}
                <div className="max-w-4xl mx-auto flex gap-2 px-4 py-3">
                    <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} onFocus={handleInputFocus}
                        placeholder="..." className="flex-1 input-box border-pink-300 rounded-xl px-4 py-2 focus:outline-none focus:border-pink-500 resize-none bg-pink-50" rows="1" disabled={loading} />
                    <button onClick={sendMessage} disabled={loading || !input.trim()}
                        className="send-button bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-xl px-5 py-2 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-4 border-pink-300">
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
