# 春酒互動遊戲 🎉

一個可支援 500 人同時透過瀏覽器遊玩的春酒互動遊戲系統。

## 功能特色

### 第一階段：數位賽馬（個人賽）🏇
- 玩家在限定時間內透過搖晃手機或點擊螢幕累積分數
- 即時排行榜顯示
- 大螢幕呈現精彩賽馬動畫

### 第二階段：伯樂與千里馬（團體賽）📝
- 以部門為單位組成隊伍進行答題積分賽
- 支援一般題、無敵星星題、香蕉皮題
- 答對增加馬力，答錯減少馬力
- 最終馬力最高的組別獲勝

## 技術架構

- **後端**: Node.js + Express + Socket.IO
- **前端**: Vue 3 + Vite + Pinia
- **動畫**: GSAP + PixiJS
- **資料庫**: Redis (可選)

## 快速開始

### 環境需求
- Node.js 18+ (建議使用 nvm 管理版本)
- npm 或 yarn

### 安裝步驟

1. **安裝後端依賴**
```bash
cd server
npm install
```

2. **安裝前端依賴**
```bash
cd client
npm install
```

### 啟動開發模式

1. **啟動後端伺服器**
```bash
cd server
npm run dev
```
伺服器將在 http://localhost:3000 啟動

2. **啟動前端開發伺服器**
```bash
cd client
npm run dev
```
前端將在 http://localhost:5173 啟動

## 使用方式

### 頁面入口
- **首頁**: http://localhost:5173/
- **玩家端**: http://localhost:5173/player
- **大螢幕**: http://localhost:5173/screen
- **管理員**: http://localhost:5173/admin

### 遊戲流程
1. 開啟大螢幕頁面投影到現場螢幕
2. 玩家掃描 QR Code 或直接訪問玩家端頁面
3. 管理員透過控制台開始遊戲
4. 第一階段：玩家瘋狂點擊或搖晃手機
5. 第二階段：管理員發送題目，玩家答題
6. 遊戲結束，顯示最終排名

## 專案結構

```
spring-gala-game/
├── server/                 # 後端
│   ├── index.js           # 主伺服器
│   ├── game/
│   │   ├── GameManager.js # 遊戲管理器
│   │   ├── HorseRacing.js # 第一階段邏輯
│   │   └── QuizGame.js    # 第二階段邏輯
│   └── package.json
│
└── client/                 # 前端
    ├── src/
    │   ├── views/
    │   │   ├── HomeView.vue      # 首頁
    │   │   ├── PlayerView.vue    # 玩家端
    │   │   ├── BigScreenView.vue # 大螢幕
    │   │   └── AdminView.vue     # 管理員
    │   ├── stores/
    │   │   └── game.js           # Pinia 狀態管理
    │   ├── router/
    │   │   └── index.js          # 路由配置
    │   └── styles/
    │       └── main.css          # 主樣式
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 自訂設定

### 修改隊伍
編輯 `server/game/GameManager.js` 中的 `initializeTeams()` 方法

### 修改題目
在管理員控制台中即時發送題目，或編輯 `server/game/QuizGame.js` 中的 `loadDefaultQuestions()` 方法

## 部署建議

### 生產環境
1. 使用 PM2 管理 Node.js 進程
2. 使用 Redis 存儲遊戲狀態（高可用）
3. 使用 Nginx 反向代理和負載均衡
4. 前端使用 `npm run build` 打包後部署到 CDN

### 效能優化
- Socket.IO 已優化為優先使用 WebSocket
- 排行榜更新頻率為 500ms
- 前端使用懶加載和代碼分割

## 授權
MIT License
