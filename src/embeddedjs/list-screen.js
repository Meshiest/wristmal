const SELECTED_HEIGHT = 64;
const ROW_HEIGHT = 44;
const PADDING = 10;
const ANIM_DURATION = 250;
const BOUNCE = 8;
const HIGHLIGHT = { r: 0x00, g: 0x1a, b: 0x3a };

let animState = null;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function wobble(fraction, from, to, overshoot) {
  const f = Math.quadEaseOut(fraction) * 4;
  if (f < 3) {
    return lerp(from, overshoot, f / 3);
  }
  return lerp(overshoot, to, f - 3);
}

export function render(poco, state, colors) {
  const { black, white, gray, darkGray, blue, gold, font, fontSmall } = colors;
  poco.begin();
  poco.fillRectangle(black, 0, 0, poco.width, poco.height);

  if (state.animeList.length === 0) {
    const msg = state.loading ? "Loading..." : "No shows watching";
    const w = poco.getTextWidth(msg, font);
    poco.drawText(msg, font, gray, (poco.width - w) >> 1, (poco.height - font.height) >> 1);
    if (state.error) {
      const ew = poco.getTextWidth(state.error, fontSmall);
      poco.drawText(state.error, fontSmall, gold,
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

  const centerY = restCenterY + offsetY;

  const highlightColor = poco.makeColor(HIGHLIGHT.r, HIGHLIGHT.g, HIGHLIGHT.b);
  poco.fillRectangle(highlightColor, inset, centerY, contentWidth, SELECTED_HEIGHT);
  drawRow(poco, list[sel], true, inset, centerY, contentWidth, SELECTED_HEIGHT, colors);

  let y = centerY - ROW_HEIGHT;
  for (let i = sel - 1; i >= 0 && y + ROW_HEIGHT > 0; i--) {
    drawRow(poco, list[i], false, inset, y, contentWidth, ROW_HEIGHT, colors);
    y -= ROW_HEIGHT;
  }

  y = centerY + SELECTED_HEIGHT;
  for (let i = sel + 1; i < list.length && y < poco.height; i++) {
    drawRow(poco, list[i], false, inset, y, contentWidth, ROW_HEIGHT, colors);
    y += ROW_HEIGHT;
  }

  poco.end();
}

function truncate(poco, text, font, maxWidth) {
  if (poco.getTextWidth(text, font) <= maxWidth) return text;
  while (text.length > 1 && poco.getTextWidth(text + "…", font) > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + "…";
}

function drawRow(poco, anime, selected, x, y, w, h, colors) {
  const { black, white, gray, darkGray, gold, font, fontSmall } = colors;
  const titleColor = selected ? white : poco.makeColor(160, 160, 160);
  const subColor = selected ? poco.makeColor(200, 200, 200) : darkGray;

  const title = truncate(poco, anime.t, selected ? font : fontSmall, w - PADDING * 2);

  if (selected) {
    poco.drawText(title, font, titleColor, x + PADDING, y + 6);

    const scoreStr = anime.score > 0 ? `★ ${anime.score}` : "";
    const ep = anime.total > 0 ? `EP ${anime.ep}/${anime.total}` : `EP ${anime.ep}/?`;

    if (scoreStr) {
      poco.drawText(scoreStr, font, gold, x + PADDING, y + 6 + font.height);
    }
    const epW = poco.getTextWidth(ep, font);
    poco.drawText(ep, font, subColor, x + w - epW - PADDING, y + 6 + font.height);
  } else {
    poco.drawText(title, fontSmall, titleColor, x + PADDING, y + 4);
    const ep = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;
    const epW = poco.getTextWidth(ep, fontSmall);
    poco.drawText(ep, fontSmall, darkGray, x + w - epW - PADDING, y + 4 + fontSmall.height + 1);
  }
}

let animTimer = null;

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

let _poco = null;
let _colors = null;

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
      if (_poco && _colors) {
        startAnim(-1, _poco, state, _colors);
      } else {
        actions.redraw();
      }
    }
  } else if (type === "down" && event === "press") {
    if (state.selectedIndex < list.length - 1) {
      state.selectedIndex++;
      if (_poco && _colors) {
        startAnim(1, _poco, state, _colors);
      } else {
        actions.redraw();
      }
    }
  } else if (type === "select" && event === "press") {
    if (animTimer) { clearInterval(animTimer); animTimer = null; animState = null; }
    const anime = list[state.selectedIndex];
    actions.pushScreen("editMenu", { anime });
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
