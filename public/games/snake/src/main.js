import {
  createInputDraft,
  markInputDraftDirty,
  markInputDraftPending,
  shouldSyncInputDraft
} from "./inputDraft.js";
import { createFullscreenController } from "./fullscreenMode.js";
import { createMinimapRenderer } from "./minimap.js";
import { getPlayerVisualIdentity } from "./visualIdentity.js";
import {
  shouldHandleGameplayKey,
  shouldHandleManualBoostKey,
  shouldHandleOverviewKey
} from "./sceneMath.js";
import {readName, saveName} from "../../../platform/profile.js";

import { createAudioSystem } from "./audioSystem.js";

const boardEl = document.querySelector("#board");
const hudShellEl = document.querySelector(".hud-shell");
const hudPanelEl = document.querySelector("#hud-panel");
const hudToggleEl = document.querySelector("#hud-toggle");
const scoreEl = document.querySelector("#score");
const statusEl = document.querySelector("#status");
const restartEl = document.querySelector("#restart");
const controlsEl = document.querySelector(".controls");
const overviewCameraEl = document.querySelector("#overview-camera");
const manualBoostEl = document.querySelector("#manual-boost");
const gameStageEl = document.querySelector("#game-stage");
const fullscreenToggleEl = document.querySelector("#fullscreen-toggle");
const fullscreenLabelEl = document.querySelector("#fullscreen-label");
const minimapCanvasEl = document.querySelector("#minimap");
const directionGuideEls = [...document.querySelectorAll("[data-guide-dir]")];
const playersEl = document.querySelector("#players");
const stagePlayersEl = document.querySelector("#stage-players");
const connectionEl = document.querySelector("#connection");
const nameInputEl = document.querySelector("#player-name");
const saveNameEl = document.querySelector("#save-name");
const gridSizeInputEl = document.querySelector("#grid-size");
const applyGridSizeEl = document.querySelector("#apply-grid-size");
const currentGridEl = document.querySelector("#current-grid");
const respawnDelayInputEl = document.querySelector("#respawn-delay");
const applyRespawnDelayEl = document.querySelector("#apply-respawn-delay");
const currentRespawnDelayEl = document.querySelector("#current-respawn-delay");
const speedBoostDurationInputEl = document.querySelector("#speed-boost-duration");
const applySpeedBoostDurationEl = document.querySelector("#apply-speed-boost-duration");
const currentBoostDurationEl = document.querySelector("#current-boost-duration");
const speedBoostMultiplierInputEl = document.querySelector("#speed-boost-multiplier");
const applySpeedBoostMultiplierEl = document.querySelector("#apply-speed-boost-multiplier");
const currentBoostMultiplierEl = document.querySelector("#current-boost-multiplier");
const foodDensityEl = document.querySelector("#food-density");
const applyFoodDensityEl = document.querySelector("#apply-food-density");
const currentFoodDensityEl = document.querySelector("#current-food-density");
const maxPlayersInputEl = document.querySelector("#max-players");
const applyMaxPlayersEl = document.querySelector("#apply-max-players");
const currentPlayerLimitEl = document.querySelector("#current-player-limit");
const botCountInputEl = document.querySelector("#bot-count");
const applyBotCountEl = document.querySelector("#apply-bot-count");
const currentBotCountEl = document.querySelector("#current-bot-count");
const magnetDurationInputEl = document.querySelector("#magnet-duration");
const applyMagnetDurationEl = document.querySelector("#apply-magnet-duration");
const magnetRadiusInputEl = document.querySelector("#magnet-radius");
const applyMagnetRadiusEl = document.querySelector("#apply-magnet-radius");
const roleEl = document.querySelector("#role");
const foodLegendEl = document.querySelector("#food-legend");
const audioToggleEl = document.querySelector("#audio-toggle");
const bgmToggleEl = document.querySelector("#bgm-toggle");
const audioVolumeEl = document.querySelector("#audio-volume");
const HUD_COLLAPSED_STORAGE_KEY = "snake_hud_collapsed";
const MIN_GRID_SIZE = 16;
const MAX_GRID_SIZE = 128;
const MIN_RESPAWN_DELAY_MS = 1_000;
const MAX_RESPAWN_DELAY_MS = 30_000;
const MIN_SPEED_BOOST_DURATION_MS = 1_000;
const MAX_SPEED_BOOST_DURATION_MS = 15_000;
const MIN_SPEED_BOOST_MULTIPLIER = 2;
const MAX_SPEED_BOOST_MULTIPLIER = 5;
const MIN_ONLINE_PLAYERS = 2;
const MAX_ONLINE_PLAYERS = 12;
const MS_IN_SECOND = 1000;

const keyMap = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  w: "UP",
  s: "DOWN",
  a: "LEFT",
  d: "RIGHT",
  W: "UP",
  S: "DOWN",
  A: "LEFT",
  D: "RIGHT"
};

