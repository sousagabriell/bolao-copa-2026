"use client";

import { createPortal } from "react-dom";
import Image from "next/image";
import { MentionableUser } from "@/lib/types";

const POPOVER_WIDTH = 220;
const GAP = 8;

interface Props {
  users: MentionableUser[];
  anchorRect: DOMRect;
  highlightedIndex: number;
  onSelect: (user: MentionableUser) => void;
  onClose: () => void;
}

export default function MentionAutocomplete({ users, anchorRect, highlightedIndex, onSelect, onClose }: Props) {
  if (users.length === 0) return null;

  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - POPOVER_WIDTH - 8));
  const bottom = window.innerHeight - anchorRect.top + GAP;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[65]" onClick={onClose} />
      <div
        className="fixed z-[70] bg-copa-dark-800 border border-white/15 rounded-xl shadow-xl shadow-black/40 py-1 max-h-56 overflow-y-auto"
        style={{ bottom, left, width: POPOVER_WIDTH }}
      >
        {users.map((user, i) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
              i === highlightedIndex ? "bg-copa-red/20" : "hover:bg-white/5"
            }`}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/10 bg-copa-dark-700 flex items-center justify-center">
              {user.avatar_url ? (
                <Image src={user.avatar_url} alt={user.name} width={24} height={24} className="object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-sm text-white truncate">{user.name}</span>
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}
