// server/routes/contactRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendContactRequest, respondToContactRequest, getContacts, getDirectMessages } from '../controllers/contactController.js';

const router = express.Router();

router.route('/')
    .get(protect, getContacts)
    .post(protect, sendContactRequest);

router.route('/respond').put(protect, respondToContactRequest);

router.route('/:contactId/messages').get(protect, getDirectMessages);


export default router;
