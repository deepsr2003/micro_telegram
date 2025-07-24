// client/src/components/ContactsSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const ContactsSidebar = ({ setActiveChat }) => {
    const [contacts, setContacts] = useState([]);
    const { user, api, logout } = useAuth();
    const socket = useSocket();
    const navigate = useNavigate();

    // The useCallback hook is fine, but we need to add `user` as a dependency
    const fetchContacts = useCallback(async () => {
        // Add a guard clause here for safety
        if (!user) return; 
        try {
            const response = await api.get('/contacts');
            setContacts(response.data);
        } catch (error) {
            console.error('Failed to fetch contacts', error);
        }
    }, [api, user]); // <-- ADD user HERE

    // THIS IS THE MAIN FIX
    useEffect(() => {
        // Only fetch contacts if the user object exists
        if (user) {
            fetchContacts();
        }
    }, [user, fetchContacts]); // <-- DEPEND ON user

    useEffect(() => {
        if (!socket) return;
        
        const handleRefresh = () => {
            fetchContacts();
        };

        socket.on('refresh_contacts', handleRefresh);

        return () => {
            socket.off('refresh_contacts', handleRefresh);
        };
    }, [socket, fetchContacts]);

    const handleAddContact = async () => {
        const username = prompt("Enter the username to add:");
        if (username) {
            try {
                // ✅ This endpoint is now correct
                await api.post('/contacts', { targetUsername: username });
                const [targetUser] = contacts.filter(c => c.contact_username === username);
                if (targetUser && socket) {
                    socket.emit('contact_update', { targetUserId: targetUser.contact_id });
                }
                alert('Request sent!');
                fetchContacts();
            } catch (error) {
                alert(`Error: ${error.response?.data?.message || 'Failed to send request.'}`);
            }
        }
    };
    
    const handleResponse = async (sourceUsername, response) => {
        try {
            await api.put('/contacts/respond', { sourceUsername, response });
            const [targetUser] = contacts.filter(c => c.contact_username === sourceUsername);
            if (targetUser && socket) {
                socket.emit('contact_update', { targetUserId: targetUser.contact_id });
            }
            fetchContacts();
        } catch (error) {
            alert(`Error: ${error.response?.data?.message || 'Failed to respond to request.'}`);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Add a check for user before trying to access its properties
    const pendingRequests = user ? contacts.filter(c => c.status === 'pending' && c.action_user_id !== user.id) : [];
    const acceptedContacts = contacts.filter(c => c.status === 'accepted');

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-title">@ Contacts</h2>
                <button onClick={handleAddContact} className="add-button">+</button>
            </div>

            {pendingRequests.length > 0 && (
                <div>
                    <h4>Pending Requests</h4>
                    <ul className="sidebar-list">
                        {pendingRequests.map(contact => (
                            <li key={contact.contact_id} className="sidebar-list-item pending">
                                <span>{contact.contact_username}</span>
                                <div>
                                    <button onClick={() => handleResponse(contact.contact_username, 'accept')}>✓</button>
                                    <button onClick={() => handleResponse(contact.contact_username, 'reject')}>✗</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <h4>Friends</h4>
            <ul className="sidebar-list">
                {acceptedContacts.map(contact => (
                    <li
                        key={contact.contact_id}
                        className="sidebar-list-item"
                        onClick={() => setActiveChat({ type: 'dm', id: contact.contact_id, name: contact.contact_username })}
                    >
                        @ {contact.contact_username}
                    </li>
                ))}
            </ul>

            <div
                className="sidebar-footer"
                style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}
            >
                {/* Add a check for user.username to prevent errors */}
                <p>Logged in as: @{user?.username}</p>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        background: 'var(--error-color)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem',
                        cursor: 'pointer',
                    }}
                >
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default ContactsSidebar;
