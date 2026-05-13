import Poco from "commodetto/Poco";
import Message from "pebble/message";
import ButtonManager from "buttons";
import * as listScreen from "list-screen";
import * as editMenu from "edit-menu";
import * as numberEditor from "number-editor";
import * as confirmScreen from "confirm-screen";

const poco = new Poco(screen);

const colors = {
  black: poco.makeColor(0, 0, 0),
  white: poco.makeColor(255, 255, 255),
  gray: poco.makeColor(160, 160, 160),
  darkGray: poco.makeColor(80, 80, 80),
  blue: poco.makeColor(0x55, 0xBF, 0xFF),
  gold: poco.makeColor(0xFF, 0xD5, 0x4F),
  font: new poco.Font("Gothic-Bold", 24),
  fontSmall: new poco.Font("Gothic-Regular", 18),
  fontLarge: new poco.Font("Bitham-Bold", 42),
};

const state = {
  screen: "list",
  screenStack: [],
  screenParams: {},
  selectedIndex: 0,
  animeList: [],
  loading: true,
  error: null,
  updating: false,
};

const screens = {
  list: listScreen,
  editMenu: editMenu,
  numberEditor: numberEditor,
  confirm: confirmScreen,
};

function redraw() {
  const s = screens[state.screen];
  if (s) s.render(poco, state, colors);
}

function pushScreen(name, params) {
  state.screenStack.push({ name: state.screen, params: state.screenParams });
  state.screen = name;
  state.screenParams = params || {};
  buttonManager.setCaptureBack(true);
  redraw();
}

function popScreen() {
  if (state.screenStack.length === 0) return;
  const prev = state.screenStack.pop();
  state.screen = prev.name;
  state.screenParams = prev.params;
  if (state.screen === "list") buttonManager.setCaptureBack(false);
  redraw();
}

function popToList() {
  state.screenStack = [];
  state.screen = "list";
  state.screenParams = {};
  buttonManager.setCaptureBack(false);
  redraw();
}

const msgQueue = [];

function tryFlush() {
  if (msgQueue.length === 0) return;
  try {
    message.write(msgQueue[0]);
    msgQueue.shift();
  } catch (e) {
    // not writable yet, will retry on next onWritable
  }
}

function sendCommand(command, animeId, value) {
  const msg = new Map();
  msg.set("COMMAND", command);
  if (animeId !== undefined) msg.set("ANIME_ID", animeId);
  if (value !== undefined) msg.set("VALUE", value);
  msgQueue.push(msg);
  tryFlush();
}

const actions = { pushScreen, popScreen, popToList, sendCommand, redraw, _poco: poco, _colors: colors };

const buttonManager = new ButtonManager((type, event) => {
  const s = screens[state.screen];
  if (s) s.handleButton(type, event, state, actions);
});

const MESSAGE_KEYS = ["COMMAND", "ANIME_ID", "VALUE", "LIST_DATA", "STATUS", "ERROR_MSG"];

const message = new Message({
  keys: MESSAGE_KEYS,
  onReadable() {
    const msg = this.read();
    const status = msg.get("STATUS");
    const listData = msg.get("LIST_DATA");
    const errorMsg = msg.get("ERROR_MSG");

    state.error = null;
    state.updating = false;

    if (status === 2) {
      state.error = "Login required";
      state.loading = false;
      redraw();
      return;
    }

    if (status === 1) {
      state.error = errorMsg || "Error";
      state.loading = false;
      redraw();
      return;
    }

    if (listData) {
      try {
        const parsed = JSON.parse(listData);
        if (Array.isArray(parsed)) {
          state.animeList = parsed;
          if (state.selectedIndex >= parsed.length) {
            state.selectedIndex = Math.max(0, parsed.length - 1);
          }
        } else {
          const idx = state.animeList.findIndex(a => a.id === parsed.id);
          if (idx >= 0) {
            state.animeList[idx] = parsed;
          }
        }
      } catch (e) {
        state.error = "Bad data";
      }
      state.loading = false;
      if (state.screen !== "list") popToList();
      else redraw();
    }
  },
  onWritable() {
    tryFlush();
    if (!state.animeList.length && !state.error) {
      sendCommand(0);
      state.loading = true;
      redraw();
    }
  },
});

redraw();

setInterval(() => {
  if (state.screen === "list") redraw();
}, 60000);
