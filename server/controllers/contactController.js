// server/controllers/contactController.js
import pool from '../db.js';

// Helper to ensure user_one_id is always the smaller id
const getOrderedUserIds = (id1, id2) => {
    return id1 < id2 ? [id1, id2] : [id2, id1];
};

// Send a contact request
export const sendContactRequest = async (req, res) => {
    const { targetUsername } = req.body;
    const action_user_id = req.user.id;

    try {
        const [targetUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [targetUsername]);
        if (targetUsers.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const target_user_id = targetUsers[0].id;

        if (action_user_id === target_user_id) {
            return res.status(400).json({ message: "You can't add yourself as a contact." });
        }
        
        const [user_one_id, user_two_id] = getOrderedUserIds(action_user_id, target_user_id);
        
        const [existing] = await pool.query(
            'SELECT * FROM contacts WHERE user_one_id = ? AND user_two_id = ?',
            [user_one_id, user_two_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'A pending request or an existing contact already exists.' });
        }

        await pool.query(
            "INSERT INTO contacts (user_one_id, user_two_id, status, action_user_id) VALUES (?, ?, 'pending', ?)",
            [user_one_id, user_two_id, action_user_id]
        );

        res.status(201).json({ message: 'Contact request sent.' });

    } catch (error) {
        console.error('Error sending contact request:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Accept or Reject a contact request
export const respondToContactRequest = async (req, res) => {
    const { sourceUsername, response } = req.body; // response is 'accept' or 'reject'
    const action_user_id = req.user.id;

    if (!['accept', 'reject'].includes(response)) {
        return res.status(400).json({ message: "Invalid response. Must be 'accept' or 'reject'." });
    }

    try {
        const [sourceUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [sourceUsername]);
        if (sourceUsers.length === 0) return res.status(404).json({ message: 'User not found.' });
        const source_user_id = sourceUsers[0].id;

        const [user_one_id, user_two_id] = getOrderedUserIds(action_user_id, source_user_id);
        
        if (response === 'accept') {
            await pool.query(
                "UPDATE contacts SET status = 'accepted', action_user_id = ? WHERE user_one_id = ? AND user_two_id = ? AND status = 'pending'",
                [action_user_id, user_one_id, user_two_id]
            );
        } else { // reject
            await pool.query(
                'DELETE FROM contacts WHERE user_one_id = ? AND user_two_id = ?',
                [user_one_id, user_two_id]
            );
        }
        res.status(200).json({ message: `Request ${response === 'accept' ? 'accepted' : 'rejected'}.` });
    } catch (error) {
        console.error('Error responding to request:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get all of a user's contacts (pending and accepted)
export const getContacts = async (req, res) => {
    const userId = req.user.id;
    try {
        const [contacts] = await pool.query(
            `SELECT 
                c.status, c.action_user_id,
                CASE
                    WHEN c.user_one_id = ? THEN u2.id
                    ELSE u1.id
                END AS contact_id,
                CASE
                    WHEN c.user_one_id = ? THEN u2.username
                    ELSE u1.username
                END AS contact_username
             FROM contacts c
             JOIN users u1 ON c.user_one_id = u1.id
             JOIN users u2 ON c.user_two_id = u2.id
             WHERE c.user_one_id = ? OR c.user_two_id = ?`,
            [userId, userId, userId, userId]
        );
        res.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get Direct Messages between two users

export const getDirectMessages = async (req, res) => {
    const { contactId } = req.params;
    const userId = req.user.id;

    // --- ADD THESE LOGS ---
    console.log(`Fetching DMs for user ${userId} and contact ${contactId}`);

    try {
        const [messages] = await pool.query(
            `SELECT m.id, m.content, m.created_at, m.sender_id, u.username as sender_username
             FROM direct_messages m
             JOIN users u ON m.sender_id = u.id
             WHERE (m.sender_id = ? AND m.receiver_id = ?) 
                OR (m.sender_id = ? AND m.receiver_id = ?)
             ORDER BY m.created_at ASC`,
            [userId, contactId, contactId, userId]
        );
        
        // --- ADD THIS LOG ---
        console.log(`Found ${messages.length} messages.`);

        res.json(messages);
    } catch (error) {
        // --- ADD THIS LOG ---
        console.error('Error fetching DMs:', error);
        res.status(500).json({ message: 'Server error fetching DMs' });
    }
};


