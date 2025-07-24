// server/index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import roomRoutes from './routes/roomRoutes.js';
import pool from './db.js';

import authRoutes from './routes/authRoutes.js';
// We will add more routes here later

import contactRoutes from './routes/contactRoutes.js';


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
  }
});

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json()); // for parsing application/json

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/contacts', contactRoutes);

// In-memory map to track user sockets
const userSocketMap = new Map(); 

// Socket.IO connection


io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  const userId = socket.handshake.query.userId;
  if(userId) {
    userSocketMap.set(userId.toString(), socket.id);
    console.log(`User ${userId} mapped to socket ${socket.id}`);
  }

  // Client joins a room's socket channel
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Client sends a message to a room
  socket.on('send_room_message', async ({ roomId, content, senderId }) => {
    try {
        // 1. Save message to DB
        const [result] = await pool.query(
            'INSERT INTO room_messages (room_id, sender_id, content) VALUES (?, ?, ?)',
            [roomId, senderId, content]
        );
        const messageId = result.insertId;

        // 2. Get the full message data to broadcast
        const [[message]] = await pool.query(
            `SELECT m.id, m.content, m.created_at, u.username as sender_username 
             FROM room_messages m JOIN users u ON m.sender_id = u.id 
             WHERE m.id = ?`,
            [messageId]
        );

        // 3. Broadcast to all clients in the room
        io.to(roomId).emit('receive_room_message', message);
    } catch (error) {
        console.error('Error handling room message:', error);
    }
  });

      socket.on('send_dm', async ({ content, senderId, receiverId }) => {
        try {
            // 1. Save to DB
            const [result] = await pool.query(
                'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
                [senderId, receiverId, content]
            );
            const messageId = result.insertId;

            // 2. Get full message data
            const [[message]] = await pool.query(
                `SELECT m.id, m.content, m.created_at, m.sender_id, m.receiver_id, u.username as sender_username
                 FROM direct_messages m JOIN users u ON m.sender_id = u.id
                 WHERE m.id = ?`,
                 [messageId]
            );

            // 3. Send to receiver if they are online
            const receiverSocketId = userSocketMap.get(receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive_dm', message);
            }
            
            // 4. Send back to sender to confirm and update their own UI
            socket.emit('receive_dm', message);

        } catch (error) {
            console.error('Error handling DM:', error);
        }
    });

    // When a user adds or accepts a contact, notify the other user to refresh their list
    socket.on('contact_update', ({ targetUserId }) => {
        const targetSocketId = userSocketMap.get(targetUserId.toString());
        if (targetSocketId) {
            io.to(targetSocketId).emit('refresh_contacts');
        }
    });





  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Clean up the map on disconnect
    for (let [key, value] of userSocketMap.entries()) {
        if (value === socket.id) {
            userSocketMap.delete(key);
            console.log(`User ${key} unmapped.`);
            break;
        }
    }
  });

    // --- NEW SOCKET EVENTS FOR ADMIN ACTIONS ---

  // When an action happens that requires clients to refresh room data (members, etc.)
  socket.on('request_room_data_refresh', ({ roomId }) => {
    io.to(roomId).emit('refresh_room_data');
  });

  // When a message is deleted, update all clients
  socket.on('delete_room_message', async ({ messageId, roomId, adminUsername }) => {
      try {
        await pool.query('UPDATE room_messages SET is_deleted = TRUE, content = ? WHERE id = ?', [`Message deleted by admin @${adminUsername}`, messageId]);

        // Notify clients to update the specific message
        io.to(roomId).emit('message_deleted', { messageId, adminUsername });
      } catch(error) {
          console.error('Error deleting message via socket', error);
      }
  });


  

  // Handle join requests
  socket.on('request_to_join_room', async ({ roomId, requestorId, requestorUsername }) => {
    // --- ADD LOGS HERE ---
    console.log(`[Socket Event] Received 'request_to_join_room' for room: ${roomId} from user: ${requestorUsername} (${requestorId})`);
    
    try {
        const [admins] = await pool.query(
          "SELECT user_id FROM room_members WHERE room_id = ? AND role IN ('creator', 'admin')",
          [roomId]
        );
        
        // --- ADD LOGS HERE ---
        console.log(`Found ${admins.length} admins for room ${roomId}:`, admins.map(a => a.user_id));

        const notification = { roomId, requestorId, requestorUsername, type: 'join_request' };
        
        admins.forEach(admin => {
            const adminSocketId = userSocketMap.get(admin.user_id.toString());
            
            // --- ADD LOGS HERE ---
            if (adminSocketId) {
                console.log(`Found socket for admin ${admin.user_id}: ${adminSocketId}. Emitting 'admin_notification'.`);
                io.to(adminSocketId).emit('admin_notification', notification);
            } else {
                console.log(`Could not find active socket for admin ${admin.user_id}. They might be offline.`);
            }
        });
    } catch(err) {
        console.error("Error processing join request:", err);
    }
  });



/*  socket.on('request_to_join_room', async ({ roomId, requestorId, requestorUsername }) => {
    const [admins] = await pool.query(
      "SELECT user_id FROM room_members WHERE room_id = ? AND role IN ('creator', 'admin')",
      [roomId]
    );

    const notification = { roomId, requestorId, requestorUsername, type: 'join_request' };
    
    admins.forEach(admin => {
        const adminSocketId = userSocketMap.get(admin.user_id.toString());
        if (adminSocketId) {
            io.to(adminSocketId).emit('admin_notification', notification);
        }
    });
  }); */


});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
