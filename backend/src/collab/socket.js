const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const Y = require('yjs');
const User = require('../models/user');
const CollabRoom = require('../models/collabRoom');
const redisClient = require('../config/redis');

const MAX_MEMBERS = 6;
const MAX_UPDATE_BYTES = 256 * 1024;
const SAVE_DEBOUNCE_MS = 2000;

// roomId -> { doc, members: Map<socketId, {userId, name}>, seedBy, saveTimer }
const rooms = new Map();

const toBuffer = (u) => Buffer.from(u.buffer, u.byteOffset, u.byteLength);

async function loadRoom(roomId) {
    if (rooms.has(roomId)) return rooms.get(roomId);

    const record = await CollabRoom.findOne({ roomId });
    if (!record) return null;

    const doc = new Y.Doc();
    if (record.state && record.state.length) {
        Y.applyUpdate(doc, new Uint8Array(record.state));
    }
    const room = { doc, members: new Map(), seedBy: null, saveTimer: null, problemId: String(record.problemId) };
    rooms.set(roomId, room);
    return room;
}

async function saveRoom(roomId, room) {
    clearTimeout(room.saveTimer);
    room.saveTimer = null;
    try {
        await CollabRoom.updateOne(
            { roomId },
            { $set: { state: toBuffer(Y.encodeStateAsUpdate(room.doc)) } }
        );
    } catch (err) {
        console.error('Collab save error:', err.message);
    }
}

function scheduleSave(roomId, room) {
    if (room.saveTimer) return;
    room.saveTimer = setTimeout(() => saveRoom(roomId, room), SAVE_DEBOUNCE_MS);
}

const memberList = (room) =>
    [...room.members.entries()].map(([socketId, m]) => ({ socketId, userId: m.userId, name: m.name }));

function initCollab(httpServer, allowedOrigins) {
    const io = new Server(httpServer, {
        cors: { origin: allowedOrigins, credentials: true },
        maxHttpBufferSize: MAX_UPDATE_BYTES * 2,
    });

    // Same auth as the REST API: JWT in the httpOnly cookie + Redis logout blocklist
    io.use(async (socket, next) => {
        try {
            const { token } = cookie.parse(socket.handshake.headers.cookie || '');
            if (!token) throw new Error('Not authenticated');

            const { _id } = jwt.verify(token, process.env.JWT_KEY);
            const user = await User.findById(_id).select('firstName lastName');
            if (!user) throw new Error('User not found');
            if (await redisClient.exists(`token:${token}`)) throw new Error('Invalid token');

            socket.data.user = {
                id: String(user._id),
                name: [user.firstName, user.lastName].filter(Boolean).join(' '),
            };
            next();
        } catch (err) {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        let joinedRoomId = null;

        const leave = async () => {
            if (!joinedRoomId) return;
            const roomId = joinedRoomId;
            joinedRoomId = null;

            const room = rooms.get(roomId);
            socket.leave(roomId);
            if (!room) return;

            room.members.delete(socket.id);
            // The client that was asked to seed disappeared before doing so: let the next joiner seed
            if (room.seedBy === socket.id && !room.doc.getMap('meta').has('language')) {
                room.seedBy = null;
            }

            socket.to(roomId).emit('peer:left', socket.id);
            io.to(roomId).emit('room:members', memberList(room));

            if (room.members.size === 0) {
                await saveRoom(roomId, room);
                // someone may have rejoined while we were saving
                if (room.members.size === 0) {
                    room.doc.destroy();
                    rooms.delete(roomId);
                }
            }
        };

        socket.on('room:join', async ({ roomId } = {}, ack) => {
            if (typeof ack !== 'function') return;
            try {
                if (typeof roomId !== 'string' || roomId.length > 64) {
                    return ack({ ok: false, error: 'Invalid room' });
                }
                await leave();

                const room = await loadRoom(roomId);
                if (!room) return ack({ ok: false, error: 'Room not found or expired' });
                if (!room.members.has(socket.id) && room.members.size >= MAX_MEMBERS) {
                    return ack({ ok: false, error: 'Room is full' });
                }

                joinedRoomId = roomId;
                socket.join(roomId);
                room.members.set(socket.id, { userId: socket.data.user.id, name: socket.data.user.name });

                // The first person into a never-initialised room seeds it with their code
                let shouldSeed = false;
                if (!room.doc.getMap('meta').has('language') && !room.seedBy) {
                    room.seedBy = socket.id;
                    shouldSeed = true;
                }

                ack({
                    ok: true,
                    state: toBuffer(Y.encodeStateAsUpdate(room.doc)),
                    shouldSeed,
                    problemId: room.problemId,
                    selfId: socket.id,
                });

                io.to(roomId).emit('room:members', memberList(room));
                // Ask everyone already here to re-announce their cursor/presence to the newcomer
                socket.to(roomId).emit('awareness:request');
            } catch (err) {
                console.error('room:join error:', err);
                ack({ ok: false, error: 'Could not join room' });
            }
        });

        socket.on('yjs:update', (update) => {
            const room = joinedRoomId && rooms.get(joinedRoomId);
            if (!room || !update) return;
            const bytes = new Uint8Array(update);
            if (bytes.byteLength > MAX_UPDATE_BYTES) return;
            try {
                Y.applyUpdate(room.doc, bytes, socket.id);
            } catch {
                return; // malformed update
            }
            socket.to(joinedRoomId).emit('yjs:update', update);
            scheduleSave(joinedRoomId, room);
        });

        socket.on('awareness:update', (update) => {
            if (!joinedRoomId || !update) return;
            socket.to(joinedRoomId).emit('awareness:update', update);
        });

        // Share a Run / Submit verdict with everyone in the room
        socket.on('run:result', (payload) => {
            if (!joinedRoomId || !payload || (payload.kind !== 'run' && payload.kind !== 'submit')) return;
            socket.to(joinedRoomId).emit('run:result', {
                kind: payload.kind,
                result: payload.result,
                by: socket.data.user.name,
            });
        });

        socket.on('disconnect', leave);
    });

    return io;
}

module.exports = initCollab;
