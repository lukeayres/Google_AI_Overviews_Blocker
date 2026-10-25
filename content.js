const AI_OVERVIEW_PATTERNS = [
  /übersicht mit ki/i,
  /ai overview/i,
  /prezentare generală generată de ai/i,
  /AI による概要/,
  /Обзор от ИИ/,
  /AI 摘要/,
  /AI-overzicht/i,
  /AI-oversigt/i,
  /Vista creada con IA/i,
  /Přehled od AI/i,
  /Aperçu IA/i,
];

const AI_OVERVIEW_SELECTORS = {
  SEARCH_RESULT_SELECTOR: "div#rso > div",
  ABOVE_SEARCH_RESULTS_SELECTOR: "div#rcnt > div",
};

const DOM_SELECTORS = {
  MAIN_BODY: "div#rcnt",
  MAIN_BODY_MOBILE: "div#center_col",
  HEADER_TABS: "div#hdtb-sc > div",
  MAIN_ELEMENT: '[role="main"]',
  PEOPLE_ALSO_ASK: "div.related-question-pair",
  TABS_LIST: '[role="list"]',
  THINGS_TO_KNOW: "[data-maindata]",
};

const CSS_VALUES = {
  HIDDEN: "none",
  HEADER_PADDING: "12px",
  MAIN_MARGIN: "24px",
};

const TAB_PATTERNS = {
  AI_MODE: /^AI Mode$/i,
};

function getAiContainerParent(startEl) {
  let el = startEl;

  while (el && el.parentElement) {
    const parent = el.parentElement;

    if (parent.id === "rso") {
      return el;
    }

    if (parent.id === "rcnt") {
      return el;
    }

    el = parent;
  }

  return startEl;
}

function getThingsToKnowContainer(startEl) {
  let el = startEl;

  while (el && el.parentElement) {
    const parent = el.parentElement;

    if (parent.parentElement?.id === "rso") {
      return el;
    }

    el = parent;
  }
}

const getAiOverview = (mainBody) => {
  if (!mainBody) return null;

  const inner =
    mainBody.querySelector('[data-async-type="folsrch"]') ||
    mainBody.querySelector('[id^="folsrch"]');

  if (inner) {
    const block = getAiContainerParent(inner);
    if (block) {
      return block;
    }
  }

  return null;
};

const getThingsToKnow = () => {
  const thingsToKnow = document.querySelectorAll('[data-maindata]:not([data-bkt])');
  for (const el of thingsToKnow) {
    const block = getThingsToKnowContainer(el);
    if (block) {
      return block;
    }
  }
};

const isAiOverviewPaaTab = (el) => {
  if (!el) return false;

  if (!el || !el.matches("div.related-question-pair")) return false;

  if (el.querySelector("[data-evn]")) return true;

  if (el.querySelector('[data-subtree~="aimc"], [data-subtree="aimc"]')) {
    return true;
  }

  if (el.querySelector('[data-subtree="aimfl,mfl"], [data-subtree="aimfl"]')) {
    return true;
  }

  if (AI_OVERVIEW_PATTERNS.some((pattern) => pattern.test(el.innerText))) {
    return true;
  }

  return false;
};

const originalStyles = new Map();
let enabled = false;

function applyStyle(element, property, value) {
  if (!element) return;
  if (!originalStyles.has(element)) originalStyles.set(element, new Map());
  const properties = originalStyles.get(element);
  if (!properties.has(property)) {
    properties.set(property, {
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    });
  }
  element.style.setProperty(property, value);
}

function applyBlocking() {
  if (!enabled) return;
  const mainBody =
    document.querySelector(DOM_SELECTORS.MAIN_BODY) ||
    document.querySelector(DOM_SELECTORS.MAIN_BODY_MOBILE);

  const aiOverview = getAiOverview(mainBody);

  applyStyle(aiOverview, "display", CSS_VALUES.HIDDEN);

  const headerTabs = document.querySelector(DOM_SELECTORS.HEADER_TABS);
  applyStyle(headerTabs, "padding-bottom", CSS_VALUES.HEADER_PADDING);

  const mainElement = document.querySelector(DOM_SELECTORS.MAIN_ELEMENT);
  if (mainElement) {
    applyStyle(mainElement, "margin-top", CSS_VALUES.MAIN_MARGIN);
  }

  const peopleAlsoAskAiOverviews = [
    ...document.querySelectorAll(DOM_SELECTORS.PEOPLE_ALSO_ASK),
  ].filter(isAiOverviewPaaTab);

  const thingsToKnow = getThingsToKnow();
  if (thingsToKnow) {
    applyStyle(thingsToKnow, "display", CSS_VALUES.HIDDEN);
  }

  const tabsList = document.querySelector(DOM_SELECTORS.TABS_LIST)?.children;
  if (tabsList?.length) {
    const aiModeTab = tabsList[0];
    const text = aiModeTab.innerText.trim();

    if (TAB_PATTERNS.AI_MODE.test(text)) {
      applyStyle(aiModeTab, "display", CSS_VALUES.HIDDEN);
    }
  }
}

const observer = new MutationObserver(applyBlocking);

function setEnabled(value) {
  enabled = value;
  observer.disconnect();
  if (enabled) {
    observer.observe(document, { childList: true, subtree: true });
    applyBlocking();
  } else {
    for (const [element, properties] of originalStyles) {
      for (const [property, original] of properties) {
        if (original.value) {
          element.style.setProperty(property, original.value, original.priority);
        } else {
          element.style.removeProperty(property);
        }
      }
    }
    originalStyles.clear();
  }
}

let stateChanged = false;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) {
    stateChanged = true;
    setEnabled(changes.enabled.newValue !== false);
  }
});
chrome.storage.local.get("enabled").then(({ enabled = true }) => {
  if (!stateChanged) setEnabled(enabled);
}).catch(console.error);
