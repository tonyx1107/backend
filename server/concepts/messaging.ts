import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError, NotAllowedError } from "./errors";

// Define the MessageDoc interface
export interface MessageDoc extends BaseDoc {
  sender: string;
  recipient: string;
  content: string;
  timestamp: Date;
}

/**
 * Concept: Messaging
 */
export default class MessagingConcept {
  public readonly messages: DocCollection<MessageDoc>;

  /**
   * Create an instance of Messaging.
   */
  constructor(collectionName: string) {
    this.messages = new DocCollection<MessageDoc>(collectionName);

    // Create index on senderId and recipientId for better query performance
    void this.messages.collection.createIndex({ senderId: 1, recipientId: 1 });
  }

  /**
   * Send a message from sender to recipient.
   */
  async sendMessage(sender: string, recipient: string, content: string) {
    const timestamp = new Date();
    const _id = await this.messages.createOne({ sender, recipient, content, timestamp });
    return { msg: "Message sent successfully!", message: await this.messages.readOne({ sender, recipient, content, timestamp }) };
  }

  /**
   * Get all messages for a user.
   */
  async getMessagesForUser(user: string) {
    const messages = await this.messages.readMany({ recipient: user });
    return messages;
  }

  /**
   * Get all messages exchanged between two users.
   */
  async getMessagesBetweenUsers(user1: string, user2: string) {
    const messages = await this.messages.readMany({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    });
    return messages;
  }

  /**
   * Delete a message if the sender is the one deleting it.
   */
  async deleteMessage(user: string, messageId: ObjectId) {
    const message = await this.messages.readOne({ _id: messageId });

    if (!message) {
      throw new NotFoundError("Message not found.");
    }

    if (message.sender.toString() !== user.toString()) {
      throw new NotAllowedError("You can only delete messages you sent.");
    }

    await this.messages.deleteOne({ _id: messageId });
    return { msg: "Message deleted successfully!" };
  }

  /**
   * Redact sensitive content (for presentation purposes).
   */
  private redactMessage(message: MessageDoc): Omit<MessageDoc, "content"> & { content: string } {
    return { ...message, content: "[REDACTED]" };
  }
}
