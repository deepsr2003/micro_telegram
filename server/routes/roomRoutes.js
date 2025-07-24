// server/routes/roomRoutes.js
import express from 'express';
import { protect, isRoomAdmin } from '../middleware/authMiddleware.js'; 
import { 
    createRoom, 
    getUserRooms, 
    getRoomMessages, 
    getRoomMembers, 
    promoteToAdmin, 
    removeUserFromRoom, 
    deleteRoomMessage, 
    leaveRoom, 
    deleteRoom, 
    joinRoom, 
    approveJoinRequest
} from '../controllers/roomController.js';

const router = express.Router();

// Existing routes
router.route('/')
  .post(protect, createRoom)
  .get(protect, getUserRooms);

router.post('/join', protect, joinRoom);
router.post('/leave', protect, leaveRoom);

// Routes requiring admin privileges
router.put('/promote', protect, isRoomAdmin, promoteToAdmin);
// THIS IS THE CORRECTED LINE:
router.post('/remove', protect, isRoomAdmin, removeUserFromRoom);
router.delete('/message', protect, isRoomAdmin, deleteRoomMessage);
router.post('/approve-join', protect, isRoomAdmin, approveJoinRequest);

// Room-specific routes
router.get('/:roomId/messages', protect, getRoomMessages);
router.get('/:roomId/members', protect, getRoomMembers);
router.delete('/:roomId', protect, isRoomAdmin, deleteRoom);

export default router;
