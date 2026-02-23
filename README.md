# 春酒互動遊戲 🎉

一個可支援 500 人同時透過瀏覽器遊玩的春酒互動遊戲系統。

## 功能特色

### 第一階段：數位賽馬（個人賽）🏇
- 玩家在限定時間內透過搖晃手機或點擊螢幕累積分數
- 即時排行榜顯示
- 大螢幕呈現精彩賽馬動畫

### 第二階段：伯樂與千里馬（個人計分賽）📝
- 提供三種豐富的題型：⭐無敵星星題(答對+1)、💰金幣題(限額百名搶答+1)、🐢龜殼題(答錯或未作答-1)
- 玩家以個人身分答題，得分即時更新顯現於手機端
- 大螢幕即時轉播答題分佈圖，並於階段結束時公佈「個人總積分前 20 名英雄榜」

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
在管理員控制台中即時選擇送出何種題型 (無敵星星、金幣、龜殼)，或編輯 `server/game/QuizGame.js` 中的 `loadDefaultQuestions()` 方法預載題目。

## 壓力測試 (Load Testing)

內建了基於 Artillery 的高併發負載測試腳本，可用於模擬大量使用者同時上線與互動的真實場景：

- **第一階段模擬 (`tests/load-test.yml`)**：模擬最高 600 人同時點擊與搖晃手機。
- **第二階段模擬 (`tests/load-test-phase2.yml`)**：模擬最高 600 人同時連線，並在主持人發送題目的瞬間大量搶答。

**執行方式**：
```bash
npx artillery run tests/load-test.yml
npx artillery run tests/load-test-phase2.yml
```

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
