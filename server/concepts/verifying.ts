import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface VerificationRequestDoc extends BaseDoc {
  userId: ObjectId;
  credentials: string;
  status: "pending" | "approved" | "rejected";
}

/**
 * concept: Verifying
 */
export default class VerifyingConcept {
  public readonly verificationRequests: DocCollection<VerificationRequestDoc>;

  /**
   * Make an instance of Verifying.
   */
  constructor(collectionName: string) {
    this.verificationRequests = new DocCollection<VerificationRequestDoc>(collectionName);

    void this.verificationRequests.collection.createIndex({ userId: 1 });
  }

  async createVerificationRequest(userId: ObjectId, credentials: string) {
    await this.assertValidRequest(userId, credentials);
    const _id = await this.verificationRequests.createOne({ userId, credentials, status: "pending" });
    return { msg: "Verification request created successfully!", request: await this.verificationRequests.readOne({ _id }) };
  }

  async getRequestById(_id: ObjectId) {
    const request = await this.verificationRequests.readOne({ _id });
    if (request === null) {
      throw new NotFoundError(`Verification request not found!`);
    }
    return request;
  }

  async getRequestByUserId(userId: ObjectId) {
    const request = await this.verificationRequests.readOne({ userId });
    if (request === null) {
      throw new NotFoundError(`Verification request not found!`);
    }
    return request;
  }

  async approveRequest(_id: ObjectId) {
    const request = await this.verificationRequests.readOne({ _id });
    if (!request) {
      throw new NotFoundError("Verification request not found.");
    }
    await this.verificationRequests.partialUpdateOne({ _id }, { status: "approved" });
    return { msg: "Verification request approved successfully!" };
  }

  async rejectRequest(_id: ObjectId, reason?: string) {
    const request = await this.verificationRequests.readOne({ _id });
    if (!request) {
      throw new NotFoundError("Verification request not found.");
    }
    await this.verificationRequests.partialUpdateOne({ _id }, { status: "rejected" });
    return { msg: `Verification request rejected. ${reason ? "Reason: " + reason : ""}` };
  }

  async deleteRequest(_id: ObjectId) {
    await this.verificationRequests.deleteOne({ _id });
    return { msg: "Verification request deleted!" };
  }

  private async assertValidRequest(userId: ObjectId, credentials: string) {
    if (!userId || !credentials) {
      throw new BadValuesError("User ID and credentials must be non-empty!");
    }
    if (await this.verificationRequests.readOne({ userId })) {
      throw new NotAllowedError(`User with ID ${userId} already has a pending request!`);
    }
  }
}