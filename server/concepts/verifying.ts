import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface VerificationRequestDoc extends BaseDoc {
  user: ObjectId;
  credentials: string;
}

export interface VerifiedDoc extends BaseDoc {
  user: ObjectId;
}

/**
 * concept: Verifying[User]
 */
export default class VerifyingConcept {
  public readonly verificationRequests: DocCollection<VerificationRequestDoc>;
  public readonly verified: DocCollection<VerifiedDoc>;

  constructor(collectionName: string) {
    this.verificationRequests = new DocCollection<VerificationRequestDoc>(collectionName);
    this.verified = new DocCollection<VerifiedDoc>("verified");
    void this.verificationRequests.collection.createIndex({ userId: 1 });
  }

  async createVerificationRequest(user: ObjectId, credentials: string) {
    await this.assertValidRequest(user, credentials);
    const _id = await this.verificationRequests.createOne({ user, credentials});
    return { msg: "Verification request created successfully!", request: await this.verificationRequests.readOne({ user }) };
  }

  async getRequestByUser(user: ObjectId) {
    const request = await this.verificationRequests.readOne({ user });
    if (request === null) {
      throw new NotFoundError(`Verification request not found!`);
    }
    return request;
  }

  async isVerified(user: ObjectId) {
    const verifiedStatus = await this.verified.readOne({ user });
    if (!verifiedStatus) {
      return false;
    }
    return true;
  }

  async getAllRequests() {
    const requests = await this.verificationRequests.readMany({});
    return requests;
  }

  async getAllVerified() {
    const verifiedUsers = await this.verified.readMany({});
    return verifiedUsers; 
  }

  async approveRequest(user: ObjectId) {
    const request = await this.verificationRequests.readOne({ user });
    if (!request) {
      throw new NotFoundError("Verification request not found.");
    }
    await this.verified.createOne({ user });
    await this.verificationRequests.deleteOne({ user: user });
    return { msg: "Verification request approved successfully!" };
  }

  async rejectRequest(user: ObjectId, reason?: string) {
    const request = await this.verificationRequests.readOne({ user });
    if (!request) {
      throw new NotFoundError("Verification request not found.");
    }
    await this.verificationRequests.deleteOne({ user: user });
    return { msg: `Verification request rejected. ${reason ? "Reason: " + reason : ""}` };
  }

  async deleteVerified(user: ObjectId, reason?: string) {
    const verifiedUser = await this.verified.readOne({user});
    if (!verifiedUser) {
      throw new NotFoundError("User is not verified.")
    }
    await this.verified.deleteOne({ user: user });
    return { msg: `Verification removed. ${reason ? "Reason: " + reason : ""}` };
  }
 
  private async assertValidRequest(user: ObjectId, credentials: string) {
    if (!user || !credentials) {
      throw new BadValuesError("User ID and credentials must be non-empty!");
    }
    if (await this.verified.readOne({ user })) {
      throw new NotAllowedError(`User is already verified!`);
    }
    if (await this.verificationRequests.readOne({ user })) {
      throw new NotAllowedError(`User with ID ${user} already has a pending request!`);
    }
  }
}