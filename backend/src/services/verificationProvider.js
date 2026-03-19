export async function verifyWithThirdParty({ fileId, hash }) {
  // Placeholder integration point for an external verification API.
  // Example future flow: POST hash/fileId to provider, store signature/receipt in record.
  return {
    provider: 'placeholder-verifier',
    fileId,
    hash,
    status: 'accepted',
    receiptId: null
  };
}
