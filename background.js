async function updateIcon(enabled) {
  const state = enabled ? "enabled" : "disabled";
  await Promise.all([
    chrome.action.setIcon({
      path: {
        16: `icons/${state}16.png`,
        48: `icons/${state}48.png`,
        128: `icons/${state}128.png`,
      },
    }),
    chrome.action.setTitle({
      title: enabled
        ? "AI Overviews blocker: ON - click to disable"
        : "AI Overviews blocker: OFF - click to enable",
    }),
  ]);
}

async function syncIcon() {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  await updateIcon(enabled);
}

let pendingToggle = Promise.resolve();
chrome.action.onClicked.addListener(() => {
  pendingToggle = pendingToggle.then(async () => {
    const { enabled = true } = await chrome.storage.local.get("enabled");
    await chrome.storage.local.set({ enabled: !enabled });
    await updateIcon(!enabled);
  }).catch(console.error);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) {
    pendingToggle = pendingToggle.then(syncIcon).catch(console.error);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  pendingToggle = pendingToggle.then(syncIcon).catch(console.error);
});
chrome.runtime.onStartup.addListener(() => {
  pendingToggle = pendingToggle.then(syncIcon).catch(console.error);
});
