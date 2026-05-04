export function render(poco, state, colors) {
  const { black, white, gray, font } = colors;
  poco.begin();
  poco.fillRectangle(black, 0, 0, poco.width, poco.height);

  if (state.animeList.length === 0) {
    const msg = state.loading ? "Loading..." : "No shows watching";
    const w = poco.getTextWidth(msg, font);
    poco.drawText(msg, font, gray, (poco.width - w) >> 1, (poco.height - font.height) >> 1);
    if (state.error) {
      const ew = poco.getTextWidth(state.error, colors.fontSmall);
      poco.drawText(state.error, colors.fontSmall, colors.gold,
        (poco.width - ew) >> 1, poco.height - 30);
    }
    poco.end();
    return;
  }

  const ROW_HEIGHT = 40;
  const PADDING = 8;
  const startY = 4;

  const inset = screen.round ? 20 : 0;
  const contentWidth = poco.width - inset * 2;

  const maxVisible = Math.floor((poco.height - startY) / ROW_HEIGHT);
  let scrollOffset = state.listScrollOffset || 0;
  if (state.selectedIndex < scrollOffset) scrollOffset = state.selectedIndex;
  if (state.selectedIndex >= scrollOffset + maxVisible) scrollOffset = state.selectedIndex - maxVisible + 1;
  state.listScrollOffset = scrollOffset;

  for (let i = 0; i < maxVisible && (i + scrollOffset) < state.animeList.length; i++) {
    const dataIndex = i + scrollOffset;
    const anime = state.animeList[dataIndex];
    const y = startY + i * ROW_HEIGHT;

    const selected = dataIndex === state.selectedIndex;
    const bg = selected ? white : black;
    const fg = selected ? black : gray;

    poco.fillRectangle(bg, inset, y, contentWidth, ROW_HEIGHT);

    const title = anime.t;
    const ep = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;

    const epWidth = poco.getTextWidth(ep, font);
    const titleMaxWidth = contentWidth - epWidth - PADDING * 3;

    let displayTitle = title;
    while (poco.getTextWidth(displayTitle, font) > titleMaxWidth && displayTitle.length > 0) {
      displayTitle = displayTitle.slice(0, -1);
    }
    if (displayTitle.length < title.length) {
      displayTitle = displayTitle.slice(0, -1) + "…";
    }

    poco.drawText(displayTitle, font, fg, inset + PADDING, y + 8, titleMaxWidth);
    poco.drawText(ep, font, fg, inset + contentWidth - epWidth - PADDING, y + 8);
  }

  poco.end();
}

export function handleButton(type, event, state, actions) {
  if (event !== "press" && event !== "double") return;

  const list = state.animeList;
  if (list.length === 0) return;

  if (type === "up") {
    state.selectedIndex = Math.max(0, state.selectedIndex - 1);
    actions.redraw();
  } else if (type === "down") {
    state.selectedIndex = Math.min(list.length - 1, state.selectedIndex + 1);
    actions.redraw();
  } else if (type === "select" && event === "press") {
    const anime = list[state.selectedIndex];
    actions.pushScreen("editMenu", { anime });
  } else if (type === "select" && event === "double") {
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