const socket = io("/games/snake");
const lobbyEl = document.querySelector("#snake-lobby");
const gameEl = document.querySelector("#snake-game");
const joinNameEl = document.querySelector("#join-name");
const joinErrorEl = document.querySelector("#join-error");
let joinedCode = null;
let inviteAttempted = false;
let closing = false;

let gameState = null;
let yourPlayerId = null;
let isHost = false;
let nameSyncedForPlayerId = null;
let isHudCollapsed = window.localStorage.getItem(HUD_COLLAPSED_STORAGE_KEY) !== "false";
const gridSizeDraft = createInputDraft();
const respawnDelayDraft = createInputDraft();
const speedBoostDurationDraft = createInputDraft();
const speedBoostMultiplierDraft = createInputDraft();
const foodDensityDraft = createInputDraft();
const maxPlayersDraft = createInputDraft();
const botCountDraft = createInputDraft();
const magnetDurationDraft = createInputDraft();
const magnetRadiusDraft = createInputDraft();
let scene3d = null;
let minimap = null;
let directionFeedbackTimer = null;
let isManualBoostRequested = false;
const fullscreenController = createFullscreenController({
  stageElement: gameStageEl,
  bodyElement: document.body,
  documentRef: document,
  onStateChange: updateFullscreenButton
});

async function startScene() {
  if (scene3d || !joinedCode) return;
  try {
    const {createScene3D} = await import("./scene3d.js");
    if (!joinedCode || closing || scene3d) return;
    scene3d = createScene3D(boardEl);
    if (gameState) scene3d.renderGameState(gameState, yourPlayerId);
    if (document.hidden) scene3d.pause();
  } catch (error) {
    boardEl.classList.add("scene-error");
    boardEl.textContent = "3B arena bu tarayıcıda başlatılamadı.";
    console.error(error);
  }
}
function showLobby(message = "") {
  joinedCode = null;
  setManualBoostRequested(false, false);
  scene3d?.disposeScene(); scene3d = null;
  fullscreenController.cleanup();
  audioSystem.stopBGM();
  gameState = null; previousGameState = null; yourPlayerId = null;
  lobbyEl.hidden = false; gameEl.hidden = true;
  joinErrorEl.textContent = message;
  history.replaceState(null, "", "/games/snake/");
}
function showGame(code) {
  joinedCode = code;
  lobbyEl.hidden = true; gameEl.hidden = false;
  document.querySelector("#copy-room").textContent = `Oda ${code} · bağlantıyı kopyala`;
  history.replaceState(null, "", `/games/snake/?room=${code}`);
  startScene();
  if (audioSystem.getState().bgmEnabled) audioSystem.startBGM();
}
function joinRoom(code) {
  if (!socket.connected) { joinErrorEl.textContent = "Bağlantı kuruluyor. Biraz sonra tekrar dene."; return; }
  if (code && !/^\d{4}$/.test(code)) { joinErrorEl.textContent = "4 haneli oda kodunu yaz."; return; }
  const name = saveName(joinNameEl.value.trim() || "Misafir") || "Misafir";
  nameInputEl.value = name;
  joinErrorEl.textContent = "";
  socket.timeout(6000).emit("join", {name, ...(code ? {code} : {})}, (error, result) => {
    if (error) { joinErrorEl.textContent = "Sunucu yanıt vermedi. Tekrar dene."; return; }
    if (result?.error) { joinErrorEl.textContent = result.error; return; }
    showGame(result.code);
  });
}
document.querySelector("#create-room").addEventListener("click", () => joinRoom());
document.querySelector("#join-room-form").addEventListener("submit", event => {
  event.preventDefault(); joinRoom(document.querySelector("#join-code").value.trim());
});
document.querySelector("#copy-room").addEventListener("click", async () => {
  if (!joinedCode) return;
  try { await navigator.clipboard.writeText(`${location.origin}/games/snake/?room=${joinedCode}`); }
  catch { joinErrorEl.textContent = "Bağlantı kopyalanamadı."; }
});
document.querySelector("#leave-room").addEventListener("click", () => {
  socket.emit("leave"); showLobby();
  history.replaceState(null, "", "/games/snake/");
});

if (minimapCanvasEl) {
  try {
    minimap = createMinimapRenderer(minimapCanvasEl);
  } catch (error) {
    minimapCanvasEl.closest(".minimap-shell")?.classList.add("is-unavailable");
    console.warn(error);
  }
}

const savedName = readName();
joinNameEl.value = savedName;
nameInputEl.value = savedName;

const audioSystem = createAudioSystem();
let previousGameState = null;

