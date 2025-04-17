import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import {performFullDecryptionFlow} from "../lib/encryption"
export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    // try {
    //   const res = await axiosInstance.get(`/messages/${userId}`);
    //   set({ messages: res.data });
    // } catch (error) {
    //   toast.error(error.response.data.message);
    // } finally {
    //   set({ isMessagesLoading: false });
    // }
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      
      // Decrypt all messages before setting them
      const decryptedMessages = await Promise.all(
        res.data.map(async (message) => {
          try {
            console.log("message is",message)
            // Determine if this is a sent message from the current user
           // const isSent = message.senderId === useAuthStore.getState().authUser._id;
            
            // Decrypt the message

            const parseText = JSON.parse(message.text)
            console.log("pasred text. ", parseText)
            const parseMap = JSON.parse(message.spaceMap)
            const parseKey = JSON.parse(message.publicKey)

            const decryptedText = await performFullDecryptionFlow({encryptedText: parseText, encryptedSpaceMap: parseMap, publicKey: parseKey, evolutionCount:message.evolutionCount});
            console.log("decrypted text is ,", decryptedText)
            // Return message with added decrypted text
            return { ...message, decryptedText };
          } catch (decryptError) {
            console.error(`Failed to decrypt message ${message._id}:`, decryptError);
            return { ...message, decryptedText: "[Decryption failed]" };
          }
        })
      );
      
      // Set the decrypted messages in state
      set({ messages: decryptedMessages });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const spaceMapStr = JSON.stringify(messageData.encryptedSpaceMap)
      const messageToStore = JSON.stringify(messageData.encryptedText)
      console.log("message data:", messageData);
      console.log(messageToStore)
      console.log("str space map", spaceMapStr)
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`,{ text: messageToStore, publicKey:messageData.pubKey, evolutionCount: messageData.evolutionCountNext, spaceMap: spaceMapStr});
      console.log("res data :", res.data)

      const justSent = res.data;

     
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));