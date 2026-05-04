import Button from "pebble/button";

const DOUBLE_TAP_WINDOW = 300;
const LONG_PRESS_THRESHOLD = 500;
const HOLD_REPEAT_DELAY = 400;
const HOLD_REPEAT_INTERVAL = 150;
const DEBOUNCE_MS = 100;

class ButtonManager {
  constructor(callback) {
    this._callback = callback;
    this._selectCount = 0;
    this._selectTimer = null;
    this._selectHeld = false;
    this._longPressTimer = null;
    this._holdTimers = {};
    this._lastPress = {};
    this._btnDown = {};
    this._captureBack = false;
    this._initButton();
  }

  _initButton() {
    const types = ["select", "up", "down"];
    if (this._captureBack) types.push("back");
    new Button({
      types,
      onPush: (down, type) => this._onPush(down, type),
    });
  }

  setCaptureBack(capture) {
    if (this._captureBack === capture) return;
    this._captureBack = capture;
    this._initButton();
  }

  _onPush(down, type) {
    const wasDown = this._btnDown[type] || false;
    this._btnDown[type] = down;

    if (type === "select") {
      if (down === wasDown) return;
      this._onSelect(down);
      return;
    }

    if (type === "back") {
      if (down && !wasDown) this._callback("back", "press");
      return;
    }

    if (down && !wasDown) {
      this._callback(type, "press");
      this._holdTimers[type] = setTimeout(() => {
        this._holdTimers[type] = setInterval(() => {
          this._callback(type, "repeat");
        }, HOLD_REPEAT_INTERVAL);
      }, HOLD_REPEAT_DELAY);
    } else if (!down && wasDown) {
      clearTimeout(this._holdTimers[type]);
      clearInterval(this._holdTimers[type]);
      delete this._holdTimers[type];
    }
  }

  _onSelect(down) {
    if (down) {
      this._selectDownTime = Date.now();
      this._selectHeld = false;
      this._selectCount++;

      if (this._selectCount === 1) {
        this._selectTimer = setTimeout(() => {
          if (!this._selectHeld) {
            this._selectCount = 0;
            this._callback("select", "press");
          }
        }, DOUBLE_TAP_WINDOW);
      } else if (this._selectCount >= 2) {
        clearTimeout(this._selectTimer);
        this._selectCount = 0;
        this._callback("select", "double");
      }

      this._longPressTimer = setTimeout(() => {
        clearTimeout(this._selectTimer);
        this._selectCount = 0;
        this._selectHeld = true;
        this._callback("select", "long");
      }, LONG_PRESS_THRESHOLD);
    } else {
      clearTimeout(this._longPressTimer);
      this._selectHeld = false;
    }
  }
}

export default ButtonManager;
