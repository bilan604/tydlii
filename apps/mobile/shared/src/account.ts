import { CONTACT_EMAIL } from "./legal";

export type AccountRole = "customer" | "cleaner";

export type AccountDeletionResult =
  | { status: "pending_api"; message: string }
  | { status: "rejected"; message: string };

/**
 * Store-review stub. Apple requires an in-app deletion path once accounts exist.
 * This does not call the network. The future API should delete the profile and sign the device out.
 */
export function requestAccountDeletion(input: {
  role: AccountRole;
  confirmed: boolean;
}): AccountDeletionResult {
  if (input.role !== "customer" && input.role !== "cleaner") {
    return { status: "rejected", message: "Choose the customer or cleaner profile." };
  }
  if (!input.confirmed) {
    return { status: "rejected", message: "Confirm deletion to continue." };
  }
  return {
    status: "pending_api",
    message: `Not sent. The account API is not connected yet. Email ${CONTACT_EMAIL} to ask for deletion. When the API is connected, this will delete the Tydlii profile on this email, including customer and cleaner, and sign you out. This request was started as ${input.role}.`,
  };
}
