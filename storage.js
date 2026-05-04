const Storage = {
  async get() {
    return new Promise((resolve) => {
      chrome.storage.local.get("aiUsage", (result) => {
        resolve(result.aiUsage || {});
      });
    });
  },

  async set(platform, percent, extra = {}) {
    const current = await Storage.get();
    current[platform] = {
      percent: Math.min(100, Math.max(0, Math.round(percent))),
      updatedAt: Date.now(),
      ...extra
    };
    return new Promise((resolve) => {
      chrome.storage.local.set({ aiUsage: current }, resolve);
    });
  },

  async getAll() {
    return await Storage.get();
  }
};
