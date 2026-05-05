'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  sender: string;
  role: string;
  content: string;
  timestamp: string;
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

export default function ChatPage() {
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState('Busy Bee');
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [input, setInput] = useState('');

  const currentMessages = messages[activeRoom] ?? [];

  const sendMessage = () => {
    if (!input.trim() || !user) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: user.name,
      role: user.role,
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => ({
      ...prev,
      [activeRoom]: [...(prev[activeRoom] ?? []), newMsg],
    }));
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-0px)] p-6 gap-4 max-w-6xl mx-auto">
      {/* Rooms */}
      <div className="w-48 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Chat Rooms</h2>
        <div className="space-y-1">
          {chatRooms.map((room) => (
            <button
              key={room}
              onClick={() => setActiveRoom(room)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeRoom === room
                  ? 'bg-[#1e3a5f] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              # {room}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800"># {activeRoom}</h3>
          <p className="text-xs text-gray-400">Class-isolated chat room</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {currentMessages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm mt-8">No messages yet. Start the conversation!</p>
          ) : (
            currentMessages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {msg.sender.charAt(0)}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-semibold ${roleColors[msg.role] ?? 'text-gray-700'}`}>
                      {msg.sender}
                    </span>
                    <span className="text-xs text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">{msg.role}</span>
                    <span className="text-xs text-gray-400">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Message #${activeRoom}...`}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <button
            onClick={sendMessage}
            className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
