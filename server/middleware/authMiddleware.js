// server/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import pool from '../db.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [decoded.id]);
      
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = rows[0];
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};


// server/middleware/authMiddleware.js
// ... existing `protect` function ...

export const isRoomAdmin = async (req, res, next) => {
    const roomId = req.params.roomId || req.body.roomId;
    const userId = req.user.id;
    try {
        const [members] = await pool.query(
            'SELECT role FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, userId]
        );
        
        if (members.length === 0 || !['creator', 'admin'].includes(members[0].role)) {
            return res.status(403).json({ message: 'Forbidden: User is not an admin of this room.' });
        }
        
        // Attach the user's role in this room to the request for later use
        req.roomRole = members[0].role;
        next();

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error checking admin status.' });
    }
};
