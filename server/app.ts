import AuthenticatingConcept from "./concepts/authenticating";
import FollowingConcept from "./concepts/following";
import MessagingConcept from "./concepts/messaging";
import PostingConcept from "./concepts/posting";
import SessioningConcept from "./concepts/sessioning";
import VerifyingConcept from "./concepts/verifying";
import DiscussingConcept from "./concepts/discussing";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Following = new FollowingConcept("follow");
export const Verifying = new VerifyingConcept("verification")
export const Messaging = new MessagingConcept("messages")
export const Discussing = new DiscussingConcept("discussion")
