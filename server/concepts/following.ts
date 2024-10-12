import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface FollowerDoc extends BaseDoc {
  follower: ObjectId;
  followed: ObjectId;
}

export interface FollowRequestDoc extends BaseDoc {
  from: ObjectId;
  to: ObjectId;
  status: "pending" | "rejected" | "accepted";
}

/**
 * concept: Friending [User]
 */
export default class FriendingConcept {
  public readonly friends: DocCollection<FollowerDoc>;
  public readonly requests: DocCollection<FollowRequestDoc>;

  /**
   * Make an instance of Friending.
   */
  constructor(collectionName: string) {
    this.friends = new DocCollection<FollowerDoc>(collectionName);
    this.requests = new DocCollection<FollowRequestDoc>(collectionName + "_requests");
  }

  async getRequests(user: ObjectId) {
    return await this.requests.readMany({
      $or: [{ from: user }, { to: user }],
    });
  }

  async sendRequest(from: ObjectId, to: ObjectId) {
    await this.canSendRequest(from, to);
    await this.requests.createOne({ from, to, status: "pending" });
    return { msg: "Sent request!" };
  }

  async acceptRequest(from: ObjectId, to: ObjectId) {
    await this.removePendingRequest(from, to);
    await Promise.all([this.requests.createOne({ from, to, status: "accepted" }), this.addFollower(from, to)]);
    return { msg: "Accepted request!" };
  }

  async rejectRequest(from: ObjectId, to: ObjectId) {
    await this.removePendingRequest(from, to);
    await this.requests.createOne({ from, to, status: "rejected" });
    return { msg: "Rejected request!" };
  }

  async removeRequest(from: ObjectId, to: ObjectId) {
    await this.removePendingRequest(from, to);
    return { msg: "Removed request!" };
  }

  async removeFollower(user: ObjectId, follower: ObjectId) {
    const follow = await this.friends.popOne({ follower, followed: user });
    if (follow === null) {
      throw new FriendNotFoundError(follower, user);
    }
    return { msg: "Removed from followers!" };
  }

  async removeFollowing(user: ObjectId, followed: ObjectId) {
    const follow = await this.friends.popOne({ follower: user, followed });
    if (follow === null) {
      throw new FriendNotFoundError(user, followed);
    }
    return { msg: "Stopped following!" };
  }

  async getFollowers(user: ObjectId) {
    const followers = await this.friends.readMany({ followed: user });
    return followers.map((follower) => follower.follower);
  }

  async getFollowing(user: ObjectId) {
    const followings = await this.friends.readMany({ follower: user });
    return followings.map((following) => following.followed);
  }

  private async addFollower(user1: ObjectId, user2: ObjectId) {
    void this.friends.createOne({ follower: user1, followed: user2 });
  }

  private async removePendingRequest(from: ObjectId, to: ObjectId) {
    const request = await this.requests.popOne({ from, to, status: "pending" });
    if (request === null) {
      throw new FriendRequestNotFoundError(from, to);
    }
    return request;
  }

  private async assertNotFollowing(u1: ObjectId, u2: ObjectId) {
    const friendship = await this.friends.readOne({ follower: u1, following: u2 });
    if (friendship !== null || u1.toString() === u2.toString()) {
      throw new AlreadyFriendsError(u1, u2);
    }
  }

  private async canSendRequest(u1: ObjectId, u2: ObjectId) {
    await this.assertNotFollowing(u1, u2);
    // check if there is pending request between these users
    const request = await this.requests.readOne({
      from: u1,
      to: u2,
      status: "pending",
    });
    if (request !== null) {
      throw new FriendRequestAlreadyExistsError(u1, u2);
    }
  }
}

export class FriendRequestNotFoundError extends NotFoundError {
  constructor(
    public readonly from: ObjectId,
    public readonly to: ObjectId,
  ) {
    super("Follow request from {0} to {1} does not exist!", from, to);
  }
}

export class FriendRequestAlreadyExistsError extends NotAllowedError {
  constructor(
    public readonly from: ObjectId,
    public readonly to: ObjectId,
  ) {
    super("Follow request from {0} to {1} already exists!", from, to);
  }
}

export class FriendNotFoundError extends NotFoundError {
  constructor(
    public readonly user1: ObjectId,
    public readonly user2: ObjectId,
  ) {
    super("Friendship between {0} and {1} does not exist!", user1, user2);
  }
}

export class AlreadyFriendsError extends NotAllowedError {
  constructor(
    public readonly user1: ObjectId,
    public readonly user2: ObjectId,
  ) {
    super("{0} already following {1}!", user1, user2);
  }
}
