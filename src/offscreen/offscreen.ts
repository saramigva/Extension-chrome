import { summarize, type Message } from "../core/messages";
import { scanUrl } from "../core/scan";

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === "offscreen-analyze" && msg.target === "offscreen") {
    scanUrl(msg.url).then(sendResponse, () => sendResponse(null));
    return true;
  }
  if (msg.type !== "offscreen-scan" || msg.target !== "offscreen") return false;
  scanUrl(msg.url, { lite: true }).then(
    (a) => sendResponse(summarize(a)),
    () => sendResponse(null),
  );
  return true;
});
