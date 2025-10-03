import Message from "../models/message.js";

export const sendMessage = async (data, io) => {
  try {
    const { content, senderId } = data;

    // Save message to DB
    const message = await Message.create({
      content,
      sender: senderId,
    });

    // Populate sender info
    await message.populate("sender", "name profilePic");

    // Emit to all clients
    io.emit("newMessage", {
      content: message.content,
      sender: {
        name: message.sender.name,
        profilePic: message.sender.profilePic,
      },
      createdAt: message.createdAt,
    });
  } catch (err) {
    console.error("Error in sendMessage:", err);
  }
};
