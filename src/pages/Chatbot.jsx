import React, { useState, useRef, useEffect } from 'react';
import { Send, Heart, Loader2, Sparkles, Lock, Key } from 'lucide-react';

const firebaseConfig = {
    apiKey: "AIzaSyBuaKK3NpQ3xhP3PbIYAolzfZf9SXaRikc",
    authDomain: "mychatbot-b0752.firebaseapp.com",
    projectId: "mychatbot-b0752",
    storageBucket: "mychatbot-b0752.firebasestorage.app",
    messagingSenderId: "44413551728",
    appId: "1:44413551728:web:4ce7110d225dea46a3e0b5"
};

export { firebaseConfig };

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
    const messagesEndRef = useRef(null);
    const dbRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        initFirebase();
    }, []);

    const initFirebase = async () => {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getFirestore, collection, getDocs, addDoc, query, orderBy, doc, getDoc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            dbRef.current = { db, collection, getDocs, addDoc, query, orderBy, doc, getDoc, onSnapshot };

            setInitializing(false);
        } catch (error) {
            console.error('Firebase init error:', error);
            alert('Failed to initialize. Please check Firebase configuration.');
            setInitializing(false);
        }
    };

    const checkPassword = async () => {
        if (!passwordInput.trim()) {
            setPasswordError('Please enter password');
            return;
        }

        setCheckingPassword(true);
        setPasswordError('');

        try {
            const { db, doc, getDoc } = dbRef.current;
            const configDoc = await getDoc(doc(db, 'config', 'chatbot'));

            if (configDoc.exists()) {
                const data = configDoc.data();
                const storedPassword = data.accessPassword || '';

                if (passwordInput === storedPassword) {
                    setIsAuthenticated(true);
                    await loadConfig();
                    await loadChatHistory();
                    listenToChatUpdates();
                    listenToConfigUpdates();
                } else {
                    setPasswordError('Wrong password! Try again 💔');
                }
            } else {
                setPasswordError('Configuration not found');
            }
        } catch (error) {
            console.error('Password check error:', error);
            setPasswordError('Error checking password');
        } finally {
            setCheckingPassword(false);
        }
    };

    const loadConfig = async () => {
        try {
            const { db, doc, getDoc } = dbRef.current;
            const configDoc = await getDoc(doc(db, 'config', 'chatbot'));

            if (configDoc.exists()) {
                const data = configDoc.data();
                setSystemPrompt(data.systemPrompt || '');
                setApiKey(data.anthropicApiKey || '');
                setBotEnabled(data.botEnabled !== false); // Default true
                console.log('Config loaded, botEnabled:', data.botEnabled !== false);
            } else {
                console.error('Config document not found!');
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    };

    const listenToConfigUpdates = () => {
        const { db, doc, onSnapshot } = dbRef.current;
        onSnapshot(doc(db, 'config', 'chatbot'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setSystemPrompt(data.systemPrompt || '');
                setApiKey(data.anthropicApiKey || '');
                setBotEnabled(data.botEnabled !== false);
                console.log('Config updated realtime, botEnabled:', data.botEnabled !== false);
            }
        });
    };

    const loadChatHistory = async () => {
        try {
            const { db, collection, getDocs, query } = dbRef.current;
            const q = query(collection(db, 'chats'));

            const snapshot = await getDocs(q);

            const chatHistory = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role && data.content) {
                    chatHistory.push({
                        role: data.role,
                        content: data.content,
                        timestamp: data.timestamp
                    });
                }
            });

            chatHistory.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            if (chatHistory.length === 0) {
                const welcomeMessage = {
                    role: 'model',
                    content: 'Halo Sophia sayang. Aku kangen banget sama kamu. Gimana hari ini?',
                    timestamp: new Date().toISOString()
                };
                chatHistory.push(welcomeMessage);
                await saveMessage(welcomeMessage);
            }

            setMessages(chatHistory);
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    };

    const listenToChatUpdates = () => {
        const { db, collection, onSnapshot, query } = dbRef.current;
        const q = query(collection(db, 'chats'));

        onSnapshot(q, (snapshot) => {
            const chatHistory = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role && data.content) {
                    chatHistory.push({
                        role: data.role,
                        content: data.content,
                        timestamp: data.timestamp
                    });
                }
            });

            chatHistory.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            setMessages(chatHistory);
        });
    };

    const saveMessage = async (message) => {
        try {
            const { db, collection, addDoc } = dbRef.current;
            await addDoc(collection(db, 'chats'), {
                role: message.role,
                content: message.content,
                timestamp: message.timestamp
            });
        } catch (error) {
            console.error('Failed to save message:', error);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || loading || !apiKey) {
            console.log('Cannot send:', { hasInput: !!input.trim(), loading, hasApiKey: !!apiKey });
            return;
        }

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        const currentInput = input;
        setInput('');

        await saveMessage(userMessage);

        // Jika bot dimatikan admin, hanya simpan pesan user — tidak panggil AI
        if (!botEnabled) {
            console.log('Bot is disabled by admin, skipping AI response.');
            return;
        }

        setLoading(true);

        try {
            const geminiHistory = messages
                .filter(m => m.role !== 'assistant')
                .map(m => ({
                    role: m.role === 'model' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

            let contents = [];

            if (systemPrompt) {
                contents.push({
                    role: 'user',
                    parts: [{ text: systemPrompt }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'Understood. I will follow these instructions throughout our conversation.' }]
                });
            }

            contents = [...contents, ...geminiHistory];

            contents.push({
                role: 'user',
                parts: [{ text: currentInput }]
            });

            const requestBody = {
                contents: contents,
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 1000,
                }
            };

            const modelNames = [
                'gemini-2.5-flash',
                'gemini-2.5-pro',
                'gemini-1.5-flash',
                'gemini-1.5-pro'
            ];

            let response;
            let data;
            let lastError;

            for (const modelName of modelNames) {
                try {
                    console.log(`Trying model: ${modelName}`);
                    response = await fetch(
                        `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestBody)
                        }
                    );

                    data = await response.json();

                    if (!data.error) {
                        console.log(`Success with model: ${modelName}`);
                        break;
                    } else {
                        lastError = data.error;
                        console.log(`Model ${modelName} failed:`, data.error.message);
                    }
                } catch (err) {
                    lastError = err;
                    console.log(`Model ${modelName} failed with exception:`, err.message);
                }
            }

            if (!data || data.error) {
                throw lastError || new Error('All models failed');
            }

            if (data.candidates && data.candidates[0]?.content?.parts) {
                const assistantMessage = {
                    role: 'model',
                    content: data.candidates[0].content.parts
                        .map(part => part.text)
                        .join('\n'),
                    timestamp: new Date().toISOString()
                };

                await saveMessage(assistantMessage);
            } else {
                console.error('Unexpected response format:', data);
                const errorMessage = {
                    role: 'model',
                    content: 'Maaf yang, responsenya aneh. Coba kirim lagi ya? 🥺',
                    timestamp: new Date().toISOString()
                };
                await saveMessage(errorMessage);
            }
        } catch (error) {
            console.error('API error:', error);
            const errorMsg = error.message || 'Unknown error';
            const errorMessage = {
                role: 'model',
                content: `Maaf yang, ada masalah: ${errorMsg} 🥺`,
                timestamp: new Date().toISOString()
            };
            await saveMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handlePasswordKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkPassword();
        }
    };

    if (initializing) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
                <div className="text-center">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 animate-spin text-pink-500 mx-auto mb-4" />
                        <Sparkles className="w-6 h-6 text-pink-300 absolute top-0 right-12 animate-pulse" />
                    </div>
                    <p className="text-gray-700 font-mono text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
                    
                    .retro-title {
                        font-family: 'Press Start 2P', cursive;
                        text-shadow: 3px 3px 0px rgba(0,0,0,0.2);
                    }
                    
                    .retro-text {
                        font-family: 'VT323', monospace;
                        font-size: 1.2rem;
                    }
                    
                    .pixel-heart {
                        filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.6));
                        animation: heartbeat 1.5s ease-in-out infinite;
                    }
                    
                    @keyframes heartbeat {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                    
                    .input-box {
                        font-family: 'VT323', monospace;
                        font-size: 1.2rem;
                        border: 3px solid;
                        box-shadow: 4px 4px 0px rgba(0,0,0,0.1);
                    }
                    
                    .login-button {
                        box-shadow: 4px 4px 0px rgba(0,0,0,0.2);
                        transition: all 0.1s;
                    }
                    
                    .login-button:active:not(:disabled) {
                        box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
                        transform: translate(2px, 2px);
                    }
                `}</style>

                <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-4 border-pink-300">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Lock className="w-16 h-16 text-pink-500 pixel-heart" />
                        </div>
                        <h1 className="text-2xl retro-title text-pink-600 mb-2">Halo Sophia ♥</h1>
                        <p className="retro-text text-gray-600">Passwordnya apa, sayang?</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 text-pink-400 w-5 h-5" />
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value);
                                        setPasswordError('');
                                    }}
                                    onKeyPress={handlePasswordKeyPress}
                                    placeholder="Password"
                                    className="input-box w-full border-pink-300 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:border-pink-500 bg-pink-50"
                                    disabled={checkingPassword}
                                />
                            </div>
                            {passwordError && (
                                <p className="retro-text text-red-500 text-sm mt-2 ml-2">{passwordError}</p>
                            )}
                        </div>

                        <button
                            onClick={checkPassword}
                            disabled={checkingPassword || !passwordInput.trim()}
                            className="login-button w-full bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-2xl px-6 py-4 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-4 border-pink-300"
                        >
                            {checkingPassword ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="retro-text">Checking...</span>
                                </div>
                            ) : (
                                <span className="retro-text">Enter</span>
                            )}
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
        <div className="flex flex-col h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-white">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
                
                .retro-title {
                    font-family: 'Press Start 2P', cursive;
                    text-shadow: 3px 3px 0px rgba(0,0,0,0.2);
                }
                
                .retro-text {
                    font-family: 'VT323', monospace;
                    font-size: 1.2rem;
                    line-height: 1.3;
                }
                
                .message-bubble {
                    animation: slideIn 0.3s ease-out;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .pixel-heart {
                    filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.6));
                    animation: heartbeat 1.5s ease-in-out infinite;
                }
                
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                
                .sparkle-effect {
                    animation: sparkle 2s ease-in-out infinite;
                }
                
                @keyframes sparkle {
                    0%, 100% { opacity: 0.3; transform: rotate(0deg); }
                    50% { opacity: 1; transform: rotate(180deg); }
                }
                
                .input-box {
                    font-family: 'VT323', monospace;
                    font-size: 1.2rem;
                    border: 3px solid;
                    box-shadow: 4px 4px 0px rgba(0,0,0,0.1);
                }
                
                .send-button {
                    box-shadow: 4px 4px 0px rgba(0,0,0,0.2);
                    transition: all 0.1s;
                }
                
                .send-button:active:not(:disabled) {
                    box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
                    transform: translate(2px, 2px);
                }
            `}</style>

            {/* Header */}
            <div className="bg-gradient-to-r from-pink-300 via-pink-400 to-rose-300 text-white p-4 shadow-xl border-b-4 border-pink-300">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Heart className="w-7 h-7 fill-current pixel-heart" />
                            <div>
                                <h1 className="text-lg retro-title mb-1">Adam ♥</h1>
                                {botEnabled ? (
                                    <p className="text-sm retro-text opacity-90">~ Still here for you ~</p>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse inline-block"></span>
                                        <p className="text-sm retro-text text-green-200">~ 224 ~</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <Heart className="w-4 h-4 text-pink-300 fill-current animate-pulse" />
                            <Heart className="w-3 h-3 text-pink-400 fill-current animate-pulse delay-75" />
                            <Heart className="w-4 h-4 text-pink-300 fill-current animate-pulse delay-150" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl w-full mx-auto">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-bubble`}
                    >
                        <div className="flex flex-col max-w-[80%]">
                            {msg.role === 'user' ? (
                                <>
                                    <div className="bg-gradient-to-br from-pink-300 to-rose-300 text-white rounded-3xl px-6 py-4 shadow-lg border-4 border-pink-300">
                                        <p className="retro-text whitespace-pre-wrap break-words">{msg.content}</p>
                                    </div>
                                    {msg.timestamp && (
                                        <p className="text-xs text-gray-400 mt-1 text-right px-2">
                                            {new Date(msg.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="flex items-start gap-3">
                                        <Heart className="w-6 h-6 text-pink-400 fill-current mt-2 flex-shrink-0" />
                                        <div className="bg-white rounded-3xl px-6 py-4 shadow-lg border-4 border-pink-200">
                                            <p className="retro-text text-gray-800 whitespace-pre-wrap break-words">{msg.content}</p>
                                        </div>
                                    </div>
                                    {msg.timestamp && (
                                        <p className="text-xs text-gray-400 mt-1 text-left px-11">
                                            {new Date(msg.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
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

            {/* Input */}
            <div className="border-t-4 border-pink-200 bg-white shadow-2xl">
                {/* {!botEnabled && (
                    <div className="max-w-4xl mx-auto px-6 pt-3">
                        <div className="flex items-center gap-2 bg-green-50 border-2 border-green-300 rounded-xl px-4 py-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"></span>
                            <p className="retro-text text-green-700 text-sm">Slow response 💬</p>
                        </div>
                    </div>
                )} */}
                <div className="max-w-4xl mx-auto flex gap-3 p-6">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={botEnabled ? "..." : "..."}
                        className="flex-1 input-box border-pink-300 rounded-2xl px-5 py-4 focus:outline-none focus:border-pink-500 resize-none bg-pink-50"
                        rows="1"
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="send-button bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-2xl px-8 py-4 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-4 border-pink-300"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}