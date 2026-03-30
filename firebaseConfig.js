'use client'; // ← MUST be the first line

import { useState, useEffect } from "react";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, onSnapshot } from "firebase/firestore";
import { app } from "../../firebaseConfig"; // adjust path if needed

export default function TestFirebase() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const auth = getAuth(app);
  const db = getFirestore(app);

  // Sign in anonymously for testing
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, [auth]);

  // Subscribe to messages collection in real-time
  useEffect(() => {
    const q = query(collection(db, "testMessages"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [db]);

  // Add a new message
  const handleAddMessage = async () => {
    if (!newMessage) return;
    try {
      await addDoc(collection(db, "testMessages"), {
        text: newMessage,
        createdAt: new Date(),
        userId: user?.uid || "unknown"
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error adding message:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Firebase Test Page</h1>
      <p>User ID: {user ? user.uid : "Signing in..."}</p>

      <div style={{ margin: "20px 0" }}>
        <input
          type="text"
          placeholder="Enter a message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ width: 300, marginRight: 10 }}
        />
        <button onClick={handleAddMessage}>Send</button>
      </div>

      <h2>Messages:</h2>
      <ul>
        {messages.map((msg) => (
          <li key={msg.id}>
            <strong>{msg.userId}:</strong> {msg.text} <em>({msg.createdAt?.toDateString() || ""})</em>
          </li>
        ))}
      </ul>
    </div>
  );
}