import React, { useContext, useEffect, useState } from "react";
import { Message } from "./Message";
import { useStompClient } from "./useStompClient";
import ChatContext from "./Chat.context";
import Axios from "axios";
import StateContext from "../../StateContext";

export const ChatWindow = ({ currentUser }) => {
  const [messageContent, setMessageContent] = useState("");
  const [messages, setMessages] = useState([]);
  const stompClient = useStompClient((message) => {
    setMessages((messages) => [...messages, JSON.parse(message.body)]);
  }, currentUser);
  const { activeContact } = useContext(ChatContext);
  const appState = useContext(StateContext);

  useEffect(() => {
    if (!activeContact) return;
    Axios.get(`/messages/${currentUser.id}/${activeContact.id}`, {
      headers: { Authorization: `Bearer ${appState.user.token}` },
    }).then((r) => setMessages(r.data));
  }, [activeContact]);

  const sendMessage = (msg) => {
    if (msg.trim() !== "") {
      const message = {
        senderId: currentUser.id,
        recipientId: activeContact.id,
        senderName: currentUser.username,
        recipientName: activeContact.username,
        content: msg,
        timestamp: new Date(),
      };
      stompClient.send("/app/chat", {}, JSON.stringify(message));
      setMessages([...messages, message]);
    }
  };

  if (!activeContact) return null;

  return (
    <>
      <div className="chat-title-bar">Chat with {activeContact.username}</div>
      <div id="chat" className="chat-log">
        {messages.map((value, index) => (
          <Message
            key={index}
            message={value.content}
            isSenderMessage={value.senderId === currentUser.id}
            sender={value.senderName}
          />
        ))}
      </div>
      <div id="chatForm" className="chat-form-inline">
        <input
          type="text"
          onChange={(e) => setMessageContent(e.target.value)}
          value={messageContent}
          placeholder="Type a message…"
          autoComplete="off"
          autoFocus
        />
        <button
          className="material-symbols-outlined no-outline"
          onClick={() => {
            if (!messageContent) return;
            sendMessage(messageContent);
            setMessageContent("");
          }}
        >
          send
        </button>
      </div>
    </>
  );
};
