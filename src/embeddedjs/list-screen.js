const SELECTED_HEIGHT = 64;
const ROW_HEIGHT = 44;
const PADDING = 10;
const ANIM_DURATION = 250;
const BOUNCE = 8;

let animState = null;
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function wobble(fraction, from, to, overshoot) {
  const f = Math.quadEaseOut(fraction) * 4;
  if (f < 3) return lerp(from, overshoot, f / 3);
  return lerp(overshoot, to, f - 3);
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

  const restCenterY = (poco.height - SELECTED_HEIGHT) >> 1;
  let offsetY = 0;

  if (animState) {
    const elapsed = Date.now() - animState.startTime;
    const progress = Math.min(1, elapsed / ANIM_DURATION);
    offsetY = wobble(progress, animState.fromOffset, 0, animState.overshoot);
    if (progress >= 1) animState = null;
  }

  const centerY = restCenterY + Math.round(offsetY);

  // Count how many rows fit above
  let aboveCount = 0;
  for (let i = sel - 1; i >= 0; i--) {
    const ry = centerY - (sel - i) * ROW_HEIGHT;
    if (ry + ROW_HEIGHT <= 0) break;
    aboveCount = sel - i;
  }

  // Top black fill
  const firstRowY = centerY - aboveCount * ROW_HEIGHT;
  if (firstRowY > 0)
    poco.fillRectangle(c.black, 0, 0, poco.width, firstRowY);

  // Draw above rows top-to-bottom
  for (let n = aboveCount; n >= 1; n--) {
    const ry = centerY - n * ROW_HEIGHT;
    poco.fillRectangle(c.black, 0, ry, poco.width, ROW_HEIGHT);
    drawUnselectedRow(poco, list[sel - n], inset, ry, contentWidth, c);
  }

  // Selected row
  poco.fillRectangle(c.highlight, 0, centerY, poco.width, SELECTED_HEIGHT);
  drawSelectedRow(poco, list[sel], inset, centerY, contentWidth, c);

  // Below rows
  let y = centerY + SELECTED_HEIGHT;
  for (let i = sel + 1; i < list.length && y < poco.height; i++) {
    poco.fillRectangle(c.black, 0, y, poco.width, ROW_HEIGHT);
    drawUnselectedRow(poco, list[i], inset, y, contentWidth, c);
    y += ROW_HEIGHT;
  }

  // Bottom black fill
  if (y < poco.height)
    poco.fillRectangle(c.black, 0, y, poco.width, poco.height - y);

  poco.end();
}

function drawSelectedRow(poco, anime, x, y, w, c) {
  const maxW = w - PADDING * 2;
  const title = truncate(poco, anime.t, c.font, maxW, "s" + anime.id);
  poco.drawText(title, c.font, c.white, x + PADDING, y + 6);

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

let animTimer = null;
let _poco = null;
let _colors = null;

function startAnim(direction, poco, state, colors) {
  const shift = direction > 0 ? ROW_HEIGHT : -ROW_HEIGHT;
  const bounce = direction > 0 ? -BOUNCE : BOUNCE;

  animState = {
    startTime: Date.now(),
    fromOffset: shift,
    overshoot: bounce,
  };

  if (animTimer) clearInterval(animTimer);
  animTimer = setInterval(() => {
    render(poco, state, colors);
    if (!animState) {
      clearInterval(animTimer);
      animTimer = null;
    }
  }, 33);
}

export function handleButton(type, event, state, actions) {
  if (event !== "press" && event !== "double" && event !== "long") return;

  const list = state.animeList;
  if (list.length === 0) return;

  if (!_poco || !_colors) {
    _poco = actions._poco;
    _colors = actions._colors;
  }

  if (type === "up" && event === "press") {
    if (state.selectedIndex > 0) {
      state.selectedIndex--;
      if (_poco) startAnim(-1, _poco, state, _colors);
      else actions.redraw();
    }
  } else if (type === "down" && event === "press") {
    if (state.selectedIndex < list.length - 1) {
      state.selectedIndex++;
      if (_poco) startAnim(1, _poco, state, _colors);
      else actions.redraw();
    }
  } else if (type === "select" && event === "press") {
    if (animTimer) { clearInterval(animTimer); animTimer = null; animState = null; }
    actions.pushScreen("editMenu", { anime: list[state.selectedIndex] });
  } else if (type === "select" && (event === "double" || event === "long")) {
    if (animTimer) { clearInterval(animTimer); animTimer = null; animState = null; }
    const anime = list[state.selectedIndex];
    if (anime.total > 0 && anime.ep + 1 >= anime.total) {
      actions.pushScreen("confirm", { anime });
    } else {
      anime.ep++;
      actions.redraw();
      actions.sendCommand(1, anime.id);
    }
  }
}
