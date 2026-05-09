import { Room, type Client } from "@colyseus/core";
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";

class Player extends Schema {
  name: string = "Player";
  heroId: string = "james";
  ready: boolean = false;
  isHost: boolean = false;
}
defineTypes(Player, {
  name: "string",
  heroId: "string",
  ready: "boolean",
  isHost: "boolean",
});

class BattleState extends Schema {
  players = new MapSchema<Player>();
  hostId: string = "";
  phase: string = "waiting";
  countdown: number = 0;
}
defineTypes(BattleState, {
  players: { map: Player },
  hostId: "string",
  phase: "string",
  countdown: "number",
});

interface LobbyPlayerData {
  id: string;
  name: string;
  heroId: string;
  ready: boolean;
  isHost: boolean;
}

interface ScoreEntry {
  id: string;
  name: string;
  heroId: string;
  score: number;
}

const RELAY_MESSAGES = [
  "playerState",
  "enemyState",
  "bossFx",
  "bossBullets",
  "purgeFx",
  "pickupSpawn",
  "pickupCollect",
  "pickupClear",
  "playerSkillCast",
  "revive",
];

export class BattleRoom extends Room<BattleState> {
  maxClients = 8;
  private countdownInterval: NodeJS.Timeout | null = null;
  private playerScores = new Map<string, ScoreEntry>();

  private getLobbyData() {
    const players: LobbyPlayerData[] = [];
    this.state.players.forEach((p, id) => {
      players.push({
        id,
        name: p.name,
        heroId: p.heroId,
        ready: p.ready,
        isHost: p.isHost,
      });
    });
    return { players, hostId: this.state.hostId, phase: this.state.phase };
  }

  private broadcastLobby() {
    this.broadcast("lobbyUpdate", this.getLobbyData());
  }

  onCreate(_options: unknown) {
    this.setState(new BattleState());

    for (const msgType of RELAY_MESSAGES) {
      this.onMessage(msgType, (client, message) => {
        this.broadcast(msgType, message, { except: client });
      });
    }

    this.onMessage("bossHit", (_client, message) => {
      const target = (message as { targetId?: string })?.targetId;
      if (!target) return;
      const targetClient = this.clients.find((c) => c.sessionId === target);
      targetClient?.send("bossHit", message);
    });

    this.onMessage("scoreSync", (client, message) => {
      const msg = message as { score?: number };
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.playerScores.set(client.sessionId, {
        id: client.sessionId,
        name: player.name,
        heroId: player.heroId,
        score: typeof msg.score === "number" ? msg.score : 0,
      });
    });

    this.onMessage("gameEnd", (client, message) => {
      const msg = message as { score?: number };
      const player = this.state.players.get(client.sessionId);
      if (player && typeof msg.score === "number") {
        this.playerScores.set(client.sessionId, {
          id: client.sessionId,
          name: player.name,
          heroId: player.heroId,
          score: msg.score,
        });
      }
      this.broadcast("gameEnd", message, { except: client });

      const allScores = Array.from(this.playerScores.values()).sort(
        (a, b) => b.score - a.score,
      );
      this.broadcast("allScores", { scores: allScores });

      if (this.state.phase === "playing") {
        this.state.phase = "waiting";
        this.state.players.forEach((p) => {
          p.ready = false;
        });
        try {
          this.unlock();
        } catch (_) {}
        this.broadcastLobby();
      }
    });

    this.onMessage("toggleReady", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.ready = !player.ready;
      this.broadcastLobby();
      this.maybeStartCountdown();
    });

    this.onMessage("requestLobby", (client) => {
      client.send("lobbyUpdate", this.getLobbyData());
    });

    this.onMessage("skipWaveCountdown", (_client) => {
      this.broadcast("skipWaveCountdown", {}, { afterSend: true });
    });

    this.onMessage("upgradeChosen", (_client) => {
      this.broadcast("upgradeChosen", {});
    });
  }

  onJoin(client: Client, options: { name?: string; heroId?: string }) {
    const player = new Player();
    player.name = (options?.name || "Player").slice(0, 24);
    player.heroId = options?.heroId || "james";
    player.ready = false;
    player.isHost = this.state.players.size === 0;

    this.state.players.set(client.sessionId, player);
    this.playerScores.set(client.sessionId, {
      id: client.sessionId,
      name: player.name,
      heroId: player.heroId,
      score: 0,
    });

    if (player.isHost) {
      this.state.hostId = client.sessionId;
    }

    this.broadcastLobby();
  }

  onLeave(client: Client) {
    const wasHost = this.state.hostId === client.sessionId;
    this.state.players.delete(client.sessionId);
    this.playerScores.delete(client.sessionId);
    this.broadcast("playerLeft", { id: client.sessionId });

    if (wasHost && this.state.players.size > 0) {
      const newHostId = this.state.players.keys().next().value as
        | string
        | undefined;
      if (newHostId) {
        this.state.hostId = newHostId;
        const newHost = this.state.players.get(newHostId);
        if (newHost) newHost.isHost = true;
        this.broadcast("hostMigrated", { hostId: newHostId });
      }
    }

    this.broadcastLobby();
    this.maybeStartCountdown();
  }

  private maybeStartCountdown() {
    const players = Array.from(this.state.players.values());
    const allReady =
      players.length >= 2 && players.every((p) => p.ready);

    if (allReady && this.state.phase !== "starting") {
      this.state.phase = "starting";
      this.state.countdown = 3;
      this.broadcast("countdown", { n: this.state.countdown });

      if (this.countdownInterval) clearInterval(this.countdownInterval);
      this.countdownInterval = setInterval(() => {
        this.state.countdown -= 1;
        if (this.state.countdown <= 0) {
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
          }
          this.state.phase = "playing";
          this.playerScores.forEach((entry) => {
            entry.score = 0;
          });
          this.broadcast("countdown", { n: 0 });
          this.broadcast("startGame", {});
          this.lock();
        } else {
          this.broadcast("countdown", { n: this.state.countdown });
        }
      }, 1000);
    } else if (!allReady && this.state.phase === "starting") {
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
      this.state.phase = "waiting";
      this.state.countdown = 0;
      this.broadcast("countdown", { n: 0, cancelled: true });
    }
  }

  onDispose() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
