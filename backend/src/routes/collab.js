const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const collabRouter = express.Router();
const userMiddleware = require('../middleware/userMiddleware');
const CollabRoom = require('../models/collabRoom');
const Problem = require('../models/problem');

// Create an invite room for a problem. The unguessable roomId in the link is the invite.
collabRouter.post('/create', userMiddleware, async (req, res) => {
    try {
        const { problemId } = req.body;
        if (!mongoose.isValidObjectId(problemId)) {
            return res.status(400).json({ message: 'Invalid problem id' });
        }
        const exists = await Problem.exists({ _id: problemId });
        if (!exists) return res.status(404).json({ message: 'Problem not found' });

        const roomId = crypto.randomBytes(9).toString('base64url');
        await CollabRoom.create({ roomId, problemId, hostId: req.result._id });
        res.status(201).json({ roomId });
    } catch (err) {
        console.error('Create room error:', err);
        res.status(500).json({ message: 'Could not create room' });
    }
});

// Lets the frontend check that a room exists and which problem it belongs to
collabRouter.get('/:roomId', userMiddleware, async (req, res) => {
    try {
        const room = await CollabRoom.findOne({ roomId: req.params.roomId }).select('problemId hostId');
        if (!room) return res.status(404).json({ message: 'Room not found or expired' });
        res.json({ roomId: req.params.roomId, problemId: room.problemId, hostId: room.hostId });
    } catch (err) {
        res.status(500).json({ message: 'Could not load room' });
    }
});

module.exports = collabRouter;
