// server/routes/authRoutes.js
import express from 'express';
import { signup, login } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

// ADD THIS NEW ROUTE
router.get('/me', protect, (req, res) => {
    res.json(req.user);
});

export default router;
