import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import {
    Awareness,
    encodeAwarenessUpdate,
    applyAwarenessUpdate,
    removeAwarenessStates,
} from 'y-protocols/awareness';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#e879f9'];

const colorFor = (id) => COLORS[Math.abs([...id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % COLORS.length];
const cssSafe = (s) => String(s).replace(/[^\w .-]/g, '').slice(0, 24);

/**
 * Real-time shared editing session over Socket.IO + Yjs.
 *
 * roomId     - falsy => hook is idle
 * user       - { _id, firstName, lastName }
 * getSeed    - () => ({ code, language }) used only if this client is the first into a fresh room
 * onRunResult- called when a peer shares a Run/Submit verdict
 *
 * Returns { status, error, session, peers, selfId, problemId }
 * session = { ydoc, ytext, ymeta, awareness, shareResult } is null until the first sync finishes.
 */
export default function useCollabRoom({ roomId, user, getSeed, onRunResult }) {
    const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
    const [error, setError] = useState('');
    const [session, setSession] = useState(null);
    const [peers, setPeers] = useState([]);
    const [selfId, setSelfId] = useState(null);
    const [problemId, setProblemId] = useState(null);

    // keep latest callbacks without re-running the connection effect
    const getSeedRef = useRef(getSeed);
    const onRunResultRef = useRef(onRunResult);
    getSeedRef.current = getSeed;
    onRunResultRef.current = onRunResult;

    const userId = user?._id;
    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Guest';

    useEffect(() => {
        if (!roomId || !userId) return;

        setStatus('connecting');
        setError('');

        const ydoc = new Y.Doc();
        const ytext = ydoc.getText('code');
        const ymeta = ydoc.getMap('meta');
        const awareness = new Awareness(ydoc);
        const color = colorFor(userId);
        const socket = io(API_URL, { withCredentials: true });

        const style = document.createElement('style');
        document.head.appendChild(style);

        let hasJoinedBefore = false;
        let destroyed = false;

        const refreshPeers = () => {
            const states = [...awareness.getStates().entries()];
            const list = [];
            let css = '';
            for (const [clientId, state] of states) {
                if (!state.user) continue;
                if (clientId !== ydoc.clientID) {
                    const { name, color: c } = state.user;
                    css += `
.yRemoteSelection-${clientId}{background-color:${c}40}
.yRemoteSelectionHead-${clientId}{position:absolute;border-left:2px solid ${c};height:100%;box-sizing:border-box}
.yRemoteSelectionHead-${clientId}::after{content:'${cssSafe(name)}';position:absolute;top:-1.35em;left:-2px;font-size:11px;line-height:1.3;font-family:sans-serif;background:${c};color:#000;padding:0 4px;border-radius:3px;white-space:nowrap;pointer-events:none}`;
                }
                list.push({ clientId, ...state.user, isSelf: clientId === ydoc.clientID });
            }
            style.textContent = css;
            setPeers(list);
        };

        const onDocUpdate = (update, origin) => {
            if (origin === 'remote') return;
            socket.emit('yjs:update', update);
        };
        const onAwarenessUpdate = ({ added, updated, removed }, origin) => {
            if (origin === 'remote') return;
            socket.emit('awareness:update', encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]));
        };

        ydoc.on('update', onDocUpdate);
        awareness.on('update', onAwarenessUpdate);
        awareness.on('change', refreshPeers);

        const join = () => {
            socket.emit('room:join', { roomId }, (res) => {
                if (destroyed) return;
                if (!res?.ok) {
                    setStatus('error');
                    setError(res?.error || 'Could not join room');
                    return;
                }

                Y.applyUpdate(ydoc, new Uint8Array(res.state), 'remote');

                if (res.shouldSeed) {
                    const seed = getSeedRef.current?.();
                    if (seed) {
                        ydoc.transact(() => {
                            ytext.insert(0, seed.code || '');
                            ymeta.set('language', seed.language);
                        });
                    }
                }

                // After a network drop, push anything we typed while offline
                if (hasJoinedBefore) {
                    socket.emit('yjs:update', Y.encodeStateAsUpdate(ydoc));
                }
                hasJoinedBefore = true;

                awareness.setLocalStateField('user', { name: displayName, color, socketId: res.selfId, userId });
                setSelfId(res.selfId);
                setProblemId(res.problemId);
                setStatus('connected');
                setSession((prev) => prev || {
                    ydoc,
                    ytext,
                    ymeta,
                    awareness,
                    shareResult: (kind, result) => socket.emit('run:result', { kind, result }),
                });
                refreshPeers();
            });
        };

        socket.on('connect', join); // fires again automatically after a reconnect
        socket.on('connect_error', (err) => {
            setStatus('error');
            setError(err.message === 'Unauthorized' ? 'Please log in to join this room' : 'Could not reach the server');
        });

        socket.on('yjs:update', (update) => Y.applyUpdate(ydoc, new Uint8Array(update), 'remote'));
        socket.on('awareness:update', (update) => applyAwarenessUpdate(awareness, new Uint8Array(update), 'remote'));
        socket.on('awareness:request', () => {
            if (awareness.getLocalState()) {
                socket.emit('awareness:update', encodeAwarenessUpdate(awareness, [ydoc.clientID]));
            }
        });
        socket.on('peer:left', (socketId) => {
            const gone = [...awareness.getStates().entries()]
                .filter(([, s]) => s.user?.socketId === socketId)
                .map(([id]) => id);
            if (gone.length) removeAwarenessStates(awareness, gone, 'remote');
        });
        socket.on('run:result', (payload) => onRunResultRef.current?.(payload));

        return () => {
            destroyed = true;
            awareness.setLocalState(null);
            ydoc.off('update', onDocUpdate);
            awareness.off('update', onAwarenessUpdate);
            awareness.off('change', refreshPeers);
            socket.disconnect();
            awareness.destroy();
            ydoc.destroy();
            style.remove();
            setSession(null);
            setPeers([]);
            setSelfId(null);
            setStatus('idle');
        };
    }, [roomId, userId, displayName]);

    return { status, error, session, peers, selfId, problemId };
}
