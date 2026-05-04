export function render(poco, state, colors) {
  const { black, white, gray, font, fontSmall } = colors;
  const anime = state.screenParams.anime;

  poco.begin();
  poco.fillRectangle(black, 0, 0, poco.width, poco.height);

  const inset = screen.round ? 20 : 0;
  const contentWidth = poco.width - inset * 2;

  const q = "Mark as completed?";
  const qw = poco.getTextWidth(q, font);
  poco.drawText(q, font, white, inset + ((contentWidth - qw) >> 1), 50);

  const title = anime.t;
  const tw = poco.getTextWidth(title, font);
  poco.drawText(title, font, white, inset + ((contentWidth - tw) >> 1), 90);

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;
  const dw = poco.getTextWidth(dateStr, fontSmall);
  poco.drawText(dateStr, fontSmall, gray, (poco.width - dw) >> 1, 130);

  const hint1 = "● Confirm";
  const hint2 = "◀ Cancel";
  const h1w = poco.getTextWidth(hint1, fontSmall);
  const h2w = poco.getTextWidth(hint2, fontSmall);
  poco.drawText(hint1, fontSmall, gray, (poco.width - h1w) >> 1, 175);
  poco.drawText(hint2, fontSmall, gray, (poco.width - h2w) >> 1, 195);

  poco.end();
}

export function handleButton(type, event, state, actions) {
  if (event !== "press") return;

  if (type === "select") {
    const anime = state.screenParams.anime;
    actions.sendCommand(4, anime.id);
    actions.popToList();
    return;
  }

  if (type === "back") {
    actions.popToList();
    return;
  }
}