function syncAudioUI() {
  const audioState = audioSystem.getState();
  if (audioToggleEl) {
    audioToggleEl.textContent = audioState.isMuted ? "🔇 Ses: Kapalı" : "🔊 Ses: Açık";
    audioToggleEl.classList.toggle("is-muted", audioState.isMuted);
  }
  if (bgmToggleEl) {
    bgmToggleEl.textContent = audioState.bgmEnabled ? "🎵 Müzik: Açık" : "🔇 Müzik: Kapalı";
    bgmToggleEl.classList.toggle("is-disabled", !audioState.bgmEnabled);
  }
  if (audioVolumeEl) {
    audioVolumeEl.value = String(audioState.volume);
  }
}

audioToggleEl?.addEventListener("click", () => {
  audioSystem.initContext();
  const current = audioSystem.getState().isMuted;
  audioSystem.setMuted(!current);
  syncAudioUI();
});

bgmToggleEl?.addEventListener("click", () => {
  audioSystem.initContext();
  const current = audioSystem.getState().bgmEnabled;
  audioSystem.setBgmEnabled(!current);
  syncAudioUI();
});

audioVolumeEl?.addEventListener("input", (e) => {
  audioSystem.initContext();
  audioSystem.setVolume(e.target.value);
  syncAudioUI();
});

for (const eventName of ["keydown", "click", "touchstart", "pointerdown"]) {
  window.addEventListener(eventName, () => { if (joinedCode) audioSystem.initContext(); }, { passive: true });
}

syncAudioUI();

function processAudioEvents(prev, curr, localPlayerId) {
  if (!prev || !curr) return;

  const prevYou = prev.players?.find((p) => p.id === localPlayerId);
  const currYou = curr.players?.find((p) => p.id === localPlayerId);

  if (prevYou && currYou) {
    // 1. Yem Yeme (Pozitif Skor Artışı & Skor Rekoru)
    if (currYou.score > prevYou.score) {
      const prevBest = prevYou.bestScore ?? 0;
      if (prevBest > 0 && prevYou.score <= prevBest && currYou.score > prevBest) {
        audioSystem.playHighScoreSound();
      } else {
        const diff = currYou.score - prevYou.score;
        if (diff >= 5) {
          audioSystem.playEatSound("gold");
        } else if (diff >= 2) {
          audioSystem.playEatSound("tier2");
        } else {
          audioSystem.playEatSound("normal");
        }
      }
    }
    // 2. Zehir Yemi Yenmesi (Skor Düşüşü & Yılan Hayatta)
    else if (currYou.score < prevYou.score && currYou.isAlive) {
      audioSystem.playPoisonSound();
    }

    // 3. Kalkan Alınması (Kalkan Sayısı Artışı)
    if (currYou.shieldCharges > prevYou.shieldCharges) {
      audioSystem.playShieldGainSound();
    }

    // 4. Kalkan Kırılması / Darbe Absorpsiyonu
    if (
      prevYou.shieldCharges > currYou.shieldCharges ||
      (!prevYou.shieldRecoveryMsLeft && currYou.shieldRecoveryMsLeft > 0)
    ) {
      audioSystem.playShieldExplosion(true);
    }

    // 5. Hızlanma Sesi (Boost Yemi Alınması veya Manuel Boost Başlaması)
    if (
      (currYou.boostMsLeft > (prevYou.boostMsLeft ?? 0)) ||
      (currYou.manualBoostActive && !prevYou.manualBoostActive)
    ) {
      audioSystem.playBoostSound();
    }

    // 6. Kendi Ölümü
    if (prevYou.isAlive && !currYou.isAlive) {
      audioSystem.playDieSound();
    }
  }

  // 7. Rakiplerin Aksiyonları
  if (prev.players && curr.players) {
    prev.players.forEach((prevP) => {
      if (prevP.id === localPlayerId) return;
      const currP = curr.players.find((p) => p.id === prevP.id);
      if (currP) {
        if (prevP.isAlive && !currP.isAlive) {
          audioSystem.playRivalDieSound();
        } else if (prevP.shieldCharges > currP.shieldCharges) {
          audioSystem.playShieldExplosion(false);
        }
      }
    });
  }
}

updateHudPanel();

