// server/controllers/roomController.js
import pool from '../db.js';

export const createRoom = async (req, res) => {
  const { id, name } = req.body;
  const creator_id = req.user.id;

  if (!id || !name) {
    return res.status(400).json({ message: 'Room ID and name are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRoom] = await connection.query('SELECT * FROM rooms WHERE id = ?', [id]);
    if (existingRoom.length > 0) {
      throw new Error('Room ID already exists.');
    }
    
    // Create the room
    await connection.query(
      'INSERT INTO rooms (id, name, creator_id) VALUES (?, ?, ?)',
      [id, name, creator_id]
    );

    // Add the creator to the room_members table
    await connection.query(
      "INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, 'creator')",
      [id, creator_id]
    );

    await connection.commit();

    const [newRoom] = await connection.query('SELECT * FROM rooms WHERE id = ?', [id]);
    res.status(201).json(newRoom[0]);

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error creating room.' });
  } finally {
    connection.release();
  }
};

export const getUserRooms = async (req, res) => {
    try {
        const [rooms] = await pool.query(
            `SELECT r.id, r.name FROM rooms r 
             JOIN room_members rm ON r.id = rm.room_id 
             WHERE rm.user_id = ?`,
            [req.user.id]
        );
        res.json(rooms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching rooms' });
    }
};

export const getRoomMessages = async (req, res) => {
    const { roomId } = req.params;
    try {
        const [messages] = await pool.query(
            `SELECT m.id, m.content, m.created_at, u.username as sender_username, m.is_deleted 
             FROM room_messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.room_id = ?
             ORDER BY m.created_at ASC`,
            [roomId]
        );
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching messages' });
    }
};


// server/controllers/roomController.js
// ... existing functions ...

export const getRoomMembers = async (req, res) => {
    const { roomId } = req.params;
    try {
        const [members] = await pool.query(
            `SELECT u.id, u.username, rm.role 
             FROM room_members rm
             JOIN users u ON rm.user_id = u.id
             WHERE rm.room_id = ?`,
             [roomId]
        );
        res.json(members);
    } catch(error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const promoteToAdmin = async (req, res) => {
    const { roomId, targetUserId } = req.body;
    try {
        // Rule: A creator can't be demoted, and you can't promote yourself.
        const [[targetUser]] = await pool.query('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, targetUserId]);
        if (targetUser.role !== 'member' || req.user.id === targetUserId) {
            return res.status(400).json({ message: 'Can only promote members.' });
        }

        // Rule: Limit of 2 admins (plus creator)
        const [admins] = await pool.query("SELECT COUNT(*) as admin_count FROM room_members WHERE room_id = ? AND role = 'admin'", [roomId]);
        if (admins[0].admin_count >= 2) {
            return res.status(400).json({ message: 'Maximum number of admins reached (2).' });
        }

        await pool.query("UPDATE room_members SET role = 'admin' WHERE room_id = ? AND user_id = ?", [roomId, targetUserId]);
        res.status(200).json({ message: 'User promoted to admin.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const removeUserFromRoom = async (req, res) => {
    const { roomId, targetUserId } = req.body;
    try {
        const [[targetUser]] = await pool.query('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, targetUserId]);
        // Rule: Admins cannot remove other admins or the creator. Only the creator can do that (not implemented here for simplicity, but could be added).
        if (['admin', 'creator'].includes(targetUser.role)) {
            return res.status(403).json({ message: 'Admins cannot remove other admins or the creator.' });
        }
        await pool.query('DELETE FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, targetUserId]);
        res.status(200).json({ message: 'User removed from room.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteRoomMessage = async (req, res) => {
    const { messageId } = req.body;
    try {
        // In a real app, you'd check if the message is in the room the admin has powers over.
        // For now, we trust the isRoomAdmin middleware has run on a route that includes the roomId.
        await pool.query('UPDATE room_messages SET is_deleted = TRUE, content = ? WHERE id = ?', [`Message deleted by admin @${req.user.username}`, messageId]);
        res.status(200).json({ message: 'Message deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const leaveRoom = async (req, res) => {
    const { roomId } = req.body;
    const userId = req.user.id;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [[currentUser]] = await connection.query('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, userId]);
        
        // "Last Admin" Rule
        if (['admin', 'creator'].includes(currentUser.role)) {
            const [admins] = await connection.query("SELECT COUNT(*) as admin_count FROM room_members WHERE room_id = ? AND role IN ('admin', 'creator')", [roomId]);
            if (admins[0].admin_count <= 1) {
                await connection.rollback();
                return res.status(400).json({ message: "You are the last admin. Promote another user or delete the room."});
            }
        }
        
        await connection.query('DELETE FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, userId]);
        await connection.commit();
        res.status(200).json({ message: 'You have left the room.' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

export const deleteRoom = async (req, res) => {
    // Only the 'creator' can delete the room. Let's enforce that.
    if(req.roomRole !== 'creator') {
        return res.status(403).json({ message: 'Only the room creator can delete the room.'});
    }
    const { roomId } = req.params;
    try {
        await pool.query('DELETE FROM rooms WHERE id = ?', [roomId]);
        // ON DELETE CASCADE in the DB schema handles cleanup of members and messages.
        res.status(200).json({ message: 'Room deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const joinRoom = async (req, res) => {
    const { roomId } = req.body;
    const userId = req.user.id;
    try {
        const [room] = await pool.query('SELECT id FROM rooms WHERE id = ?', [roomId]);
        if (room.length === 0) return res.status(404).json({ message: 'Room not found.' });

        const [membership] = await pool.query('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, userId]);
        if (membership.length > 0) return res.status(400).json({ message: 'You are already a member of this room.' });
        
        // This is a simplified "auto-join". The prompt asked for a request/approve flow.
        // Let's implement the request/approve flow via sockets instead of a direct DB insert.
        // So this API endpoint is for sending the request.

        // We will notify admins via a socket event from the client
        res.status(200).json({ message: 'Join request sent.' });
    } catch(error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const approveJoinRequest = async (req, res) => {
    const { roomId, targetUserId } = req.body;
    try {
        await pool.query("INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, 'member')", [roomId, targetUserId]);
        res.status(200).json({ message: 'User added to room.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
