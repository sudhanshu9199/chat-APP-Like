/**
 * 2026 ConnectX Chat Vault — Native Zero-Dependency High-Performance IndexedDB Storage
 * ₹0-Cost Architecture:
 * - Direct Client Browser Storage (IndexedDB)
 * - Persistent Storage Protection via navigator.storage.persist() (Eviction Mitigation)
 * - Microsecond local latency (0ms network roundtrip for past chat history)
 * - Automatic conversation summary indexing for instant UserList previews & unread badges
 * - Full JSON & Cloud Backup Export / Import
 */

const DB_NAME = "connectx_chat_vault";
const DB_VERSION = 1;

let dbPromise = null;

/**
 * Open or upgrade the IndexedDB database
 */
export function openChatDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Messages Store: Raw message history
      if (!db.objectStoreNames.contains("messages")) {
        const msgStore = db.createObjectStore("messages", { keyPath: "id" });
        msgStore.createIndex("participantId", "participantId", { unique: false });
        msgStore.createIndex("createdAt", "createdAt", { unique: false });
        msgStore.createIndex("sender", "sender", { unique: false });
        msgStore.createIndex("receiver", "receiver", { unique: false });
      }

      // 2. Conversations Store: Chat list summaries (last message, timestamp, unread count)
      if (!db.objectStoreNames.contains("conversations")) {
        db.createObjectStore("conversations", { keyPath: "participantId" });
      }

      // 3. Meta Store: Storage health, backup timestamps, sync tokens
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("[ChatDb] Failed to open IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Mitigate iOS/Android browser eviction by requesting persistent storage
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log(`[ChatDb] Storage persistence granted: ${granted}`);
        return granted;
      }
      return isPersisted;
    }
  } catch (err) {
    console.warn("[ChatDb] Storage persistence request warning:", err);
  }
  return false;
}

/**
 * Get storage quota & usage statistics
 */