socket.on("connect", () => {
  connectionEl.textContent = "Bağlandı";
  const invite = new URLSearchParams(location.search).get("room");
  if (invite && !inviteAttempted) {
    inviteAttempted = true;
    document.querySelector("#join-code").value = invite;
    joinRoom(invite);
  }
});
socket.on("disconnect", () => {
  connectionEl.textContent = "Bağlantı kesildi";
  if (!closing && joinedCode) showLobby("Bağlantı kesildi. Odaya yeniden katılabilirsin.");
});
socket.on("room-error", result => showLobby(result?.error || "Oda kapandı."));
socket.on("state", message => {
  if (message.gameId !== "snake" || message.protocolVersion !== 1) return;
  connectionEl.textContent = "Bağlandı";
  yourPlayerId = message.me;
  gameState = message;
  isHost = gameState.hostId === yourPlayerId;

  const you = getYou();
  if (you && !nameInputEl.value) {
    nameInputEl.value = you.name;
  }
  if (you && nameInputEl.value && nameSyncedForPlayerId !== yourPlayerId) {
    send({ type: "set_name", name: nameInputEl.value });
    nameSyncedForPlayerId = yourPlayerId;
  }

  syncSettingInput(gridSizeInputEl, gridSizeDraft, gameState.gridSize, String);
  syncSettingInput(
    respawnDelayInputEl,
    respawnDelayDraft,
    gameState.respawnDelayMs,
    msToSecInput
  );
  syncSettingInput(
    speedBoostDurationInputEl,
    speedBoostDurationDraft,
    gameState.speedBoostDurationMs,
    msToSecInput
  );
  syncSettingInput(speedBoostMultiplierInputEl, speedBoostMultiplierDraft, gameState.speedBoostMultiplier, String);
  syncSettingInput(foodDensityEl, foodDensityDraft, gameState.foodDensity, String);
  syncSettingInput(maxPlayersInputEl, maxPlayersDraft, gameState.maxPlayers, String);
  syncSettingInput(botCountInputEl, botCountDraft, gameState.botCount ?? 0, String);
  syncSettingInput(magnetDurationInputEl, magnetDurationDraft, Math.floor(gameState.magnetDurationMs / 1000), String);
  syncSettingInput(magnetRadiusInputEl, magnetRadiusDraft, gameState.magnetRadius, String);

  currentGridEl.textContent = String(gameState.gridSize);
  currentRespawnDelayEl.textContent = msToSecText(gameState.respawnDelayMs);
  currentBoostDurationEl.textContent = msToSecText(gameState.speedBoostDurationMs);
  currentBoostMultiplierEl.textContent = String(gameState.speedBoostMultiplier);
  currentFoodDensityEl.textContent = getFoodDensityLabel(gameState.foodDensity, gameState.gridSize);
  currentPlayerLimitEl.textContent = `${gameState.players.length}/${gameState.maxPlayers}`;
  if (currentBotCountEl) {
    currentBotCountEl.textContent = String(gameState.botCount ?? 0);
  }
  botCountInputEl.max = String(Math.max(0, gameState.maxPlayers - gameState.players.filter(player => !player.isBot).length));
  roleEl.textContent = isHost ? "Oda sahibi" : "Oyuncu";
  updateHostControls();

  processAudioEvents(previousGameState, gameState, yourPlayerId);
  previousGameState = gameState;

  render();
});

window.addEventListener(
  "pagehide",
  () => {
    closing = true;
    socket.disconnect();
    audioSystem.close();
    fullscreenController.cleanup();
    setManualBoostRequested(false);
    window.clearTimeout(directionFeedbackTimer);
    scene3d?.disposeScene();
    scene3d = null;
  },
  { once: true }
);

window.addEventListener("keydown", (event) => {
  if (shouldHandleManualBoostKey(event)) {
    event.preventDefault();
    if (!event.repeat) {
      setManualBoostRequested(true);
    }
    return;
  }

  const direction = keyMap[event.key];
  if (direction && shouldHandleGameplayKey(event)) {
    event.preventDefault();
    audioSystem.playTurnSound();
    showDirectionFeedback(direction);
    send({ type: "turn", direction });
    return;
  }

  if (event.key === "Escape") {
    const fullscreenState = fullscreenController.getState();
    if (fullscreenState.active && !fullscreenState.nativeActive) {
      event.preventDefault();
      void fullscreenController.exit();
    }
    return;
  }

  if (shouldHandleOverviewKey(event)) {
    event.preventDefault();
    setOverviewRequested(true);
    return;
  }

  if (event.key === "r" || event.key === "R") {
    if (!isHost || !shouldHandleGameplayKey(event)) {
      return;
    }
    send({ type: "restart" });
  }
});

window.addEventListener("keyup", (event) => {
  if (shouldHandleManualBoostKey(event)) {
    event.preventDefault();
    setManualBoostRequested(false);
    return;
  }

  if (!shouldHandleOverviewKey(event)) {
    return;
  }
  event.preventDefault();
  setOverviewRequested(false);
});

window.addEventListener("blur", () => {
  setOverviewRequested(false);
  setManualBoostRequested(false);
});

overviewCameraEl.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  setOverviewRequested(true);
});

for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
  overviewCameraEl.addEventListener(eventName, () => setOverviewRequested(false));
}

manualBoostEl.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  manualBoostEl.setPointerCapture?.(event.pointerId);
  setManualBoostRequested(true);
});

for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
  manualBoostEl.addEventListener(eventName, () => setManualBoostRequested(false));
}

