import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Phone, Image, Film, Mic } from 'lucide-react';
import { ContactList } from './ContactList';
import { MessageThread } from './MessageThread';
import { MessageComposer } from './MessageComposer';
import { AddContactModal } from './AddContactModal';
import { VideoCall } from './VideoCall';
import { CallControls } from './CallControls';
import { PublicKeyDisplay } from './PublicKeyDisplay';
import { Contact, Message } from '../../types/message';
import { useContacts } from '../../hooks/useContacts';
import { useP2PMessaging } from '../../hooks/useP2PMessaging';
import { useWebRTC } from '../../hooks/useWebRTC';
import { convertFileToBase64, validateMediaFile } from '../../utils/mediaUtils';

export function MessagingInterface() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [showMobileContacts, setShowMobileContacts] = useState(true);
  const [isInCall, setIsInCall] = useState(false);

  const { contacts, loadContacts, saveContact, deleteContact } = useContacts();
  const { keyPair, messages, sendMessage, sendMediaMessage } = useP2PMessaging();
  const webRTC = useWebRTC(keyPair?.publicKey || '');

  useEffect(() => {
    loadContacts();
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loadContacts]);

  const handleAddContact = async (contact: { name: string; publicKey: string; avatar?: string }) => {
    await saveContact(contact);
    setShowAddContact(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    await deleteContact(contactId);
    if (selectedContact?.id === contactId) {
      setSelectedContact(null);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    if (isMobileView) {
      setShowMobileContacts(false);
    }
  };

  const handleBackToContacts = () => {
    if (isMobileView) {
      setShowMobileContacts(true);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedContact || !keyPair) return;
    await sendMessage(content, selectedContact.publicKey);
  };

  const handleSendMedia = async (file: File, type: 'image' | 'video') => {
    if (!selectedContact || !keyPair) return;
    try {
      validateMediaFile(file, type);
      const base64Data = await convertFileToBase64(file);
      await sendMediaMessage(base64Data, type, selectedContact.publicKey);
    } catch (error) {
      console.error('Failed to send media:', error);
    }
  };

  const handleSendVoiceNote = async (audioBlob: Blob) => {
    if (!selectedContact || !keyPair) return;
    try {
      const base64Data = await convertFileToBase64(new File([audioBlob], 'voice.webm'));
      await sendMediaMessage(base64Data, 'voice', selectedContact.publicKey);
    } catch (error) {
      console.error('Failed to send voice note:', error);
    }
  };

  const handleStartCall = async () => {
    if (!selectedContact || !keyPair) return;
    setIsInCall(true);
    await webRTC.startCall(selectedContact.publicKey);
  };

  const filteredMessages = messages.filter(
    msg => 
      (msg.senderId === keyPair?.publicKey && msg.receiverId === selectedContact?.publicKey) ||
      (msg.senderId === selectedContact?.publicKey && msg.receiverId === keyPair?.publicKey)
  );

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Contacts Panel */}
      <div className={`
        w-full md:w-64 
        ${showMobileContacts || !isMobileView ? 'block' : 'hidden'}
      `}>
        <div className="mb-4 pb-2 border-b border-[#00ff9d] flex justify-between items-center">
          <h2 className="terminal-text text-[10px] md:text-xs">CONTACTS</h2>
          <button
            onClick={() => setShowAddContact(true)}
            className="terminal-button p-1"
            aria-label="Add contact"
          >
            <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
          </button>
        </div>

        {keyPair && <PublicKeyDisplay publicKey={keyPair.publicKey} />}
        
        <div className="mt-4">
          <ContactList
            contacts={contacts}
            onSelectContact={handleSelectContact}
            onDeleteContact={handleDeleteContact}
            selectedContactId={selectedContact?.id}
          />
        </div>
      </div>
      
      {/* Messages Panel */}
      <div className={`
        flex-1 flex flex-col h-full bg-black
        ${!showMobileContacts || !isMobileView ? 'block' : 'hidden'}
      `}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-3 border-b border-[#00ff9d]">
              <div className="flex items-center gap-2">
                {isMobileView && (
                  <button
                    onClick={handleBackToContacts}
                    className="terminal-button p-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <span className="terminal-text text-[12px]">
                  CHAT WITH {selectedContact.name.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="terminal-button p-2"
                  aria-label="Send image"
                >
                  <Image className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.getElementById('video-upload')?.click()}
                  className="terminal-button p-2"
                  aria-label="Send video"
                >
                  <Film className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.getElementById('voice-record')?.click()}
                  className="terminal-button p-2"
                  aria-label="Record voice"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={handleStartCall}
                  className="terminal-button p-2"
                  aria-label="Start call"
                >
                  <Phone className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              {isInCall ? (
                <VideoCall
                  localStream={webRTC.localStream}
                  remoteStream={webRTC.remoteStream}
                />
              ) : (
                <>
                  {/* Message Thread */}
                  <MessageThread
                    messages={filteredMessages}
                    currentUserId={keyPair?.publicKey || ''}
                  />
                  
                  {/* Message Composer */}
                  <div className="border-t border-[#00ff9d] bg-black p-3 sticky bottom-0">
                    <MessageComposer
                      onSendMessage={handleSendMessage}
                      onSendMedia={handleSendMedia}
                      onSendVoiceNote={handleSendVoiceNote}
                      recipientName={selectedContact.name}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="terminal-text text-[10px] md:text-xs text-[#00ff9d]/70">
              Select a contact to start messaging
            </p>
          </div>
        )}
      </div>

      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onSave={handleAddContact}
        />
      )}
    </div>
  );
}