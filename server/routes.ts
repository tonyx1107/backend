import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Friending, Posting, Sessioning, Verifying, Messaging } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";
import { Session } from "express-session";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string, key?: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password, key);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/loggin")
  async logggin(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  // Verifying 
  @Router.post("/verification/request")
  async createVerificationRequest(session: SessionDoc, credentials: string) {
    const user = Sessioning.getUser(session);
    const username = await Authing.idsToUsernames([user]);

    if (!credentials) {
      return { error: "Missing credentials." };
    }

    const verificationRequest = await Verifying.createVerificationRequest(username[0], credentials);
    return verificationRequest;
  }

  @Router.get("/verification/status")
  async getVerificationStatus(session: SessionDoc, username: string) {
    const request = await Verifying.getRequestByUser(username);
    if (!request) {
      return { status: "No verification request found." };
    }

    return { status: request.status };
  }

  @Router.get("/verification/view")
  async viewRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const username = await Authing.idsToUsernames([user]);
    return await Verifying.getRequestByUser(username[0])
  }
  

  @Router.post("/verification/approve/:requester")
  async approveVerificationRequest(session: SessionDoc, requester: string) {
    const verificationRequest = await Verifying.getRequestByUser(requester)
    const user = Sessioning.getUser(session);
    const adminStatus = await Authing.isAdmin(user);
    if (!adminStatus) {
      return { error: "You do not have permission to approve requests." };
    }
    const result = await Verifying.approveRequest(requester);
    return result;
  }

  @Router.post("/verification/reject/:requester")
  async rejectVerificationRequest(session: SessionDoc, requester: string) {
    const verificationRequest = await Verifying.getRequestByUser(requester)
    const user = Sessioning.getUser(session);
    const adminStatus = await Authing.isAdmin(user);
    if (!adminStatus) {
      return { error: "You do not have permission to reject requests." };
    }

    const result = await Verifying.rejectRequest(requester);
    return result;
  }

  // Messaging 
  @Router.get("/messages/")
  async viewMessages(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const username = await Authing.idsToUsernames([user]);
    return await Messaging.getMessagesForUser(username[0]);
  }

  @Router.get("/messages/:friend")
  async viewMessagesWith(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const username = await Authing.idsToUsernames([user]);
    return await Messaging.getMessagesBetweenUsers(username[0], friend);
  }

  @Router.post("/messages/send")
  async sendMessage(session: SessionDoc, recipient: string, content: string) {
    const user = Sessioning.getUser(session);
    const username = await Authing.idsToUsernames([user]);
    return await Messaging.sendMessage(username[0], recipient, content);
  }

  @Router.delete("/messages/delete")
  async deleteMessage(session: SessionDoc, recipient: string, time: string) {
    const user = Sessioning.getUser(session);
    const username = await Authing.idsToUsernames([user]);
    const message = await Messaging.messages.readOne({ sender: username[0], recipient, timestamp: new Date(time) });
    if (!message) {
      return { error: "No such message." };
    }
    return await Messaging.deleteMessage(username[0], message._id)
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