fullscreenToggleEl.addEventListener("click", () => {
  void fullscreenController.toggle();
});

for (const eventName of ["fullscreenchange", "webkitfullscreenchange"]) {
  document.addEventListener(eventName, () => fullscreenController.syncFromDocument());
}

controlsEl.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-dir]");
  if (!(target instanceof HTMLButtonElement) || !controlsEl.contains(target)) {
    return;
  }

  const direction = target.getAttribute("data-dir");
  if (direction) {
    audioSystem.playTurnSound();
    showDirectionFeedback(direction);
    send({ type: "turn", direction });
  }
});

restartEl.addEventListener("click", () => {
  if (!isHost) {
    return;
  }
  send({ type: "restart" });
});

hudToggleEl.addEventListener("click", () => {
  isHudCollapsed = !isHudCollapsed;
  window.localStorage.setItem(HUD_COLLAPSED_STORAGE_KEY, String(isHudCollapsed));
  updateHudPanel();
});

saveNameEl.addEventListener("click", () => {
  const name = nameInputEl.value.trim();
  if (!name) {
    return;
  }
  saveName(name);
  joinNameEl.value = readName();
  send({ type: "set_name", name });
  nameSyncedForPlayerId = yourPlayerId;
});

applyGridSizeEl.addEventListener("click", () => {
  applyGridSize();
});

gridSizeInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    applyGridSize();
  }
});
gridSizeInputEl.addEventListener("input", () => markInputDraftDirty(gridSizeDraft));

applyRespawnDelayEl.addEventListener("click", () => {
  applyRespawnDelay();
});

respawnDelayInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    applyRespawnDelay();
  }
});
respawnDelayInputEl.addEventListener("input", () => markInputDraftDirty(respawnDelayDraft));

applySpeedBoostDurationEl.addEventListener("click", () => {
  applySpeedBoostDuration();
});

speedBoostDurationInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    applySpeedBoostDuration();
  }
});
speedBoostDurationInputEl.addEventListener("input", () =>
  markInputDraftDirty(speedBoostDurationDraft)
);

applySpeedBoostMultiplierEl.addEventListener("click", () => {
  applySpeedBoostMultiplier();
});

speedBoostMultiplierInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    applySpeedBoostMultiplier();
  }
});
speedBoostMultiplierInputEl.addEventListener("input", () => markInputDraftDirty(speedBoostMultiplierDraft));

applyFoodDensityEl.addEventListener("click", () => {
  if (!isHost) {
    return;
  }
  const density = foodDensityEl.value;
  markInputDraftPending(foodDensityDraft, density);
  if (!send({ type: "set_food_density", density })) {
    markInputDraftDirty(foodDensityDraft);
  }
});
foodDensityEl.addEventListener("input", () => markInputDraftDirty(foodDensityDraft));
foodDensityEl.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    applyFoodDensityEl.click();
  }
});

applyMaxPlayersEl.addEventListener("click", () => {
  applyMaxPlayers();
});

maxPlayersInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    applyMaxPlayers();
  }
});
maxPlayersInputEl.addEventListener("input", () => markInputDraftDirty(maxPlayersDraft));

if (applyBotCountEl) {
  applyBotCountEl.addEventListener("click", () => {
    applyBotCount();
  });
}
if (botCountInputEl) {
  botCountInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyBotCount();
    }
  });
  botCountInputEl.addEventListener("input", () => markInputDraftDirty(botCountDraft));
}

if (applyMagnetDurationEl) {
  applyMagnetDurationEl.addEventListener("click", () => {
    applyMagnetDuration();
  });
}
if (magnetDurationInputEl) {
  magnetDurationInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyMagnetDuration();
    }
  });
  magnetDurationInputEl.addEventListener("input", () => markInputDraftDirty(magnetDurationDraft));
}

if (applyMagnetRadiusEl) {
  applyMagnetRadiusEl.addEventListener("click", () => {
    applyMagnetRadius();
  });
}
if (magnetRadiusInputEl) {
  magnetRadiusInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyMagnetRadius();
    }
  });
  magnetRadiusInputEl.addEventListener("input", () => markInputDraftDirty(magnetRadiusDraft));
}

function applyGridSize() {
  if (!isHost) {
    return;
  }
  const requestedSize = Number.parseInt(gridSizeInputEl.value, 10);
  if (!Number.isFinite(requestedSize)) {
    return;
  }

  const clampedSize = Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, requestedSize));
  gridSizeInputEl.value = String(clampedSize);
  connectionEl.textContent = `Uygulanıyor: ${clampedSize}...`;
  markInputDraftPending(gridSizeDraft, clampedSize);
  if (!send({ type: "set_grid_size", gridSize: clampedSize })) {
    markInputDraftDirty(gridSizeDraft);
  }
}

