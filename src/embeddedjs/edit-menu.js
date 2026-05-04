const ROWS = ["score", "increment", "episodes"];

export function render(poco, state, colors) {
  const { black, white, gray, darkGray, gold, font, fontSmall } = colors;
  const anime = state.screenParams.anime;
  const selectedRow = state.screenParams.menuIndex ?? 1;

  poco.begin();
  poco.fillRectangle(black, 0, 0, poco.width, poco.height);

  const inset = screen.round ? 20 : 0;
  const contentWidth = poco.width - inset * 2;

  const headerH = 36;
  poco.fillRectangle(white, inset, 0, contentWidth, headerH);
  const epStr = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;
  const header = `${anime.t} · ${epStr}`;
  const hw = poco.getTextWidth(header, fontSmall);
  poco.drawText(header, fontSmall, black, (poco.width - hw) >> 1, 9);

  const ROW_HEIGHT = 48;
  const startY = headerH + 12;
  const PADDING = 12;

  const rowData = [
    { label: "Edit Score", value: anime.score > 0 ? `★ ${anime.score}` : "★ -" },
    { label: "+ Increment", value: `→ ${anime.ep + 1}` },
    { label: "Edit Episodes", value: epStr },
  ];

  for (let i = 0; i < rowData.length; i++) {
    const y = startY + i * ROW_HEIGHT;
    const selected = i === selectedRow;
    const bg = selected ? white : black;
    const fg = selected ? black : gray;

    poco.fillRectangle(bg, inset, y, contentWidth, ROW_HEIGHT);

    const { label, value } = rowData[i];
    poco.drawText(label, font, fg, inset + PADDING, y + 12);
    const vw = poco.getTextWidth(value, font);
    poco.drawText(value, font, fg, inset + contentWidth - vw - PADDING, y + 12);
  }

  poco.end();
}

export function handleButton(type, event, state, actions) {
  if (event !== "press") return;

  const params = state.screenParams;
  const menuIndex = params.menuIndex ?? 1;

  if (type === "back") {
    actions.popScreen();
    return;
  }

  if (type === "up") {
    params.menuIndex = Math.max(0, menuIndex - 1);
    actions.redraw();
    return;
  }

  if (type === "down") {
    params.menuIndex = Math.min(2, menuIndex + 1);
    actions.redraw();
    return;
  }

  if (type === "select") {
    const anime = params.anime;
    const row = ROWS[menuIndex];

    if (row === "increment") {
      if (anime.total > 0 && anime.ep + 1 >= anime.total) {
        actions.pushScreen("confirm", { anime });
      } else {
        anime.ep++;
        actions.sendCommand(1, anime.id);
        actions.popToList();
      }
      return;
    }

    if (row === "score") {
      actions.pushScreen("numberEditor", {
        anime,
        field: "score",
        value: anime.score,
        min: 0,
        max: 10,
        label: "Score",
      });
      return;
    }

    if (row === "episodes") {
      actions.pushScreen("numberEditor", {
        anime,
        field: "episodes",
        value: anime.ep,
        min: 0,
        max: anime.total > 0 ? anime.total : 9999,
        label: "Episodes Watched",
      });
      return;
    }
  }
}
