export function render(poco, state, colors) {
  const { black, white, gray, darkGray, blue, gold, fontSmall, fontLarge } = colors;
  const params = state.screenParams;
  const value = params.value;
  const label = params.label;
  const color = params.field === "score" ? gold : blue;

  poco.begin();
  poco.fillRectangle(white, 0, 0, poco.width, poco.height);

  const labelW = poco.getTextWidth(label, fontSmall);
  poco.drawText(label, fontSmall, gray, (poco.width - labelW) >> 1, 40);

  const upHint = "▲";
  const upW = poco.getTextWidth(upHint, fontSmall);
  poco.drawText(upHint, fontSmall, darkGray, (poco.width - upW) >> 1, 70);

  const valueStr = String(value);
  const valueW = poco.getTextWidth(valueStr, fontLarge);
  poco.drawText(valueStr, fontLarge, color, (poco.width - valueW) >> 1, 90);

  const downHint = "▼";
  const downW = poco.getTextWidth(downHint, fontSmall);
  poco.drawText(downHint, fontSmall, darkGray, (poco.width - downW) >> 1, 140);

  const max = params.max;
  const rangeStr = max < 9999 ? `0 – ${max}` : "0 – ?";
  const rangeW = poco.getTextWidth(rangeStr, fontSmall);
  poco.drawText(rangeStr, fontSmall, darkGray, (poco.width - rangeW) >> 1, 180);

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