function applyRespawnDelay() {
  if (!isHost) {
    return;
  }
  const requestedSeconds = Number.parseFloat(respawnDelayInputEl.value);
  if (!Number.isFinite(requestedSeconds)) {
    return;
  }

  const clampedDelayMs = Math.min(
    MAX_RESPAWN_DELAY_MS,
    Math.max(MIN_RESPAWN_DELAY_MS, Math.round(requestedSeconds * MS_IN_SECOND))
  );
  respawnDelayInputEl.value = msToSecInput(clampedDelayMs);
  connectionEl.textContent = `Uygulanıyor: ${msToSecText(clampedDelayMs)} s...`;
  markInputDraftPending(respawnDelayDraft, clampedDelayMs);
  if (!send({ type: "set_respawn_delay", respawnDelayMs: clampedDelayMs })) {
    markInputDraftDirty(respawnDelayDraft);
  }
}

function applySpeedBoostDuration() {
  if (!isHost) {
    return;
  }
  const requestedSeconds = Number.parseFloat(speedBoostDurationInputEl.value);
  if (!Number.isFinite(requestedSeconds)) {
    return;
  }

  const clampedDurationMs = Math.min(
    MAX_SPEED_BOOST_DURATION_MS,
    Math.max(MIN_SPEED_BOOST_DURATION_MS, Math.round(requestedSeconds * MS_IN_SECOND))
  );
  speedBoostDurationInputEl.value = msToSecInput(clampedDurationMs);
  connectionEl.textContent = `Uygulanıyor: hızlanma ${msToSecText(clampedDurationMs)} s...`;
  markInputDraftPending(speedBoostDurationDraft, clampedDurationMs);
  if (!send({ type: "set_speed_boost_duration", speedBoostDurationMs: clampedDurationMs })) {
    markInputDraftDirty(speedBoostDurationDraft);
  }
}

function applySpeedBoostMultiplier() {
  if (!isHost) {
    return;
  }
  const requestedMultiplier = Number.parseInt(speedBoostMultiplierInputEl.value, 10);
  if (!Number.isFinite(requestedMultiplier)) {
    return;
  }

  const clampedMultiplier = Math.min(
    MAX_SPEED_BOOST_MULTIPLIER,
    Math.max(MIN_SPEED_BOOST_MULTIPLIER, requestedMultiplier)
  );
  speedBoostMultiplierInputEl.value = String(clampedMultiplier);
  connectionEl.textContent = `Uygulanıyor: hız x${clampedMultiplier}...`;
  markInputDraftPending(speedBoostMultiplierDraft, clampedMultiplier);
  if (!send({ type: "set_speed_boost_multiplier", speedBoostMultiplier: clampedMultiplier })) {
    markInputDraftDirty(speedBoostMultiplierDraft);
  }
}

function applyMaxPlayers() {
  if (!isHost || !gameState) {
    return;
  }
  const onlinePlayers = gameState.players?.length ?? MIN_ONLINE_PLAYERS;
  const requestedLimit = Number.parseInt(maxPlayersInputEl.value, 10);
  if (!Number.isFinite(requestedLimit)) {
    return;
  }

  const clampedLimit = Math.min(
    MAX_ONLINE_PLAYERS,
    Math.max(MIN_ONLINE_PLAYERS, onlinePlayers, requestedLimit)
  );
  maxPlayersInputEl.value = String(clampedLimit);
  connectionEl.textContent = `Uygulanıyor: oyuncu sınırı ${clampedLimit}...`;
  markInputDraftPending(maxPlayersDraft, clampedLimit);
  if (!send({ type: "set_max_players", maxPlayers: clampedLimit })) {
    markInputDraftDirty(maxPlayersDraft);
  }
}

function applyBotCount() {
  if (!isHost || !gameState || !botCountInputEl) {
    return;
  }
  const requestedCount = Number.parseInt(botCountInputEl.value, 10);
  if (!Number.isFinite(requestedCount)) {
    return;
  }
  const humanCount = gameState.players.filter(player => !player.isBot).length;
  const clampedCount = Math.min(11, gameState.maxPlayers - humanCount, Math.max(0, requestedCount));
  botCountInputEl.value = String(clampedCount);
  connectionEl.textContent = `Uygulanıyor: bot sayısı ${clampedCount}...`;
  markInputDraftPending(botCountDraft, clampedCount);
  if (!send({ type: "set_bot_count", botCount: clampedCount })) {
    markInputDraftDirty(botCountDraft);
  }
}

