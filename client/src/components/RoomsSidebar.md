// client/src/components/RoomsSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react'; // <-- IMPORT useCallback
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const RoomsSidebar = ({ setActiveChat, activeChat, roomData }) => {
    const [rooms, setRooms] = useState([]);
    const { user, api } = useAuth();
    const socket = useSocket();

    // Let's wrap this in useCallback for consistency and best practice
    const fetchRooms = useCallback(async () => {
        if (!user) return; // Guard clause
        try {
            const response = await api.get('/rooms');
            setRooms(response.data);
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        }
    }, [api, user]); // <-- DEPEND ON api and user

    // THIS IS THE MAIN FIX
    useEffect(() => {
        if (user) {
            fetchRooms();
        }
    }, [user, fetchRooms]); // <-- DEPEND ON user

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
                } else {
                    alert('Could not send notification. Please try again in a moment.');
                }
            } catch (error) {
                alert(`Error: ${error.response.data.message}`);
            }
        }
    };

    const handleLeaveRoom = async () => {
        if (window.confirm("Are you sure you want to leave this room?")) {
            try {
                // This endpoint needs a fix on the server-side, it's not in the previous code
                await api.post('/rooms/leave', { roomId: activeChat.id });
                socket.emit('request_room_data_refresh', { roomId: activeChat.id });
                setActiveChat(null);
                fetchRooms();
            } catch (error) {
                alert(`Error: ${error.response?.data?.message}`);
            }
        }
    };

    const handleDeleteRoom = async () => {
        if (window.confirm("DANGER: Are you sure you want to PERMANENTLY DELETE this room for everyone?")) {
            try {
                await api.delete(`/rooms/${activeChat.id}`);
                socket.emit('request_room_data_refresh', { roomId: activeChat.id });
                setActiveChat(null);
                fetchRooms();
            } catch (error) {
                alert(`Error: ${error.response.data.message}`);
            }
        }
    };
    // Handle admin notifications (join requests)
    useEffect(() => {
        if (!socket) {
            console.log("[Admin Listener] Socket not ready yet.");
            return;
        }

        console.log("[Admin Listener] Attaching 'admin_notification' listener.");

        const handleAdminNotification = (data) => {
            // --- ADD LOG HERE ---
            console.log("[Admin Listener] Received 'admin_notification' with data:", data);

            const { roomId, requestorUsername, requestorId } = data;
            if (window.confirm(`${requestorUsername} wants to join room #${roomId}. Approve?`)) {
                api.post('/rooms/approve-join', { roomId, targetUserId: requestorId })
                    .then(() => {
                        console.log(`[Admin Action] Approved join for ${requestorUsername}. Emitting refresh.`);
                        socket.emit('request_room_data_refresh', { roomId });
                    })
                    .catch(err => alert(`Error: ${err.response.data.message}`));
            }
        };

        socket.on('admin_notification', handleAdminNotification);

        return () => {
            console.log("[Admin Listener] Cleaning up 'admin_notification' listener.");
            socket.off('admin_notification', handleAdminNotification);
        };
    }, [socket, api]);


 /*   useEffect(() => {
        if (!socket) return;
        const handleAdminNotification = ({ roomId, requestorUsername, requestorId }) => {
            if (window.confirm(`${requestorUsername} wants to join room #${roomId}. Approve?`)) {
                api.post('/rooms/approve-join', { roomId, targetUserId: requestorId })
                    .then(() => {
                        socket.emit('request_room_data_refresh', { roomId });
                    })
                    .catch(err => alert(`Error: ${err.response.data.message}`));
            }
        };
        socket.on('admin_notification', handleAdminNotification);
        return () => {
            socket.off('admin_notification', handleAdminNotification);
        };
    }, [socket, api]);
  */

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
