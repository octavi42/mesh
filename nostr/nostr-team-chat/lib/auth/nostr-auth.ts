export class NostrAuth {
  static async verifyPubkeyOwnership(expectedPubkey: string): Promise<boolean> {
    try {
      if (!window.nostr) {
        return false;
      }

      const pubkey = await window.nostr.getPublicKey();
      return pubkey === expectedPubkey;
    } catch (error) {
      console.error('Failed to verify pubkey ownership:', error);
      return false;
    }
  }
}
