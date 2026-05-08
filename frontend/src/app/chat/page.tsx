'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

interface Message {
  id: string;
  sender: string;
  role: string;
  content: string;
  timestamp: string;
  replyToId?: string;
  replyToSender?: string;
  replyToContent?: string;
  reactions?: Record<string, string[]>;
}

const chatRooms = ['Busy Bee', 'Sunbeam', 'Little Lamb', 'Builder', 'General'];

const initialMessages: Record<string, Message[]> = {
  'Busy Bee': [
    { id: '1', sender: 'Mrs. Adams', role: 'Teacher', content: 'Don\'t forget, next Saturday we\'ll be doing the nature walk! Please wear comfortable shoes.', timestamp: '09:15' },
    { id: '2', sender: 'Sipho Dlamini', role: 'Parent', content: 'Thank you! Will there be extra sun protection needed?', timestamp: '09:22' },
    { id: '3', sender: 'Mrs. Adams', role: 'Teacher', content: 'Yes, please apply sunscreen before coming. We\'ll be outside for about 2 hours.', timestamp: '09:25' },
  ],
  General: [
    { id: '1', sender: 'Director', role: 'Director', content: 'Welcome to the Bassonia Adventurer Club chat! This is the general channel for all announcements.', timestamp: '08:00' },
    { id: '2', sender: 'Director', role: 'Director', content: 'Registration for the Investiture Ceremony is now open. Please confirm attendance by Friday.', timestamp: '08:05' },
  ],
};

const roleColors: Record<string, string> = {
  Director: 'text-purple-600',
  Teacher: 'text-[#1e3a5f]',
  Parent: 'text-gray-500',
};

type EmojiCategory = {
  key: string;
  icon: string;
  label: string;
  emojis: string[];
};

const flagCodeToken = (code: string) => `flag:${code.toLowerCase()}`;

const isFlagCodeToken = (value: string) => value.startsWith('flag:');

const getFlagCode = (value: string) => value.replace('flag:', '');

const countryCodeToFlagEmoji = (code: string) => {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return code;
  const A = 0x1f1e6;
  const first = upper.charCodeAt(0) - 65;
  const second = upper.charCodeAt(1) - 65;
  return String.fromCodePoint(A + first, A + second);
};

