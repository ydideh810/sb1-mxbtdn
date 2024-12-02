import React, { useState } from 'react';
import { Send, Image, Film, Mic } from 'lucide-react';

interface MessageComposerProps {
  onSendMessage: (content: string) => void;
  onSendMedia: (file: File, type: 'image' | 'video') => void;
  onSendVoiceNote: (audioBlob: Blob) => void;
  recipientName: string;
}

export function MessageComposer({
  onSendMessage,
  onSendMedia,
  onSendVoiceNote,
  recipientName
}: MessageComposerProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Message"
          className="flex-1 bg-[#1a1a1a] text-[#00ff9d] rounded-lg px-4 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#00ff9d]"
        />
        <button
          onClick={handleSend}
          className="terminal-button p-2 min-w-[40px] flex items-center justify-center"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && onSendMedia(e.target.files[0], 'image')}
        className="hidden"
      />
      <input
        id="video-upload"
        type="file"
        accept="video/*"
        onChange={(e) => e.target.files?.[0] && onSendMedia(e.target.files[0], 'video')}
        className="hidden"
      />
    </div>
  );
}