function applyMagnetDuration() {
  if (!isHost || !gameState || !magnetDurationInputEl) return;
  const requestedVal = Number.parseInt(magnetDurationInputEl.value, 10);
  if (!Number.isFinite(requestedVal)) return;
  const clampedVal = Math.min(30, Math.max(1, requestedVal));
  magnetDurationInputEl.value = String(clampedVal);
  connectionEl.textContent = `Uygulanıyor: mıknatıs süresi...`;
  markInputDraftPending(magnetDurationDraft, clampedVal);
  if (!send({ type: "set_magnet_duration", payload: clampedVal * 1000 })) {
    markInputDraftDirty(magnetDurationDraft);
  }
}

function applyMagnetRadius() {
  if (!isHost || !gameState || !magnetRadiusInputEl) return;
  const requestedVal = Number.parseInt(magnetRadiusInputEl.value, 10);
  if (!Number.isFinite(requestedVal)) return;
  const clampedVal = Math.min(10, Math.max(1, requestedVal));
  magnetRadiusInputEl.value = String(clampedVal);
  connectionEl.textContent = `Uygulanıyor: mıknatıs menzili...`;
  markInputDraftPending(magnetRadiusDraft, clampedVal);
  if (!send({ type: "set_magnet_radius", payload: clampedVal })) {
    markInputDraftDirty(magnetRadiusDraft);
  }
}

function updateHostControls() {
  const disabled = !isHost;
  restartEl.disabled = disabled;
  applyGridSizeEl.disabled = disabled;
  gridSizeInputEl.disabled = disabled;
  applyRespawnDelayEl.disabled = disabled;
  respawnDelayInputEl.disabled = disabled;
  applySpeedBoostDurationEl.disabled = disabled;
  speedBoostDurationInputEl.disabled = disabled;
  applySpeedBoostMultiplierEl.disabled = disabled;
  speedBoostMultiplierInputEl.disabled = disabled;
  applyFoodDensityEl.disabled = disabled;
  foodDensityEl.disabled = disabled;
  applyMaxPlayersEl.disabled = disabled;
  maxPlayersInputEl.disabled = disabled;
  if (applyBotCountEl) applyBotCountEl.disabled = disabled;
  if (botCountInputEl) botCountInputEl.disabled = disabled;
  if (applyMagnetDurationEl) applyMagnetDurationEl.disabled = disabled;
  if (magnetDurationInputEl) magnetDurationInputEl.disabled = disabled;
  if (applyMagnetRadiusEl) applyMagnetRadiusEl.disabled = disabled;
  if (magnetRadiusInputEl) magnetRadiusInputEl.disabled = disabled;
}

function updateHudPanel() {
  hudShellEl.classList.toggle("is-collapsed", isHudCollapsed);
  hudPanelEl.hidden = false;
  hudToggleEl.setAttribute("aria-expanded", String(!isHudCollapsed));
  hudToggleEl.textContent = isHudCollapsed ? "Ayarları aç" : "Ayarları gizle";
}

function render() {
  if (!gameState) {
    return;
  }

  scene3d?.renderGameState(gameState, yourPlayerId);
  minimap?.render(gameState, yourPlayerId);

  playersEl.innerHTML = "";
  if (stagePlayersEl) {
    stagePlayersEl.innerHTML = "";
  }
  const sortedPlayers = [...gameState.players].sort(
    (a, b) => b.score - a.score || (b.bestScore ?? 0) - (a.bestScore ?? 0)
  );
  for (const player of sortedPlayers) {
    const item = document.createElement("li");
    const you = player.id === yourPlayerId ? " (Sen)" : "";
    const host = player.id === gameState.hostId ? " [Oda sahibi]" : "";
    const alive = player.isAlive ? "canlı" : "yeniden doğuyor";
    const boosted = player.boostMsLeft > 0
      ? ` | hızlanma ${Math.ceil(player.boostMsLeft / 1000)} sn`
      : player.manualBoostActive
        ? " | elle hızlanma"
        : "";
    const shield = player.shieldCharges > 0 ? ` | kalkan ${player.shieldCharges}` : "";
    const shieldRecovery = player.shieldRecoveryMsLeft > 0 ? " | kalkan darbesi" : "";
    item.textContent = `${player.name}${you}${host}: ${player.score} | rekor ${player.bestScore}${boosted}${shield}${shieldRecovery} (${alive})`;
    item.className = player.color;
    playersEl.appendChild(item);

    if (stagePlayersEl) {
      const stageItem = document.createElement("li");
      stageItem.textContent = `${player.name}${you}${host}: ${player.score} (rekor ${player.bestScore ?? player.score})${boosted}${shield}${shieldRecovery} ${player.isAlive ? "" : "💀"}`;
      stageItem.className = player.color;
      stageItem.style.setProperty("--player-color", getPlayerVisualIdentity(player.color).color);
      stageItem.classList.toggle("is-self", player.id === yourPlayerId);
      stagePlayersEl.appendChild(stageItem);
    }
  }

  renderFoodLegend();

  const me = getYou();
  scoreEl.textContent = me ? String(me.score) : "0";
  statusEl.textContent = ["warning", "preview"].includes(gameState.obstaclePhase)
    ? "Engeller yer değiştiriyor"
    : gameState.status === "running"
      ? "Oynanıyor"
      : "Oyuncu bekleniyor";

  if (isManualBoostRequested && (!me?.isAlive || me.snake.length <= 3)) {
    setManualBoostRequested(false);
  }
}

