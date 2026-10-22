import { useState } from 'react';
import { Users, Link2, LogOut, Check } from 'lucide-react';

/**
 * Toolbar shown above the editor.
 * - Not in a room: "Invite" button creates a room and puts ?room=... in the URL.
 * - In a room: shows who is here, copy-link and leave buttons.
 */
export default function CollabBar({ inRoom, status, error, peers, creating, onInvite, onLeave }) {
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            window.prompt('Copy this invite link:', window.location.href);
        }
    };

    if (!inRoom) {
        return (
            <button className="btn btn-sm btn-outline gap-2" onClick={onInvite} disabled={creating}>
                <Users size={14} />
                {creating ? 'Creating…' : 'Invite'}
            </button>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center gap-2 text-sm">
                <span className="text-error">{error}</span>
                <button className="btn btn-sm btn-ghost" onClick={onLeave}>Close</button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className="flex -space-x-2" title={peers.map((p) => p.name).join(', ')}>
                {peers.map((p) => (
                    <div
                        key={p.clientId}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black ring-2 ring-base-100"
                        style={{ backgroundColor: p.color }}
                        title={p.isSelf ? `${p.name} (you)` : p.name}
                    >
                        {p.name.charAt(0).toUpperCase()}
                    </div>
                ))}
            </div>
            <span className="text-xs text-base-content/60">
                {status === 'connected' ? `${peers.length} here` : 'Connecting…'}
            </span>
            <button className="btn btn-sm btn-outline gap-1" onClick={copyLink}>
                {copied ? <Check size={14} /> : <Link2 size={14} />}
                {copied ? 'Copied' : 'Copy link'}
            </button>
            <button className="btn btn-sm btn-ghost gap-1" onClick={onLeave}>
                <LogOut size={14} /> Leave
            </button>
        </div>
    );
}
