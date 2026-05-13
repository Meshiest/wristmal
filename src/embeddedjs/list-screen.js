const SELECTED_HEIGHT = 72;
const ROW_HEIGHT = 28;
const STATUS_HEIGHT = 28;
const PADDING = 10;

let cachedColors = null;

function initColors(poco, colors) {
  if (cachedColors) return cachedColors;
  cachedColors = {
    white: colors.white,
    black: colors.black,
    gold: colors.gold,
    font: colors.font,
    fontSmall: colors.fontSmall,
    highlight: poco.makeColor(0x55, 0xAA, 0xFF),
    subText: poco.makeColor(0x55, 0x55, 0x55),
    selSub: poco.makeColor(0x00, 0x00, 0x55),
    statusText: poco.makeColor(0x55, 0x55, 0x55),
    statusLine: poco.makeColor(0x55, 0x55, 0x55),
  };
  return cachedColors;
}

function getTimeStr() {
  const now = new Date();
  let h = now.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

let batteryLevel = null;

function initBattery() {
  if (batteryLevel !== null) return;
  try {
    const Battery = device.sensor.Battery;
    if (Battery) {
      const bat = new Battery();
      bat.start();
      batteryLevel = bat.level || 0;
    }
  } catch (e) {
    // Battery sensor not available
  }
}

function getBatteryStr() {
  initBattery();
  if (batteryLevel === null) return "";
  return `${batteryLevel}%`;
}

export function render(poco, state, colors) {
  const c = initColors(poco, colors);
  invalidateCache(state);
  poco.begin();
  poco.fillRectangle(c.white, 0, 0, poco.width, poco.height);

  if (state.animeList.length === 0) {
    const msg = state.loading ? "Loading..." : "No shows watching";
    const w = poco.getTextWidth(msg, c.font);
    poco.drawText(msg, c.font, c.subText, (poco.width - w) >> 1, (poco.height - c.font.height) >> 1);
    if (state.error) {
      const ew = poco.getTextWidth(state.error, c.fontSmall);
      poco.drawText(state.error, c.fontSmall, c.gold,
        (poco.width - ew) >> 1, (poco.height >> 1) + 30);
    }
    poco.end();
    return;
  }

  const list = state.animeList;
  const sel = state.selectedIndex;
  const contentTop = STATUS_HEIGHT;
  const contentHeight = poco.height - contentTop;

  // Selected row is always vertically centered
  const centerY = contentTop + ((contentHeight - SELECTED_HEIGHT) >> 1);

  // Draw unselected rows above
  let y = centerY - ROW_HEIGHT;
  for (let i = sel - 1; i >= 0 && y + ROW_HEIGHT > contentTop; i--) {
    poco.fillRectangle(c.white, 0, y, poco.width, ROW_HEIGHT);
    drawSmallRow(poco, list[i], y, c);
    y -= ROW_HEIGHT;
  }

  // Selected row (larger)
  poco.fillRectangle(c.highlight, 0, centerY, poco.width, SELECTED_HEIGHT);
  drawSelectedRow(poco, list[sel], centerY, state.updating, c);

  // Draw unselected rows below
  y = centerY + SELECTED_HEIGHT;
  for (let i = sel + 1; i < list.length && y < poco.height; i++) {
    poco.fillRectangle(c.white, 0, y, poco.width, ROW_HEIGHT);
    drawSmallRow(poco, list[i], y, c);
    y += ROW_HEIGHT;
  }

  // Status bar (drawn last, on top of rows)
  poco.fillRectangle(c.white, 0, 0, poco.width, STATUS_HEIGHT);
  const battStr = getBatteryStr();
  if (battStr) {
    poco.drawText(battStr, c.fontSmall, c.black, PADDING, 4);
  }
  const timeStr = getTimeStr();
  const tw = poco.getTextWidth(timeStr, c.fontSmall);
  poco.drawText(timeStr, c.fontSmall, c.black, poco.width - tw - PADDING, 4);
  poco.fillRectangle(c.statusLine, 0, STATUS_HEIGHT - 1, poco.width, 1);

  poco.end();
}

function drawSelectedRow(poco, anime, y, updating, c) {
  const title = truncate(poco, anime.t, c.font, poco.width - PADDING * 2, "s" + anime.id);
  poco.drawText(title, c.font, c.black, PADDING, y + 6);

  const ep = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;
  const scoreStr = anime.score > 0 ? `★ ${anime.score}` : "";

  if (updating) {
    const updStr = "Updating...";
    const updW = poco.getTextWidth(updStr, c.fontSmall);
    poco.drawText(updStr, c.fontSmall, c.selSub,
      poco.width - updW - PADDING, y + 8 + c.font.height);
  } else {
    const epW = poco.getTextWidth(ep, c.font);
    poco.drawText(ep, c.font, c.selSub, poco.width - epW - PADDING, y + 6 + c.font.height);
  }

  if (scoreStr) {
    poco.drawText(scoreStr, c.font, c.selSub, PADDING, y + 6 + c.font.height);
  }
}

function drawSmallRow(poco, anime, y, c) {
  const ep = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;
  const epW = poco.getTextWidth(ep, c.fontSmall);
  const titleMax = poco.width - epW - PADDING * 3;
  const title = truncate(poco, anime.t, c.fontSmall, titleMax, "u" + anime.id);

  poco.drawText(title, c.fontSmall, c.black, PADDING, y + 4);
  poco.drawText(ep, c.fontSmall, c.black, poco.width - epW - PADDING, y + 4);
}

let titleCache = new Map();
let lastListLen = -1;

function truncate(poco, text, font, maxWidth, cacheKey) {
  if (titleCache.has(cacheKey)) return titleCache.get(cacheKey);
  let result = text;
  if (poco.getTextWidth(text, font) > maxWidth) {
    while (result.length > 1 && poco.getTextWidth(result + "..", font) > maxWidth) {
      result = result.slice(0, -1);
    }
    result = result + "..";
  }
  titleCache.set(cacheKey, result);
  return result;
}

function invalidateCache(state) {
  if (state.animeList.length !== lastListLen) {
    titleCache = new Map();
    lastListLen = state.animeList.length;
  }
}

export function handleButton(type, event, state, actions) {
  if (event !== "press" && event !== "double" && event !== "long") return;

  const list = state.animeList;
  if (list.length === 0) return;

  if (type === "up" && event === "press") {
    if (state.selectedIndex > 0) {
      state.selectedIndex--;
      actions.redraw();
    }
  } else if (type === "down" && event === "press") {
    if (state.selectedIndex < list.length - 1) {
      state.selectedIndex++;
      actions.redraw();
    }
  } else if (type === "select" && event === "press") {
    actions.pushScreen("editMenu", { anime: list[state.selectedIndex] });
  } else if (type === "select" && (event === "double" || event === "long")) {
    const anime = list[state.selectedIndex];
    if (anime.total > 0 && anime.ep + 1 >= anime.total) {
      actions.pushScreen("confirm", { anime });
    } else {
      anime.ep++;
      state.updating = true;
      actions.redraw();
      actions.sendCommand(1, anime.id);
    }
  }
}
