export function isCrisis(input: string): boolean {
  const text = input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b(?:i am|i'm|i feel) not suicidal\b/g, '')
    .replace(/\bi (?:do not|don't) want to (?:hurt|kill|harm) myself\b/g, '');
  return [
    /\b(?:kill|hurt|harm|cut) (?:myself|herself|himself|themselves)\b/,
    /\b(?:end|take) my (?:own )?life\b/,
    /\b(?:want|wish|ready|going|plan(?:ning)?) to (?:die|commit suicide)\b/,
    /\b(?:wish|hope) i (?:was|were|could be) dead\b/,
    /\b(?:suicidal|suicide plan|thoughts of suicide|thinking about suicide|self[- ]harm)\b/,
    /\b(?:don't|do not|can't|cannot) (?:want to )?(?:live|go on living)\b/,
    /\b(?:took|taken|taking|take) (?:an? |too many pills|.*? )?overdose\b/,
    /\b(?:took|taken) too many (?:pills|tablets)\b/,
    /\b(?:in immediate danger|not safe right now|going to hurt someone)\b/,
    /\bmujhe marna hai\b/,
    /मैं मरना (?:चाहता|चाहती)/,
  ].some((pattern) => pattern.test(text));
}
export const crisisReply =
  "I'm glad you told me. You deserve support through this. If you might act on these thoughts or are in immediate danger, please contact local emergency services now and reach someone you trust who can stay with you. Open Need support now for local crisis support. Can you reach someone nearby while we keep talking?";
export const unavailableReply =
  "I couldn't get a reply from Sol right now. Your message is saved. You can retry this message in a moment. If you need urgent help, open Need support now.";
