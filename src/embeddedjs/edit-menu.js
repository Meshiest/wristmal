const ROWS = ["score", "increment", "episodes"];
const ROW_HEIGHT = 52;
const PADDING = 10;

let highlight = null;
let subText = null;
let selSub = null;

export function render(poco, state, colors) {
  const { black, white, gray, darkGray, gold, font, fontSmall } = colors;
  if (!highlight) highlight = poco.makeColor(0x55, 0xAA, 0xFF);
  if (!subText) subText = poco.makeColor(0x55, 0x55, 0x55);
  if (!selSub) selSub = poco.makeColor(0x00, 0x00, 0x55);

  const anime = state.screenParams.anime;
  const selectedRow = state.screenParams.menuIndex ?? 1;

  poco.begin();
  poco.fillRectangle(white, 0, 0, poco.width, poco.height);

  // Header
  const headerH = 40;
  const epStr = anime.total > 0 ? `${anime.ep}/${anime.total}` : `${anime.ep}/?`;
  const header = `${anime.t} · ${epStr}`;
  const hw = poco.getTextWidth(header, fontSmall);
  poco.drawText(header, fontSmall, black, (poco.width - hw) >> 1, 11);

  // Separator line
  poco.fillRectangle(poco.makeColor(0xCC, 0xCC, 0xCC), PADDING, headerH - 1, poco.width - PADDING * 2, 1);

  const startY = headerH + 4;

  const rowData = [
    { label: "Edit Score", value: anime.score > 0 ? `★ ${anime.score}` : "★ -" },
    { label: "+ Increment", value: `> ${anime.ep + 1}` },
    { label: "Edit Episodes", value: epStr },
  ];

  for (let i = 0; i < rowData.length; i++) {
    const y = startY + i * ROW_HEIGHT;
    const selected = i === selectedRow;
    const bg = selected ? highlight : white;
    const fg = black;
    poco.fillRectangle(bg, 0, y, poco.width, ROW_HEIGHT);

    const { label, value } = rowData[i];
    poco.drawText(label, font, fg, PADDING, y + 6);
    const vw = poco.getTextWidth(value, fontSmall);
    poco.drawText(value, fontSmall, black, poco.width - vw - PADDING, y + 10);
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
        state.updating = true;
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
