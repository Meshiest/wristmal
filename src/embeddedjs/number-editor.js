export function render(poco, state, colors) {
  const { black, white, gray, darkGray, blue, gold, fontSmall, fontLarge } = colors;
  const params = state.screenParams;
  const value = params.value;
  const label = params.label;
  const color = params.field === "score" ? gold : blue;

  poco.begin();
  poco.fillRectangle(black, 0, 0, poco.width, poco.height);

  const inset = screen.round ? 20 : 0;
  const contentWidth = poco.width - inset * 2;

  const labelW = poco.getTextWidth(label, fontSmall);
  poco.drawText(label, fontSmall, gray, inset + ((contentWidth - labelW) >> 1), 40);

  const upHint = "▲";
  const upW = poco.getTextWidth(upHint, fontSmall);
  poco.drawText(upHint, fontSmall, darkGray, inset + ((contentWidth - upW) >> 1), 70);

  const valueStr = String(value);
  const valueW = poco.getTextWidth(valueStr, fontLarge);
  poco.drawText(valueStr, fontLarge, color, inset + ((contentWidth - valueW) >> 1), 90);

  const downHint = "▼";
  const downW = poco.getTextWidth(downHint, fontSmall);
  poco.drawText(downHint, fontSmall, darkGray, inset + ((contentWidth - downW) >> 1), 140);

  const max = params.max;
  const rangeStr = max < 9999 ? `0 – ${max}` : "0 – ?";
  const rangeW = poco.getTextWidth(rangeStr, fontSmall);
  poco.drawText(rangeStr, fontSmall, darkGray, inset + ((contentWidth - rangeW) >> 1), 180);

  poco.end();
}

export function handleButton(type, event, state, actions) {
  const params = state.screenParams;

  if (type === "back" && event === "press") {
    actions.popScreen();
    return;
  }

  if (type === "select" && event === "press") {
    const anime = params.anime;
    if (params.field === "score") {
      actions.sendCommand(2, anime.id, params.value);
      actions.popToList();
    } else if (params.field === "episodes") {
      if (anime.total > 0 && params.value >= anime.total) {
        actions.popScreen();
        actions.pushScreen("confirm", { anime });
      } else {
        actions.sendCommand(3, anime.id, params.value);
        actions.popToList();
      }
    }
    return;
  }

  if (type === "up" && (event === "press" || event === "repeat")) {
    if (params.value < params.max) {
      params.value++;
      actions.redraw();
    }
    return;
  }

  if (type === "down" && (event === "press" || event === "repeat")) {
    if (params.value > params.min) {
      params.value--;
      actions.redraw();
    }
    return;
  }
}