function setOverviewRequested(requested) {
  const isRequested = Boolean(requested);
  overviewCameraEl.classList.toggle("is-active", isRequested);
  overviewCameraEl.setAttribute("aria-pressed", String(isRequested));
  scene3d?.setOverviewRequested(isRequested);
}

function setManualBoostRequested(requested, notifyServer = true) {
  const nextRequested = Boolean(requested);
  if (nextRequested === isManualBoostRequested) {
    return;
  }

  if (nextRequested) {
    const player = getYou();
    if (!player?.isAlive || player.snake.length <= 3) {
      return;
    }
  }

  isManualBoostRequested = nextRequested;
  manualBoostEl.classList.toggle("is-active", nextRequested);
  manualBoostEl.setAttribute("aria-pressed", String(nextRequested));
  if (notifyServer) {
    send({ type: nextRequested ? "boost_start" : "boost_stop" });
  }
}

function updateFullscreenButton(state) {
  fullscreenToggleEl.classList.toggle("is-active", state.active);
  fullscreenToggleEl.setAttribute("aria-pressed", String(state.active));
  fullscreenLabelEl.textContent = state.active ? "Tam Ekrandan Çık" : "Tam Ekran";
  window.requestAnimationFrame(() => minimap?.render(gameState, yourPlayerId));
}

function showDirectionFeedback(direction) {
  window.clearTimeout(directionFeedbackTimer);
  for (const guideEl of directionGuideEls) {
    guideEl.classList.toggle("is-active", guideEl.dataset.guideDir === direction);
  }
  directionFeedbackTimer = window.setTimeout(() => {
    for (const guideEl of directionGuideEls) {
      guideEl.classList.remove("is-active");
    }
  }, 240);
}

function send(payload) {
  if (!socket.connected || !joinedCode) {
    return false;
  }
  if (payload.type === "turn") socket.emit("turn", payload);
  else socket.emit(payload.type, payload, result => {
    if (result?.error) connectionEl.textContent = result.error;
  });
  return true;
}

function syncSettingInput(input, draft, serverValue, formatValue) {
  if (shouldSyncInputDraft(draft, serverValue)) {
    input.value = formatValue(serverValue);
  }
}

function getYou() {
  if (!gameState) {
    return null;
  }
  return gameState.players.find((player) => player.id === yourPlayerId) || null;
}

function renderFoodLegend() {
  if (!foodLegendEl || !gameState) {
    return;
  }

  foodLegendEl.innerHTML = "";
  const legend = Array.isArray(gameState.foodLegend) ? gameState.foodLegend : [];
  for (const foodType of legend) {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = `legend-dot t${foodType.tier}`;
    item.appendChild(dot);
    if (foodType.bonus === "speed") {
      item.append(
        ` Bonus: hız x${foodType.multiplier || 2} (${msToSecText(foodType.durationMs)} sn)`
      );
    } else if (foodType.bonus === "shield") {
      item.append(" Kalkan: 1 çarpışmayı emer");
    } else if (foodType.bonus === "gold") {
      item.append(` Altın: +${foodType.score} puan, +${foodType.growth} boy`);
    } else if (foodType.bonus === "poison") {
      item.append(` Zehir: ${foodType.score} puan, ${foodType.growth} boy`);
    } else if (foodType.bonus === "freeze") {
      item.append(` Buz: Rakipleri 3 sn dondurur`);
    } else if (foodType.bonus === "ghost") {
      item.append(` Hayalet: 8 sn ölümsüzlük`);
    } else if (foodType.bonus === "magnet") {
      item.append(` Mıknatıs: Yakındaki yemleri çeker`);
    } else {
      item.append(` Seviye ${foodType.tier}: +${foodType.score} puan, +${foodType.growth} uzama`);
    }
    if (Number.isFinite(foodType.visibleForMs)) {
      item.append(` | ${msToSecText(foodType.visibleForMs)} sn görünür`);
    }
    foodLegendEl.appendChild(item);
  }
}

function msToSecText(ms) {
  return (ms / MS_IN_SECOND).toFixed(1).replace(/\.0$/, "");
}

function msToSecInput(ms) {
  return msToSecText(ms);
}

function getFoodDensityLabel(foodDensity, gridSize = 64) {
  return String(foodDensity);
}

window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { scene3d?.pause(); audioSystem.stopBGM(); } else scene3d?.resume(); });
