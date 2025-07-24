// client/src/components/ChatPanel.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const ChatPanel = ({ activeChat, setRoomData }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const { user, api } = useAuth();
    const socket = useSocket();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchRoomData = useCallback(async (roomId) => {
        try {
            const membersRes = await api.get(`/rooms/${roomId}/members`);
            setRoomData({ members: membersRes.data });
        } catch (error) {
            console.error('Failed to fetch room data', error);
        }
    }, [api, setRoomData]);

    useEffect(() => {
        if (!activeChat || !socket) return;

        setMessages([]);

        const fetchMessages = async () => {
            try {
                let response;
                if (activeChat.type === 'room') {
                    response = await api.get(`/rooms/${activeChat.id}/messages`);
                } else if (activeChat.type === 'dm') {
                    response = await api.get(`/contacts/${activeChat.id}/messages`);
                }
                if (response) setMessages(response.data);
            } catch (error) {
                console.error('Failed to fetch messages', error);
            }
        };

        fetchMessages();

        if (activeChat.type === 'room') {
            socket.emit('join_room', activeChat.id);
            fetchRoomData(activeChat.id);
        } else {
            setRoomData({ members: [] });
        }

        const handleNewRoomMessage = (message) => {
            if (activeChat.type === 'room' && message.room_id === activeChat.id) {
                setMessages(prev => {
                    const filtered = prev.filter(m => m.sender_username !== user.username || m.content !== message.content);
                    return [...filtered, message];
                });
            }
        };

        const handleNewDM = (message) => {
            if (
                activeChat.type === 'dm' &&
                (
                    (message.sender_id === user.id && message.receiver_id === activeChat.id) ||
                    (message.sender_id === activeChat.id && message.receiver_id === user.id)
                )
            ) {
                setMessages(prev => {
                    const filtered = prev.filter(m => m.sender_username !== user.username || m.content !== message.content);
                    return [...filtered, message];
                });
            }
        };

        const handleRefresh = () => {
            if (activeChat?.type === 'room') {
                fetchRoomData(activeChat.id);
            }
        };

        const handleMessageDeleted = ({ messageId, adminUsername }) => {
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === messageId
                        ? {
                            ...msg,
                            is_deleted: true,
                            content: `-- Message deleted by admin @${adminUsername} --`,
                        }
                        : msg
                )
            );
        };

        socket.on('receive_room_message', handleNewRoomMessage);
        socket.on('receive_dm', handleNewDM);
        socket.on('refresh_room_data', handleRefresh);
        socket.on('message_deleted', handleMessageDeleted);

        return () => {
            socket.off('receive_room_message', handleNewRoomMessage);
            socket.off('receive_dm', handleNewDM);
            socket.off('refresh_room_data', handleRefresh);
            socket.off('message_deleted', handleMessageDeleted);
        };
    }, [activeChat, socket, api, user.id, user.username, fetchRoomData]);

    // ✅ Optimistic UI update here
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !activeChat) return;

        const tempMessage = {
            id: Date.now(),
            content: newMessage,
            created_at: new Date().toISOString(),
            sender_username: user.username,
            is_deleted: false,
        };

        if (activeChat.type === 'room') {
            const payload = {
                roomId: activeChat.id,
                content: newMessage,
                senderId: user.id,
            };
            socket.emit('send_room_message', payload);
            setMessages(prev => [...prev, tempMessage]);
        } else if (activeChat.type === 'dm') {
            const payload = {
                content: newMessage,
                senderId: user.id,
                receiverId: activeChat.id,
            };
            socket.emit('send_dm', payload);
            setMessages(prev => [...prev, tempMessage]);
        }

        setNewMessage('');
    };

    const handleDeleteMessage = (messageId) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            socket.emit('delete_room_message', {
                messageId,
                roomId: activeChat.id,
                adminUsername: user.username,
            });
        }
    };

    if (!activeChat) {
        return <div className="chat-panel">Select a room or contact to start chatting.</div>;
    }

    return (
        <main className="chat-panel">
            <header className="chat-header">
                <h2 className="chat-header-title">
                    {activeChat.type === 'room' ? `# ${activeChat.name}` : `@ ${activeChat.name}`}
                </h2>
            </header>
            <div className="messages-container">
                <div className="messages-list">
                    {messages.map((msg) => {
                        const isAdmin =
                            activeChat.type === 'room' &&
                            Array.isArray(setRoomData?.members) &&
                            setRoomData.members.some(
                                (member) => member.id === user.id && ['admin', 'creator'].includes(member.role)
                            );

                        return (
                            <div key={msg.id} className="message">
                                <div className="message-meta">
                                    <span className="message-sender">{msg.sender_username}</span>
                                    <span className="message-timestamp">
                                        {' '}
                                        at {new Date(msg.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className={`message-content ${msg.is_deleted ? 'deleted' : ''}`}>
                                    {msg.is_deleted ? msg.content : msg.content}
                                </p>
                                {isAdmin && !msg.is_deleted && (
                                    <button onClick={() => handleDeleteMessage(msg.id)}>Delete</button>
                                )}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                    type="text"
                    className="chat-input"
                    placeholder={`Message ${activeChat.type === 'room' ? '#' : '@'}${activeChat.name}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" className="send-button">SEND</button>
            </form>
        </main>
    );
};

export default ChatPanel;
