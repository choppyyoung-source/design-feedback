const EMOJIS = [
  "🎨", "✨", "🚀", "💎", "🌈", "🎯", "⚡", "🔮",
  "🌸", "🎭", "🦋", "🍀", "🌙", "🎪", "🧊", "🪐",
  "🎵", "🌊", "🍊", "🫧", "🪴", "🧸", "🎲", "🪄",
];

/** Deterministic emoji from email string */
export function getEmoji(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) | 0;
  }
  return EMOJIS[Math.abs(hash) % EMOJIS.length];
}
