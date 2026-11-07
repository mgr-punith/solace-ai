// Browser previews keep custom reminder text in memory only.
let document: string | null = null;
export const reminderStorage = {
  read: async () => document,
  write: async (value: string) => {
    document = value;
  },
  clear: async () => {
    document = null;
  },
};
