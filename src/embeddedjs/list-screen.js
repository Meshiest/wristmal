const ROW_HEIGHT = 61;
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
  };
  return cachedColors;
}

export function render(poco, state, colors) {
  const c = initColors(poco, colors);
  invalidateCache(state);
  poco.begin();

  if (state.animeList.length === 0) {
    poco.fillRectangle(c.white, 0, 0, poco.width, poco.height);
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

  poco.fillRectangle(c.white, 0, 0, poco.width, poco.height);

  const list = state.animeList;
  const sel = state.selectedIndex;

  const maxVisible = Math.floor(poco.height / ROW_HEIGHT);
  let scrollOffset = state.listScrollOffset || 0;
  if (sel < scrollOffset) scrollOffset = sel;
  if (sel >= scrollOffset + maxVisible) scrollOffset = sel - maxVisible + 1;
  state.listScrollOffset = scrollOffset;

  for (let i = 0; i < maxVisible + 1 && (i + scrollOffset) < list.length; i++) {
    const dataIndex = i + scrollOffset;
    const anime = list[dataIndex];
    const y = i * ROW_HEIGHT;
    const selected = dataIndex === sel;

    const bg = selected ? c.highlight : c.white;
    const titleColor = c.black;
    const subColor = selected ? c.selSub : c.subText;
    const scoreColor = selected ? c.selSub : c.subText;

    poco.fillRectangle(bg, 0, y, poco.width, ROW_HEIGHT);

    // Title
    const title = truncate(poco, anime.t, c.font, poco.width - PADDING * 2,
      (selected ? "s" : "u") + anime.id);
    poco.drawText(title, c.font, titleColor, PADDING, y + 4);

    // Score (large font) left, episodes (large font) right
    const ep = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;
    const scoreStr = anime.score > 0 ? `★ ${anime.score}` : "";

    if (scoreStr) {
      poco.drawText(scoreStr, c.font, scoreColor, PADDING, y + 4 + c.font.height);
    }
    const epW = poco.getTextWidth(ep, c.font);
    poco.drawText(ep, c.font, subColor, poco.width - epW - PADDING, y + 4 + c.font.height);

    if (state.updating && selected) {
      const updStr = "Updating...";
      const updW = poco.getTextWidth(updStr, c.fontSmall);
      poco.drawText(updStr, c.fontSmall, subColor,
        (poco.width - updW) >> 1, y + 8 + c.font.height);
    }
  }

  poco.end();
}

let titleCache = new Map();
let lastListLen = -1;

function truncate(poco, text, font, maxWidth, cacheKey) {
  if (titleCache.has(cacheKey)) return titleCache.get(cacheKey);
  let result = text;
  if (poco.getTextWidth(text, font) > maxWidth) {
    while (result.length > 1 && poco.getTextWidth(result + "…", font) > maxWidth) {
      result = result.slice(0, -1);
    }
    result = result + "…";
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
