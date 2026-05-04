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
  poco.begin();
  poco.fillRectangle(c.black, 0, 0, poco.width, poco.height);

  if (state.animeList.length === 0) {
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

  poco.fillRectangle(c.highlight, inset, centerY, contentWidth, SELECTED_HEIGHT);
  drawSelectedRow(poco, list[sel], inset, centerY, contentWidth, c);

  let y = centerY - ROW_HEIGHT;
  for (let i = sel - 1; i >= 0 && y + ROW_HEIGHT > 0; i--) {
    drawUnselectedRow(poco, list[i], inset, y, contentWidth, c);
    y -= ROW_HEIGHT;
  }

  y = centerY + SELECTED_HEIGHT;
  for (let i = sel + 1; i < list.length && y < poco.height; i++) {
    drawUnselectedRow(poco, list[i], inset, y, contentWidth, c);
    y += ROW_HEIGHT;
  }

  poco.end();
}

function drawSelectedRow(poco, anime, x, y, w, c) {
  const maxW = w - PADDING * 2;
  const title = truncate(poco, anime.t, c.font, maxW);
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
  const title = truncate(poco, anime.t, c.fontSmall, w - PADDING * 2);
  poco.drawText(title, c.fontSmall, c.dimTitle, x + PADDING, y + 4);

  const ep = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;
  const epW = poco.getTextWidth(ep, c.fontSmall);
  poco.drawText(ep, c.fontSmall, c.darkGray, x + w - epW - PADDING, y + 4 + c.fontSmall.height + 1);
}

function truncate(poco, text, font, maxWidth) {
  if (poco.getTextWidth(text, font) <= maxWidth) return text;
  while (text.length > 1 && poco.getTextWidth(text + "…", font) > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + "…";
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
  if (event !== "press" && event !== "double") return;

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
  } else if (type === "select" && event === "double") {
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