export async function getStorageInfo() {
  try {
    let persisted = false;
    let usageBytes = 0;
    let quotaBytes = 0;

    if (navigator.storage) {
      if (navigator.storage.persisted) {
        persisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        usageBytes = est.usage || 0;
        quotaBytes = est.quota || 0;
      }
    }

    return {
      persisted,
      usageBytes,
      quotaBytes,
      usageFormatted: formatBytes(usageBytes),
      quotaFormatted: formatBytes(quotaBytes),
    };
  } catch (err) {
    console.error("[ChatDb] Failed to get storage info:", err);
    return {
      persisted: false,
      usageBytes: 0,
      quotaBytes: 0,
      usageFormatted: "0 B",
      quotaFormatted: "Unknown",
    };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Helper to determine who the other party is in a message
 */
function resolveParticipantId(msg, currentUserId) {
  const senderId = (msg.sender?._id || msg.sender)?.toString();
  const receiverId = (msg.receiver?._id || msg.receiver)?.toString();
  const myId = currentUserId?.toString();

  if (senderId && senderId !== myId) return senderId;
  if (receiverId && receiverId !== myId) return receiverId;
  return senderId || receiverId || "unknown";
}

/**
 * Normalize message structure for storage
 */
function normalizeMessage(msg, currentUserId) {
  const id = String(msg._id || msg.id || msg.clientMsgId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  const senderId = (msg.sender?._id || msg.sender)?.toString();
  const receiverId = (msg.receiver?._id || msg.receiver)?.toString();
  const participantId = resolveParticipantId(msg, currentUserId);

  return {
    id,
    _id: id,
    sender: senderId,
    receiver: receiverId,
    participantId,
    text: msg.text || "",
    seen: Boolean(msg.seen),
    delivered: msg.delivered !== undefined ? Boolean(msg.delivered) : true,
    createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: msg.updatedAt ? new Date(msg.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Save a single message and update conversation summary
 */
export async function saveMessage(rawMsg, currentUserId) {
  const db = await openChatDb();
  const msg = normalizeMessage(rawMsg, currentUserId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["messages", "conversations"], "readwrite");
    const msgStore = tx.objectStore("messages");
    const convStore = tx.objectStore("conversations");

    msgStore.put(msg);

    // Update conversation record
    const convReq = convStore.get(msg.participantId);
    convReq.onsuccess = () => {
      const existingConv = convReq.result || {
        participantId: msg.participantId,
        unreadCount: 0,
      };

      const isIncoming = msg.sender !== currentUserId?.toString();
      const newUnread = isIncoming && !msg.seen ? (existingConv.unreadCount || 0) + 1 : (existingConv.unreadCount || 0);

      const updatedConv = {
        participantId: msg.participantId,
        lastMessage: msg.text,
        lastMessageAt: msg.createdAt,
        unreadCount: newUnread,
        updatedAt: new Date().toISOString(),
      };

      convStore.put(updatedConv);
    };

    tx.oncomplete = () => resolve(msg);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Save a batch of messages (e.g. from offline sync:pending)
 */
export async function saveMessagesBatch(messagesArray, currentUserId) {
  if (!Array.isArray(messagesArray) || messagesArray.length === 0) return [];
  const db = await openChatDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["messages", "conversations"], "readwrite");
    const msgStore = tx.objectStore("messages");
    const convStore = tx.objectStore("conversations");

    const savedList = [];
    const convUpdates = new Map();

    for (const rawMsg of messagesArray) {
      const msg = normalizeMessage(rawMsg, currentUserId);
      msgStore.put(msg);
      savedList.push(msg);

      // Track latest message per participant
      const pId = msg.participantId;
      const current = convUpdates.get(pId);
      const isIncoming = msg.sender !== currentUserId?.toString();

      if (!current) {
        convUpdates.set(pId, {
          lastMsg: msg,
          unreadIncrement: isIncoming && !msg.seen ? 1 : 0,
        });
      } else {
        if (new Date(msg.createdAt) >= new Date(current.lastMsg.createdAt)) {
          current.lastMsg = msg;
        }
        if (isIncoming && !msg.seen) {
          current.unreadIncrement += 1;
        }
      }
    }

    // Apply conversation updates
    convUpdates.forEach(({ lastMsg, unreadIncrement }, pId) => {
      const req = convStore.get(pId);
      req.onsuccess = () => {
        const existing = req.result || { participantId: pId, unreadCount: 0 };
        convStore.put({
          participantId: pId,
          lastMessage: lastMsg.text,
          lastMessageAt: lastMsg.createdAt,
          unreadCount: (existing.unreadCount || 0) + unreadIncrement,
          updatedAt: new Date().toISOString(),
        });
      };
    });

    tx.oncomplete = () => resolve(savedList);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Get all messages for a specific conversation sorted by createdAt ascending
 */
export async function getMessagesForChat(otherUserId, currentUserId) {
  const db = await openChatDb();
  const targetId = otherUserId?.toString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["messages"], "readonly");
    const msgStore = tx.objectStore("messages");
    const index = msgStore.index("participantId");
    const request = index.getAll(targetId);

    request.onsuccess = () => {
      const list = request.result || [];
      // Sort oldest to newest
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      resolve(list);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Get all conversations dictionary keyed by participantId
 */
export async function getAllConversations() {
  const db = await openChatDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["conversations"], "readonly");
    const convStore = tx.objectStore("conversations");
    const request = convStore.getAll();

    request.onsuccess = () => {
      const list = request.result || [];
      const dict = {};
      for (const item of list) {
        dict[item.participantId] = item;
      }
      resolve(dict);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Mark a conversation as read (resets unread badge to 0 and marks messages seen)
 */
export async function markConversationAsRead(participantId) {
  const db = await openChatDb();
  const pId = participantId?.toString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["messages", "conversations"], "readwrite");
    const msgStore = tx.objectStore("messages");
    const convStore = tx.objectStore("conversations");

    // Reset unreadCount in conversation
    const convReq = convStore.get(pId);
    convReq.onsuccess = () => {
      if (convReq.result) {
        convStore.put({
          ...convReq.result,
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
        });
      }
    };

    // Mark unread messages from this participant as seen
    const pIndex = msgStore.index("participantId");
    const msgReq = pIndex.openCursor(pId);
    msgReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const val = cursor.value;
        if (val.sender === pId && !val.seen) {
          val.seen = true;
          cursor.update(val);
        }
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Export entire IndexedDB vault into a portable JSON structure
 */
export async function exportVault() {
  const db = await openChatDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["messages", "conversations"], "readonly");
    const msgStore = tx.objectStore("messages");
    const convStore = tx.objectStore("conversations");

    let messages = [];
    let conversations = [];

    msgStore.getAll().onsuccess = (e) => {
      messages = e.target.result || [];
    };

    convStore.getAll().onsuccess = (e) => {
      conversations = e.target.result || [];
    };

    tx.oncomplete = () => {
      const payload = {
        app: "ConnectX",
        version: "2026.1",
        exportedAt: new Date().toISOString(),
        totalMessages: messages.length,
        totalConversations: conversations.length,
        data: {
          messages,
          conversations,
        },
      };
      resolve(JSON.stringify(payload, null, 2));
    };

    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Import and merge a JSON vault into IndexedDB
 */
export async function importVault(jsonContent) {
  try {
    const parsed = typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;
    const messages = parsed?.data?.messages || parsed?.messages || [];
    const conversations = parsed?.data?.conversations || parsed?.conversations || [];

    const db = await openChatDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(["messages", "conversations"], "readwrite");
      const msgStore = tx.objectStore("messages");
      const convStore = tx.objectStore("conversations");

      for (const m of messages) {
        if (m.id) msgStore.put(m);
      }

      for (const c of conversations) {
        if (c.participantId) convStore.put(c);
      }

      tx.oncomplete = () => {
        resolve({
          importedMessages: messages.length,
          importedConversations: conversations.length,
        });
      };

      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("[ChatDb] Import error:", err);
    throw new Error("Invalid or corrupted backup file");
  }
}

/**
 * Wipe all local data if user explicitly requests vault purge
 */
export async function clearAllLocalVault() {
  const db = await openChatDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["messages", "conversations", "meta"], "readwrite");
    tx.objectStore("messages").clear();
    tx.objectStore("conversations").clear();
    tx.objectStore("meta").clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}
