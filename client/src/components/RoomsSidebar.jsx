// client/src/components/RoomsSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// --- NEW COMPONENT: A clean UI for the notification ---
const JoinRequestNotification = ({ request, onRespond }) => (
    <div style={{ border: '1px solid var(--accent-color)', padding: '0.5rem', margin: '0.5rem 0' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Join Request: <strong>@{request.requestorUsername}</strong> for <strong>#{request.roomId}</strong>
        </p>
        <div style={{ marginTop: '0.5rem' }}>
            <button onClick={() => onRespond(request, 'approve')} style={{ marginRight: '0.5rem' }}>Approve</button>
            <button onClick={() => onRespond(request, 'reject')}>Reject</button>
        </div>
    </div>
);


const RoomsSidebar = ({ setActiveChat, activeChat, roomData }) => {
    const [rooms, setRooms] = useState([]);
    // --- NEW STATE: To hold incoming join requests ---
    const [joinRequests, setJoinRequests] = useState([]);
    
    const { user, api } = useAuth();
    const socket = useSocket();

    const fetchRooms = useCallback(async () => {
        if (!user) return;
        try {
            const response = await api.get('/rooms');
            setRooms(response.data);
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        }
    }, [api, user]);

    useEffect(() => {
        if (user) {
            fetchRooms();
        }
    }, [user, fetchRooms]);

    // This is the updated, non-blocking listener
    useEffect(() => {
        if (!socket) return;

        const handleAdminNotification = (requestData) => {
            console.log("[Admin Listener] Received 'admin_notification' with data:", requestData);
            // Add the request to our state, avoiding duplicates
            setJoinRequests(prev => {
                if (prev.find(req => req.requestorId === requestData.requestorId && req.roomId === requestData.roomId)) {
                    return prev;
                }
                return [...prev, requestData];
            });
        };

        socket.on('admin_notification', handleAdminNotification);

        return () => {
            socket.off('admin_notification', handleAdminNotification);
        };
    }, [socket]);


    // --- NEW HANDLER: For responding to the UI notification ---
    const handleRespondToRequest = (request, response) => {
        if (response === 'approve') {
            api.post('/rooms/approve-join', { roomId: request.roomId, targetUserId: request.requestorId })
                .then(() => {
                    socket.emit('request_room_data_refresh', { roomId: request.roomId });
                })
                .catch(err => alert(`Error: ${err.response?.data?.message || 'Failed to approve.'}`));
        }
        // Remove the request from the UI regardless of the response
        setJoinRequests(prev => prev.filter(req => req.requestorId !== request.requestorId || req.roomId !== request.roomId));
    };


    // All other handlers (handleCreateRoom, handleJoinRoom, etc.) remain the same...
    const handleCreateRoom = async () => {
        const id = prompt("Enter a unique room ID (e.g., 'dev-team'):");
        const name = prompt("Enter a room name (e.g., 'Developer Team'):");
        if (id && name) {
            try {
                await api.post('/rooms', { id, name });
                fetchRooms();
            } catch (error) {
                alert(`Error: ${error.response.data.message}`);
            }
        }
    };

    const handleJoinRoom = async () => {
        const roomId = prompt("Enter the ID of the room to join:");
        if (roomId && socket) {
            try {
                await api.post('/rooms/join', { roomId });
                if (user?.username) {
                    socket.emit('request_to_join_room', {
                        roomId,
                        requestorId: user.id,
                        requestorUsername: user.username
                    });
                    alert('Join request sent to room admins.');
                }
            } catch (error) {
                alert(`Error: ${error.response.data.message}`);
            }
        }
    };

    const handleLeaveRoom = async () => { /* ... unchanged ... */ };
    const handleDeleteRoom = async () => { /* ... unchanged ... */ };

    const currentUserRole =
        activeChat?.type === 'room' && user
            ? roomData?.members?.find(m => m.id === user.id)?.role
            : null;

    return (
        <aside className="sidebar sidebar-right">
            <div className="sidebar-header">
                <h2 className="sidebar-title"># Rooms</h2>
                <div>
                    <button onClick={handleJoinRoom} className="add-button" title="Join Room">⤓</button>
                    <button onClick={handleCreateRoom} className="add-button" title="Create Room">+</button>
                </div>
            </div>

            {/* --- RENDER THE NOTIFICATIONS --- */}
            {joinRequests.length > 0 && (
                <div className="notifications-area">
                    <h4>Pending Requests</h4>
                    {joinRequests.map(req => (
                        <JoinRequestNotification key={`${req.roomId}-${req.requestorId}`} request={req} onRespond={handleRespondToRequest} />
                    ))}
                </div>
            )}


            <ul className="sidebar-list">
                {rooms.map(room => (
                    <li
                        key={room.id}
                        className={`sidebar-list-item ${activeChat?.id === room.id && activeChat?.type === 'room' ? 'active' : ''}`}
                        onClick={() => setActiveChat({ type: 'room', id: room.id, name: room.name })}
                    >
                        # {room.name}
                    </li>
                ))}
            </ul>

            {activeChat?.type === 'room' && (
                <div className="room-management">
                    <hr />
                    <h4>Members in #{activeChat.name}</h4>
                    <ul className="sidebar-list">
                        {roomData?.members?.map(member => (
                            <li key={member.id}>
                                {member.username} ({member.role})
                            </li>
                        ))}
                    </ul>
                    {currentUserRole && (
                        <button onClick={handleLeaveRoom}>Leave Room</button>
                    )}
                    {currentUserRole === 'creator' && (
                        <button onClick={handleDeleteRoom} className="danger-button">Delete Room</button>
                    )}
                </div>
            )}
        </aside>
    );
};

export default RoomsSidebar;