const emojiCategories: EmojiCategory[] = [
  {
    key: 'smileys',
    icon: '😀',
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍', '😘', '😋', '😎', '🤩', '🥳', '😇', '🤗', '🤔', '🤭', '🤫', '🤐', '😴', '🤤', '😌', '😬', '😢', '😭', '😤', '😡', '🤯'],
  },
  {
    key: 'people',
    icon: '👍',
    label: 'People',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '🤝', '🤗', '👌', '✌️', '🤞', '🫶', '👨‍👩‍👧', '👩‍🏫', '🧑‍🏫', '🧑‍🎓', '👨‍🎓', '👩‍🎓', '👧', '👦', '🧒', '👨', '👩'],
  },
  {
    key: 'nature',
    icon: '🌿',
    label: 'Nature',
    emojis: ['🌞', '⭐', '🌟', '🌈', '☀️', '🌤️', '⛅', '🌧️', '⚡', '❄️', '🌊', '🌍', '🌱', '🌿', '🍀', '🌻', '🌼', '🌷', '🌹', '🌳', '🦋', '🐝', '🐞', '🦜'],
  },
  {
    key: 'food',
    icon: '🍎',
    label: 'Food',
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍓', '🍇', '🍒', '🥭', '🍍', '🥑', '🥕', '🌽', '🍞', '🥐', '🧀', '🍕', '🍔', '🍟', '🍿', '🍪', '🎂', '🧁'],
  },
  {
    key: 'activities',
    icon: '⚽',
    label: 'Activities',
    emojis: ['⚽', '🏀', '🏐', '🎾', '🏓', '🏸', '🥇', '🏅', '🎯', '🎲', '🧩', '🎨', '🎭', '🎵', '🎤', '🎸', '🥁', '🎹', '🎬', '📸', '📚', '📝', '📖', '✂️'],
  },
  {
    key: 'travel',
    icon: '🚗',
    label: 'Travel',
    emojis: ['🚗', '🚕', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚜', '🚲', '🛴', '✈️', '🚁', '⛵', '🚤', '🚀', '🗺️', '🏠', '🏫', '⛪', '🏕️', '🏞️', '🧭', '📍'],
  },
  {
    key: 'objects',
    icon: '💡',
    label: 'Objects',
    emojis: ['💡', '🔦', '📱', '💻', '⌚', '📷', '🎁', '🎈', '🧸', '🪁', '🧴', '🧼', '🩹', '🧯', '🪥', '🧽', '📌', '📎', '📬', '📦', '🔒', '🔑', '🛎️', '🕯️'],
  },
  {
    key: 'symbols',
    icon: '❤️',
    label: 'Symbols',
    emojis: ['❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💯', '✅', '☑️', '✔️', '❌', '⚠️', '❗', '❓', '💬', '🗨️', '📢', '🔔', '🔕', '♻️', '✨'],
  },
  {
    key: 'flags',
    icon: '🏳️',
    label: 'Flags',
    emojis: [
      '🏳️', '🏴', '🏁', '🚩', '🎌',
      flagCodeToken('za'), flagCodeToken('na'), flagCodeToken('bw'), flagCodeToken('zm'), flagCodeToken('mz'), flagCodeToken('ls'), flagCodeToken('zw'), flagCodeToken('mw'), flagCodeToken('ao'), flagCodeToken('ke'), flagCodeToken('ug'), flagCodeToken('tz'), flagCodeToken('rw'), flagCodeToken('bi'), flagCodeToken('sz'),
      flagCodeToken('gb'), flagCodeToken('us'), flagCodeToken('ca'), flagCodeToken('mx'), flagCodeToken('br'), flagCodeToken('ar'), flagCodeToken('cl'), flagCodeToken('pe'), flagCodeToken('co'), flagCodeToken('ve'),
      flagCodeToken('fr'), flagCodeToken('de'), flagCodeToken('it'), flagCodeToken('es'), flagCodeToken('pt'), flagCodeToken('nl'), flagCodeToken('be'), flagCodeToken('ch'), flagCodeToken('at'), flagCodeToken('ie'),
      flagCodeToken('no'), flagCodeToken('se'), flagCodeToken('fi'), flagCodeToken('dk'), flagCodeToken('pl'), flagCodeToken('cz'), flagCodeToken('gr'), flagCodeToken('tr'), flagCodeToken('ua'), flagCodeToken('ro'),
      flagCodeToken('ru'), flagCodeToken('jp'), flagCodeToken('kr'), flagCodeToken('cn'), flagCodeToken('tw'), flagCodeToken('hk'), flagCodeToken('sg'), flagCodeToken('in'), flagCodeToken('pk'), flagCodeToken('bd'),
      flagCodeToken('th'), flagCodeToken('vn'), flagCodeToken('my'), flagCodeToken('id'), flagCodeToken('ph'), flagCodeToken('au'), flagCodeToken('nz'),
      flagCodeToken('sa'), flagCodeToken('ae'), flagCodeToken('il'), flagCodeToken('eg'), flagCodeToken('ma'), flagCodeToken('tn'), flagCodeToken('dz'), flagCodeToken('ng'), flagCodeToken('gh'), flagCodeToken('cm'),
    ],
  },
];

const quickReactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatPage() {
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState('General');
  const [availableRooms, setAvailableRooms] = useState<string[]>(chatRooms);
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reactionPickerForId, setReactionPickerForId] = useState<string | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const loadRooms = async () => {
      if (!user) return;

      if (user.role !== 'Teacher') {
        setAvailableRooms(chatRooms);
        setActiveRoom((prev) => (chatRooms.includes(prev) ? prev : 'General'));
        return;
      }

      try {
        const data = await apiFetch('/api/teachers/my-class') as { assignedClass?: string | null };
        const assigned = data.assignedClass?.trim();
        const scopedRooms = assigned ? [assigned, 'General'] : ['General'];
        setAvailableRooms(scopedRooms);
        setActiveRoom((prev) => (scopedRooms.includes(prev) ? prev : scopedRooms[0]));
      } catch {
        setAvailableRooms(['General']);
        setActiveRoom('General');
      }
    };

    void loadRooms();
  }, [user]);

  useEffect(() => {
    setReplyingTo(null);
    setReactionPickerForId(null);
  }, [activeRoom]);

  const currentMessages = messages[activeRoom] ?? [];

  const sendMessage = () => {
    if (!input.trim() || !user) return;
    const trimmed = input.trim();
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: user.name,
      role: user.role,
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyToId: replyingTo?.id,
      replyToSender: replyingTo?.sender,
      replyToContent: replyingTo?.content,
    };
    setMessages((prev) => ({
      ...prev,
      [activeRoom]: [...(prev[activeRoom] ?? []), newMsg],
    }));
    setInput('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const insertEmoji = (emoji: string) => {
    const el = messageInputRef.current;
    const emojiToInsert = isFlagCodeToken(emoji)
      ? countryCodeToFlagEmoji(getFlagCode(emoji))
      : emoji;

    if (!el) {
      setInput((prev) => `${prev}${emojiToInsert}`);
      setShowEmojiPicker(false);
      return;
    }

    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const nextValue = `${input.slice(0, start)}${emojiToInsert}${input.slice(end)}`;
    const nextCursor = start + emojiToInsert.length;

    setInput(nextValue);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      const target = messageInputRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(nextCursor, nextCursor);
    });

  };

  const toggleReaction = (messageId: string, emoji = '👍') => {
    if (!user) return;

    setMessages((prev) => {
      const roomMessages = prev[activeRoom] ?? [];
      const updatedRoomMessages = roomMessages.map((msg) => {
        if (msg.id !== messageId) return msg;

        const reactions = { ...(msg.reactions ?? {}) };
        const users = reactions[emoji] ?? [];
        const alreadyReacted = users.includes(user.name);
        const nextUsers = alreadyReacted
          ? users.filter((name) => name !== user.name)
          : [...users, user.name];

        if (nextUsers.length === 0) {
          delete reactions[emoji];
        } else {
          reactions[emoji] = nextUsers;
        }

        return {
          ...msg,
          reactions,
        };
      });

      return {
        ...prev,
        [activeRoom]: updatedRoomMessages,
      };
    });
  };

  const previewReplyText = (text: string) => {
    const singleLine = text.replace(/\s+/g, ' ').trim();
    return singleLine.length > 80 ? `${singleLine.slice(0, 80)}...` : singleLine;
  };

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:p-6 h-[calc(100vh-4.5rem)] md:h-[calc(100vh-2rem)] flex flex-col md:flex-row gap-4">
      {/* Rooms */}
      <div className="md:w-56 md:flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 md:mb-3">Chat Rooms</h2>
        <div className="flex md:flex-col gap-2 overflow-x-auto pb-1 md:pb-0 md:space-y-1 md:overflow-visible">
          {availableRooms.map((room) => (
            <button
              key={room}
              onClick={() => setActiveRoom(room)}
              className={`shrink-0 md:w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeRoom === room
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 md:border-transparent'
              }`}
            >
              # {room}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800"># {activeRoom}</h3>
          <p className="text-xs text-gray-400">Class-isolated chat room</p>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4">
          {currentMessages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm mt-8">No messages yet. Start the conversation!</p>
          ) : (
            currentMessages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {msg.sender.charAt(0)}
                </div>
                <div className="min-w-0">
                  {(() => {
                    return (
                      <>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className={`text-sm font-semibold ${roleColors[msg.role] ?? 'text-gray-700'}`}>
                      {msg.sender}
                    </span>
                    <span className="text-xs text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">{msg.role}</span>
                    <span className="text-xs text-gray-400">{msg.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(msg);
                        setReactionPickerForId(null);
                        setShowEmojiPicker(false);
                        requestAnimationFrame(() => messageInputRef.current?.focus());
                      }}
                      className="text-xs text-[#1e3a5f] hover:text-[#2a4f7c] font-medium"
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setReactionPickerForId((prev) => (prev === msg.id ? null : msg.id))}
                      className={`text-xs font-medium ${reactionPickerForId === msg.id ? 'text-[#1e3a5f]' : 'text-gray-500 hover:text-[#1e3a5f]'}`}
                    >
                      React
                    </button>
                  </div>
                  {reactionPickerForId === msg.id && (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-sm">
                      {quickReactionEmojis.map((emoji) => (
                        <button
                          key={`${msg.id}-${emoji}-picker`}
                          type="button"
                          onClick={() => {
                            toggleReaction(msg.id, emoji);
                            setReactionPickerForId(null);
                          }}
                          className="h-7 w-7 rounded-full text-base leading-none hover:bg-gray-100"
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.replyToSender && msg.replyToContent && (
                    <div className="mt-1 rounded-md border-l-2 border-[#1e3a5f]/40 bg-gray-50 px-2 py-1">
                      <p className="text-[11px] font-semibold text-[#1e3a5f]">Replying to {msg.replyToSender}</p>
                      <p className="text-xs text-gray-500 break-words">{previewReplyText(msg.replyToContent)}</p>
                    </div>
                  )}
                  <p className="text-sm text-gray-700 mt-0.5 break-words">{msg.content}</p>
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {Object.entries(msg.reactions).map(([emoji, names]) => {
                        const selected = !!user && names.includes(user.name);
                        return (
                          <button
                            key={`${msg.id}-${emoji}`}
                            type="button"
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${selected ? 'border-[#1e3a5f]/40 bg-[#1e3a5f]/10 text-[#1e3a5f]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}
                            title={names.join(', ')}
                          >
                            <span>{emoji}</span>
                            <span>{names.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-gray-100 space-y-2">
          {replyingTo && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-[#1e3a5f]/15 bg-[#1e3a5f]/5 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1e3a5f]">Replying to {replyingTo.sender}</p>
                <p className="text-xs text-gray-600 break-words">{previewReplyText(replyingTo.content)}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
                aria-label="Cancel reply"
                title="Cancel reply"
              >
                X
              </button>
            </div>
          )}
          {showEmojiPicker && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-2">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {emojiCategories.map((category, idx) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setActiveEmojiCategory(idx)}
                    className={`shrink-0 px-2.5 py-1.5 rounded-md text-sm border transition-colors ${
                      idx === activeEmojiCategory
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                    title={category.label}
                  >
                    {category.icon}
                  </button>
                ))}
              </div>
              <div className="max-h-56 overflow-y-auto">
                <div className="grid grid-cols-8 sm:grid-cols-12 gap-1">
                  {emojiCategories[activeEmojiCategory].emojis.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="h-8 w-8 rounded hover:bg-gray-200 text-lg flex items-center justify-center"
                      title={`Insert ${isFlagCodeToken(emoji) ? getFlagCode(emoji).toUpperCase() : emoji}`}
                    >
                      {isFlagCodeToken(emoji) ? (
                        <img
                          src={`https://flagcdn.com/w20/${getFlagCode(emoji)}.png`}
                          alt={getFlagCode(emoji).toUpperCase()}
                          className="h-4 w-5 rounded-sm object-cover"
                          loading="lazy"
                        />
                      ) : (
                        emoji
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="h-11 w-11 rounded-lg border border-gray-300 bg-white text-xl hover:bg-gray-100 transition-colors"
                aria-label="Toggle emoji picker"
                title="Add emoji"
              >
                😊
              </button>
              <textarea
                ref={messageInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Message #${activeRoom}...`}
                rows={1}
                className="flex-1 resize-none overflow-y-auto max-h-[180px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <button
              onClick={sendMessage}
              className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] transition-colors w-full sm:w-auto"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
