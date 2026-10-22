const mongoose = require('mongoose');
const { Schema } = mongoose;

const collabRoomSchema = new Schema({
    roomId: { type: String, required: true, unique: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'problem', required: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    // Serialized Yjs document (code + language) so a room survives server restarts
    state: { type: Buffer },
}, { timestamps: true });

// Rooms that nobody has touched for 7 days are cleaned up automatically
collabRoomSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('collabRoom', collabRoomSchema);
