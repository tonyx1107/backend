import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface VerificationRequestDoc extends BaseDoc {
  username: string;
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

  async createVerificationRequest(username: string, credentials: string) {
    await this.assertValidRequest(username, credentials);
    const _id = await this.verificationRequests.createOne({ username, credentials, status: "pending" });
    return { msg: "Verification request created successfully!", request: await this.verificationRequests.readOne({ username }) };
  }

  async getRequestByUser(username: string) {
    const request = await this.verificationRequests.readOne({ username });
    if (request === null) {
      throw new NotFoundError(`Verification request not found!`);
    }
    return request;
  }

  async approveRequest(username: string) {
    const request = await this.verificationRequests.readOne({ username });
    if (!request) {
      throw new NotFoundError("Verification request not found.");
    }
    await this.verificationRequests.partialUpdateOne({ username }, { status: "approved" });
    return { msg: "Verification request approved successfully!" };
  }

  async rejectRequest(username: string, reason?: string) {
    const request = await this.verificationRequests.readOne({ username });
    if (!request) {
      throw new NotFoundError("Verification request not found.");
    }
    await this.verificationRequests.partialUpdateOne({ username }, { status: "rejected" });
    return { msg: `Verification request rejected. ${reason ? "Reason: " + reason : ""}` };
  }

  async deleteRequest(username: string) {
    await this.verificationRequests.deleteOne({ username });
    return { msg: "Verification request deleted!" };
  }

  private async assertValidRequest(username: string, credentials: string) {
    if (!username || !credentials) {
      throw new BadValuesError("User ID and credentials must be non-empty!");
    }
    if (await this.verificationRequests.readOne({ username })) {
      throw new NotAllowedError(`User with ID ${username} already has a pending request!`);
    }
  }
}