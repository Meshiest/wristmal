const SELECTED_HEIGHT = 64;
const ROW_HEIGHT = 44;
const PADDING = 10;
let cachedColors = null;

function initColors(poco, colors) {
  if (cachedColors) return cachedColors;
  cachedColors = {
    black: colors.black,
    white: colors.white,
    gray: colors.gray,
    darkGray: colors.darkGray,
    gold: colors.gold,
    font: colors.font,
    fontSmall: colors.fontSmall,
    highlight: poco.makeColor(0x00, 0x22, 0x44),
    dimTitle: poco.makeColor(160, 160, 160),
    subText: poco.makeColor(200, 200, 200),
  };
  return cachedColors;
}


export function render(poco, state, colors) {
  const c = initColors(poco, colors);
  invalidateCache(state);
  poco.begin();

  if (state.animeList.length === 0) {
    poco.fillRectangle(c.black, 0, 0, poco.width, poco.height);
    const msg = state.loading ? "Loading..." : "No shows watching";
    const w = poco.getTextWidth(msg, c.font);
    poco.drawText(msg, c.font, c.gray, (poco.width - w) >> 1, (poco.height - c.font.height) >> 1);
    if (state.error) {
      const ew = poco.getTextWidth(state.error, c.fontSmall);
      poco.drawText(state.error, c.fontSmall, c.gold,
        (poco.width - ew) >> 1, (poco.height >> 1) + 30);
    }
    poco.end();
    return;
  }

  const inset = screen.round ? 20 : 0;
  const contentWidth = poco.width - inset * 2;
  const list = state.animeList;
  const sel = state.selectedIndex;
  const cy = ((poco.height - SELECTED_HEIGHT) >> 1);

  const textY = cy;
  const hlY = cy;

  // Above rows (positioned by text offset)
  let aboveCount = 0;
  for (let i = sel - 1; i >= 0; i--) {
    if (textY - (sel - i) * ROW_HEIGHT + ROW_HEIGHT <= 0) break;
    aboveCount = sel - i;
  }

  const firstRowY = textY - aboveCount * ROW_HEIGHT;
  if (firstRowY > 0)
    poco.fillRectangle(c.black, 0, 0, poco.width, firstRowY);

  for (let n = aboveCount; n >= 1; n--) {
    const ry = textY - n * ROW_HEIGHT;
    poco.fillRectangle(c.black, 0, ry, poco.width, ROW_HEIGHT);
    drawUnselectedRow(poco, list[sel - n], inset, ry, contentWidth, c);
  }

  // Selected row: highlight uses hlY, text uses textY
  poco.fillRectangle(c.highlight, 0, hlY, poco.width, SELECTED_HEIGHT);
  drawSelectedRow(poco, list[sel], inset, textY, contentWidth, c, state.updating);

  // Below rows (positioned by text offset)
  let y = textY + SELECTED_HEIGHT;
  for (let i = sel + 1; i < list.length && y < poco.height; i++) {
    poco.fillRectangle(c.black, 0, y, poco.width, ROW_HEIGHT);
    drawUnselectedRow(poco, list[i], inset, y, contentWidth, c);
    y += ROW_HEIGHT;
  }

  if (y < poco.height)
    poco.fillRectangle(c.black, 0, y, poco.width, poco.height - y);

  poco.end();
}

function drawSelectedRow(poco, anime, x, y, w, c, updating) {
  const maxW = w - PADDING * 2;
  const title = truncate(poco, anime.t, c.font, maxW, "s" + anime.id);
  poco.drawText(title, c.font, c.white, x + PADDING, y + 6);

  if (updating) {
    const updStr = "Updating...";
    const updW = poco.getTextWidth(updStr, c.fontSmall);
    poco.drawText(updStr, c.fontSmall, c.gray, x + ((w - updW) >> 1), y + 6 + c.font.height + 4);
    return;
  }

  const scoreStr = anime.score > 0 ? `★ ${anime.score}` : "";
  const ep = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;

  if (scoreStr) {
    poco.drawText(scoreStr, c.font, c.gold, x + PADDING, y + 6 + c.font.height);
  }
  const epW = poco.getTextWidth(ep, c.font);
  poco.drawText(ep, c.font, c.subText, x + w - epW - PADDING, y + 6 + c.font.height);
}

function drawUnselectedRow(poco, anime, x, y, w, c) {
  const title = truncate(poco, anime.t, c.fontSmall, w - PADDING * 2, "u" + anime.id);
  poco.drawText(title, c.fontSmall, c.dimTitle, x + PADDING, y + 4);

  const ep = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;
  const epW = poco.getTextWidth(ep, c.fontSmall);
  poco.drawText(ep, c.fontSmall, c.darkGray, x + w - epW - PADDING, y + 4 + c.fontSmall.height + 1);
}

let titleCache = new Map();
let lastListLen = -1;

function truncate(poco, text, font, maxWidth, cacheKey) {
  const key = cacheKey || text + maxWidth;
  if (titleCache.has(key)) return titleCache.get(key);
  let result = text;
  if (poco.getTextWidth(text, font) > maxWidth) {
    while (result.length > 1 && poco.getTextWidth(result + "…", font) > maxWidth) {
      result = result.slice(0, -1);
    }
    result = result + "…";
  }
  titleCache.set(key, result);
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
