import { createClient } from 'redis';

/**
 * RedisStore - Redis 持久化管理
 * 用於遊戲狀態持久化和伺服器重啟後恢復
 */
export class RedisStore {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.prefix = 'spring-gala:';
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = createClient({ url: redisUrl });

      this.client.on('error', (err) => {
        console.error('Redis error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error.message);
      console.log('Running without Redis persistence');
      return false;
    }
  }

  // 儲存遊戲狀態
  async saveGameState(gameState) {
    if (!this.isConnected) return;
    try {
      await this.client.set(
        `${this.prefix}gameState`,
        JSON.stringify(gameState)
      );
    } catch (error) {
      console.error('Failed to save game state:', error.message);
    }
  }

  // 儲存玩家資料
  async savePlayer(employeeId, playerData) {
    if (!this.isConnected) return;
    try {
      await this.client.hSet(
        `${this.prefix}players`,
        employeeId,
        JSON.stringify(playerData)
      );
    } catch (error) {
      console.error('Failed to save player:', error.message);
    }
  }

  // 儲存隊伍資料
  async saveTeams(teams) {
    if (!this.isConnected) return;
    try {
      const teamsObj = {};
      teams.forEach((team, id) => {
        teamsObj[id] = JSON.stringify({
          ...team,
          players: [] // 不儲存 socket IDs
        });
      });
      await this.client.hSet(`${this.prefix}teams`, teamsObj);
    } catch (error) {
      console.error('Failed to save teams:', error.message);
    }
  }

  // 儲存設定
  async saveSettings(settings) {
    if (!this.isConnected) return;
    try {
      await this.client.set(
        `${this.prefix}settings`,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Failed to save settings:', error.message);
    }
  }

  // 載入遊戲狀態
  async loadGameState() {
    if (!this.isConnected) return null;
    try {
      const data = await this.client.get(`${this.prefix}gameState`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load game state:', error.message);
      return null;
    }
  }

  // 載入所有玩家
  async loadPlayers() {
    if (!this.isConnected) return new Map();
    try {
      const data = await this.client.hGetAll(`${this.prefix}players`);
      const players = new Map();
      for (const [employeeId, json] of Object.entries(data)) {
        players.set(employeeId, JSON.parse(json));
      }
      return players;
    } catch (error) {
      console.error('Failed to load players:', error.message);
      return new Map();
    }
  }

  // 載入隊伍資料
  async loadTeams() {
    if (!this.isConnected) return null;
    try {
      const data = await this.client.hGetAll(`${this.prefix}teams`);
      if (!data || Object.keys(data).length === 0) return null;

      const teams = new Map();
      for (const [id, json] of Object.entries(data)) {
        teams.set(id, JSON.parse(json));
      }
      return teams;
    } catch (error) {
      console.error('Failed to load teams:', error.message);
      return null;
    }
  }

  // 載入設定
  async loadSettings() {
    if (!this.isConnected) return null;
    try {
      const data = await this.client.get(`${this.prefix}settings`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load settings:', error.message);
      return null;
    }
  }

  // 清除所有遊戲資料（重置時使用）
  async clearAll() {
    if (!this.isConnected) return;
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      console.log('Redis data cleared');
    } catch (error) {
      console.error('Failed to clear Redis:', error.message);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}
