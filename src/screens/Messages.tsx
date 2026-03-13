import { useState, useEffect, useRef } from 'react';
import { Send, Search, RefreshCw, User, Check, CheckCheck } from 'lucide-react';
import { getAll, add, update, COLLECTIONS } from '../services/dbServices';
import { useUI } from '../context/UIContext';

interface Message {
    id?: string;
    residentEmail: string;
    residentName: string;
    senderRole: 'resident' | 'admin';
    text: string;
    createdAt?: any;
    read?: boolean;
}

export function Messages() {
    const [messages, setMessages] = useState<Message[]>([]);
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Derived states
    const [selectedResidentEmail, setSelectedResidentEmail] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [newMessageText, setNewMessageText] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const data = await getAll(COLLECTIONS.MESSAGES);

            // Sort by createdAt safely
            const sorted = data.sort((a: any, b: any) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB; // Ascending order
            });

            setMessages(sorted as Message[]);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, selectedResidentEmail]);

    // Group messages by resident email to build the side list
    const conversationsMap = new Map<string, { name: string, lastMessage: string, unread: number, timestamp: number }>();

    messages.forEach(msg => {
        const time = msg.createdAt?.seconds || 0;
        const email = msg.residentEmail || 'desconocido@sistema.com';

        // Count unread messages from residents
        let isUnread = false;
        if (msg.senderRole === 'resident' && !msg.read) {
            isUnread = true;
        }

        if (conversationsMap.has(email)) {
            const existing = conversationsMap.get(email)!;
            if (time >= existing.timestamp) {
                existing.lastMessage = msg.text || '';
                existing.timestamp = time;
            }
            if (isUnread) existing.unread += 1;
        } else {
            conversationsMap.set(email, {
                name: msg.residentName || email,
                lastMessage: msg.text || '',
                timestamp: time,
                unread: isUnread ? 1 : 0
            });
        }
    });

    // Convert map to array and sort by latest message
    const conversations = Array.from(conversationsMap.entries())
        .map(([email, data]) => ({ email, ...data }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const currentChat = messages.filter(m => (m.residentEmail || 'desconocido@sistema.com') === selectedResidentEmail);
    const selectedResidentName = conversations.find(c => c.email === selectedResidentEmail)?.name || selectedResidentEmail;

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !selectedResidentEmail) return;

        setSending(true);
        try {
            const newMsg = {
                residentEmail: selectedResidentEmail,
                residentName: selectedResidentName,
                senderRole: 'admin',
                text: newMessageText.trim(),
                read: true
            };

            await add(COLLECTIONS.MESSAGES, newMsg);

            setNewMessageText('');
            // Fetch immediately to show the new message
            await fetchMessages();
        } catch (error) {
            showToast('Error al enviar el mensaje', 'error');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (seconds: number) => {
        if (!seconds) return '';
        const d = new Date(seconds * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex h-full">

                {/* Left Sidebar - Conversation List */}
                <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mensajes</h2>
                        <button onClick={fetchMessages} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <RefreshCw size={18} className={loading && !sending ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar residente..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading && conversations.length === 0 ? (
                            <div className="flex justify-center p-8 text-slate-400"><RefreshCw className="animate-spin text-primary" size={24} /></div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center p-8 text-slate-500 text-sm">No hay conversaciones activas.</div>
                        ) : (
                            conversations.map(conv => (
                                <button
                                    key={conv.email}
                                    onClick={async () => {
                                        setSelectedResidentEmail(conv.email);
                                        // Mark as read in DB if there are unread messages
                                        if (conv.unread > 0) {
                                            const unreadIds = messages
                                                .filter(m => m.residentEmail === conv.email && m.senderRole === 'resident' && !m.read)
                                                .map(m => m.id);
                                            
                                            try {
                                                await Promise.all(unreadIds.map(id => update(COLLECTIONS.MESSAGES, id!, { read: true })));
                                                // Update local state without full refetch if possible, or just refetch
                                                fetchMessages();
                                            } catch (e) {
                                                console.error("Error marking as read:", e);
                                            }
                                        }
                                    }}
                                    className={`w-full flex items-start gap-3 p-4 transition-colors border-b border-slate-100 dark:border-slate-800 text-left ${selectedResidentEmail === conv.email ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900'}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400">
                                        {conv.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm">{conv.name}</h4>
                                            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{formatTime(conv.timestamp)}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                                    </div>
                                    {conv.unread > 0 && selectedResidentEmail !== conv.email && (
                                        <div className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                            {conv.unread > 99 ? '99+' : conv.unread}
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Area - Chat Window */}
                <div className="flex-1 flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative">
                    {selectedResidentEmail ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{selectedResidentName}</h3>
                                        <p className="text-xs text-slate-500 leading-tight">{selectedResidentEmail}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {currentChat.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-slate-500">
                                        Comienza la conversación enviando un mensaje.
                                    </div>
                                ) : (
                                    currentChat.map((msg, idx) => {
                                        const isAdmin = msg.senderRole === 'admin';
                                        return (
                                            <div key={msg.id || idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isAdmin
                                                    ? 'bg-primary text-white rounded-tr-sm'
                                                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-sm'
                                                    }`}>
                                                    <p className="text-sm">{msg.text}</p>
                                                    <div className={`flex items-center justify-end gap-1 mt-1 ${isAdmin ? 'text-primary-100' : 'text-slate-400'}`}>
                                                        <span className="text-[10px]">{formatTime(msg.createdAt?.seconds)}</span>
                                                        {isAdmin && (
                                                            msg.read ? <CheckCheck size={12} /> : <Check size={12} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Escribe un mensaje..."
                                        value={newMessageText}
                                        onChange={(e) => setNewMessageText(e.target.value)}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white text-sm"
                                        disabled={sending}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessageText.trim() || sending}
                                        className="bg-primary text-white p-3 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-primary transition-colors shadow-sm flex items-center justify-center w-14"
                                    >
                                        {sending ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} className="ml-1" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <Send size={32} className="text-slate-300 dark:text-slate-600 ml-1" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">Tus Mensajes</h3>
                            <p className="text-sm">Selecciona una conversación de la izquierda.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
