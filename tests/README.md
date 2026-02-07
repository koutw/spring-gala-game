# 春酒遊戲負載測試

此目錄包含 Artillery 負載測試腳本，用於模擬大量使用者同時進行遊戲。

## 安裝

```bash
# 使用 Node.js 20+
nvm use 20

# 安裝依賴
cd tests
npm install
```

## 測試腳本

| 檔案 | 說明 | 使用者數 | 時間 |
|------|------|----------|------|
| `load-test-quick.yml` | 快速測試 | 100 | 30 秒 |
| `load-test.yml` | 完整測試 | 600 | 5 分鐘 |

## 遊戲流程

```
Round 1 (點擊) → Round 1 結果 → Round 2 暖身 (感測器授權) → Round 2 (搖晃) → 最終結果
```

## 使用方式

### 1. 啟動伺服器（本機測試）

```bash
cd server
npm run dev
```

### 2. 執行快速測試

```bash
cd tests
npx artillery run load-test-quick.yml
```

### 3. 執行完整 600 人測試

```bash
cd tests
npx artillery run load-test.yml
```

### 4. 產生 HTML 報告

```bash
artillery run load-test.yml --output report.json
artillery report report.json --output report.html
```

## 測試場景說明

### load-test.yml 包含 4 種使用者類型：

1. **Full Game Flow (80%)** - 完整遊戲流程
   - 加入遊戲
   - Round 1 點擊（每秒 10 次，持續 30 秒）
   - Round 2 暖身等待
   - Round 2 搖晃（每秒 10 次，持續 20 秒）

2. **Round 1 Clicker (10%)** - 快速點擊者
   - 每秒 20 次點擊
   - 只參與 Round 1

3. **Round 2 Shaker (5%)** - 搖晃測試者
   - 等待進入 Round 2
   - 持續搖晃測試

4. **Observer (5%)** - 觀望者
   - 連線但很少互動

### load-test-quick.yml 包含 2 種使用者類型：

1. **Quick Clicker (60%)** - 點擊測試
2. **Quick Shaker (40%)** - 搖晃測試

## 測試階段

```
0-30s   : 暖機 (0→100 人)
30-90s  : 爬升 (100→300 人)
90-150s : 全速 (300→600 人)
150-270s: 維持 (600 人持續)
```

## 監控指標

執行後注意以下指標：

- **http.response_time.p95** - 95% 請求的回應時間（應 < 500ms）
- **socketio.connect_rate** - WebSocket 連線成功率（應 > 99%）
- **vusers.completed** - 完成的虛擬使用者數
- **engine.socketio.emit_rate** - Socket.IO 訊息發送速率

## 常見問題

### 測試失敗：連線被拒絕

確認伺服器已啟動：
```bash
curl https://spring-gala-game.onrender.com/api/health
```

### Node.js 版本問題

Artillery 需要 Node.js 20+：
```bash
nvm use 20
```

### 連線數不足

調整系統限制：
```bash
ulimit -n 10000
```

### 記憶體不足

減少 `maxVusers` 或分次測試。
