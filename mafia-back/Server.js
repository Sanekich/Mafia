require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoStore } = require('connect-mongo');

const app = express();

app.use(express.json());
app.set('trust proxy', 1);

// =========================
// CORS
// =========================

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://www.metodo-ballance.it',
    'https://metodo-ballance.it'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true
}));

// =========================
// MONGODB
// =========================

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mafia';

if (!process.env.MONGO_URI) {
    console.warn('Warning: MONGO_URI not set. Falling back to local MongoDB at mongodb://127.0.0.1:27017/mafia');
}

// =========================
// SESSION
// =========================

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
        mongoUrl: MONGO_URI,
        collectionName: 'sessions'
    }),

    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

// =========================
// SCHEMAS
// =========================

const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    host: {
        type: String,
        required: true
    },
    players: [{
        name: {
            type: String,
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    started: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Room = mongoose.model('Room', RoomSchema);

const UsersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    }
});

const Users = mongoose.model('Users', UsersSchema);

// =========================
// ROOMS
// =========================

app.post('/rooms', async (req, res) => {
    try {
        const { name, hostName } = req.body;

        if (!name || !hostName) {
            return res.status(400).json({ error: 'Room name and host name are required.' });
        }

        if (req.session.roomId) {
            return res.status(400).json({ error: 'You are already in a room. Leave it before creating a new one.' });
        }

        const room = new Room({
            name,
            host: hostName,
            players: [{ name: hostName }]
        });

        await room.save();

        req.session.roomId = room._id.toString();
        req.session.playerName = hostName;
        req.session.isHost = true;

        req.session.save((sessionError) => {
            if (sessionError) {
                return res.status(500).json({ error: sessionError.message });
            }
            res.status(201).json(room);
        });

    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.get('/session/room', async (req, res) => {
    if (!req.session.roomId) {
        return res.json({ room: null });
    }

    try {
        const room = await Room.findById(req.session.roomId);
        if (!room) {
            req.session.roomId = null;
            req.session.playerName = null;
            req.session.isHost = null;
            req.session.save(() => res.json({ room: null }));
            return;
        }

        res.json({
            room,
            playerName: req.session.playerName || null,
            isHost: !!req.session.isHost
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/rooms', async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 });

        res.status(200).json(rooms);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

app.get('/rooms/:roomId', async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found.' });
        }
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/rooms/:roomId/join', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Player name is required.' });
        }

        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found.' });
        }

        if (room.started) {
            return res.status(400).json({ error: 'Match already started.' });
        }

        if (req.session.roomId && req.session.roomId !== room._id.toString()) {
            return res.status(400).json({ error: 'You are already in another room.' });
        }

        if (req.session.roomId === room._id.toString()) {
            if (req.session.playerName === name) {
                return res.status(200).json(room);
            }
            return res.status(400).json({ error: `You are already in this room as ${req.session.playerName}.` });
        }

        if (room.players.some(player => player.name === name)) {
            return res.status(400).json({ error: 'Player name already taken in this room.' });
        }

        room.players.push({ name });
        await room.save();

        req.session.roomId = room._id.toString();
        req.session.playerName = name;
        req.session.isHost = false;

        req.session.save((sessionError) => {
            if (sessionError) {
                return res.status(500).json({ error: sessionError.message });
            }
            res.status(200).json(room);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/rooms/:roomId/start', async (req, res) => {
    try {
        const { hostName } = req.body;
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found.' });
        }

        if (room.host !== hostName) {
            return res.status(403).json({ error: 'Only the host can start the match.' });
        }

        room.started = true;
        await room.save();

        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/rooms/:roomId/leave', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Player name is required.' });
        }

        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found.' });
        }

        room.players = room.players.filter(player => player.name !== name);

        const shouldClearSession = req.session.roomId === req.params.roomId && req.session.playerName === name;
        if (shouldClearSession) {
            req.session.roomId = null;
            req.session.playerName = null;
            req.session.isHost = null;
        }

        if (room.players.length === 0) {
            await room.deleteOne();
            if (shouldClearSession) {
                req.session.save(() => res.status(200).json({ deleted: true }));
            } else {
                res.status(200).json({ deleted: true });
            }
            return;
        }

        if (room.host === name) {
            room.host = room.players[0].name;
        }

        await room.save();

        if (shouldClearSession) {
            req.session.save((sessionError) => {
                if (sessionError) {
                    return res.status(500).json({ error: sessionError.message });
                }
                res.status(200).json({ deleted: false, room });
            });
        } else {
            res.status(200).json({ deleted: false, room });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =========================
// USERS
// =========================

app.post('/users', async (req, res) => {
    try {
        const { name } = req.body;

        const user = new Users({ name });

        await user.save();

        res.status(201).json(user);

    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
    .then(() => {

        console.log('Connected to MongoDB successfully.');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        const ROOM_CLEANUP_INTERVAL_MS = 1000 * 60; // every 60 seconds

        async function cleanupEmptyRooms() {
            try {
                const result = await Room.deleteMany({ players: { $size: 0 } });
                if (result.deletedCount) {
                    console.log(`Deleted ${result.deletedCount} empty room(s).`);
                }
            } catch (cleanupError) {
                console.error('Room cleanup error:', cleanupError.message);
            }
        }

        async function dropLegacyIdIndex() {
            try {
                const indexes = await Room.collection.indexes();
                const legacyIndex = indexes.find(index => index.name === 'id_1');
                if (legacyIndex) {
                    await Room.collection.dropIndex('id_1');
                    console.log('Dropped legacy id_1 index from rooms collection.');
                }
            } catch (indexError) {
                if (indexError.codeName !== 'IndexNotFound') {
                    console.error('Index drop error:', indexError.message);
                }
            }
        }

        cleanupEmptyRooms();
        dropLegacyIdIndex();
        setInterval(cleanupEmptyRooms, ROOM_CLEANUP_INTERVAL_MS);

    })
    .catch(error => {

        console.error(
            'MongoDB connection error:',
            error.message
        );

        process.exit(1);
    });