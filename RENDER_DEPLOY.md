# Render Deployment Guide

## 推薦：Docker 部署（簡單且穩定）

Render 的 Web Service 支援 Docker，這是最簡單的部署方式。

### 步驟 1：建立 Backend Service

1. Render Dashboard → **New** → **Web Service**
2. 連接你的 GitHub repository
3. 配置：
   - **Name**: `dominion-backend`
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./Dockerfile.backend`
   - **Instance Type**: Free
   - **Environment Variables**:
     - `PORT`: `10000` (Render 預設，會自動填入)

4. 點擊 **Create Web Service**

完成後，記下 backend 的 URL，例如：`https://dominion-backend-xxx.onrender.com`

### 步驟 2：建立 Frontend Service

1. Render Dashboard → **New** → **Web Service**
2. 連接同一個 GitHub repository
3. 配置：
   - **Name**: `dominion-frontend`
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./Dockerfile.frontend`
   - **Instance Type**: Free
   - **Environment Variables**:
     - `PORT`: `10000` (Render 預設)
     - `BACKEND_URL`: **填入步驟 1 的 backend URL**
       - 格式：`https://dominion-backend-xxx.onrender.com`
       - ⚠️ 記得加 `https://`

4. 點擊 **Create Web Service**

### 步驟 3：測試部署

1. 開啟 frontend URL（例如 `https://dominion-frontend-xxx.onrender.com`）
2. 點擊「開始遊戲」
3. 如果能正常遊玩，部署成功！

---

## 備選方案：原生部署（不用 Docker）

如果 Docker 部署遇到問題，可以使用原生 Rust + Node.js 部署。

### Backend (Rust)

1. **New Web Service** → 連接 repo
2. 配置：
   - **Runtime**: Rust
   - **Build Command**: `cargo build --release`
   - **Start Command**: `./target/release/backend`
   - **Environment Variables**:
     - `RUST_LOG`: `info` (可選)

### Frontend (Node.js + Express)

1. **New Web Service** → 連接 repo
2. 配置：
   - **Runtime**: Node
   - **Build Command**: `cd frontend-new && npm install && npm run build`
   - **Start Command**: `cd frontend-new && npm start`
   - **Environment Variables**:
     - `BACKEND_URL`: Backend 的完整 URL

---

## 環境變數說明

| 變數 | 服務 | 說明 | 範例 |
|------|------|------|------|
| `PORT` | Both | Render 自動設定的 port (通常 10000) | `10000` |
| `BACKEND_URL` | Frontend | Backend 的完整 URL | `https://dominion-backend.onrender.com` |

---

## 部署檢查清單

- [ ] Backend 部署成功，可以訪問 `/api/health`
- [ ] Frontend 部署成功，頁面正常載入
- [ ] Frontend 環境變數 `BACKEND_URL` 設定正確
- [ ] 遊戲能正常開始，WebSocket 連線成功
- [ ] AI 對手能正常回合

---

## 常見問題

### Q: Frontend 顯示但無法開始遊戲？
**A**: 檢查：
1. 瀏覽器開發者工具 Console 是否有 WebSocket 錯誤
2. Frontend 的 `BACKEND_URL` 環境變數是否正確（要 `https://`）
3. Backend 是否正常運行（訪問 `/api/health`）

### Q: Docker build 超時？
**A**: Render 免費方案有 build 時間限制（約 15 分鐘）。Rust 編譯較慢，可能超時。解決方案：
- 等待重試（Render 會自動重試）
- 使用原生部署方案
- 升級到付費方案

### Q: WebSocket 連線失敗？
**A**: 確認：
1. `BACKEND_URL` 使用 `https://` 而非 `http://`
2. Backend 的 CORS 已啟用（程式碼已包含）
3. 檢查 Render logs 是否有錯誤

### Q: 本地 Docker 測試如何設定環境變數？
**A**:
```bash
# docker-compose.yml 已經設定好了
docker compose up -d

# 或手動測試
docker build -t dominion-backend -f Dockerfile.backend .
docker build -t dominion-frontend -f Dockerfile.frontend .

docker run -e PORT=3000 -p 3000:3000 dominion-backend

docker run -e PORT=80 -e BACKEND_URL=http://localhost:3000 \
  -p 8080:80 dominion-frontend
```

---

## 本地測試 Render 配置

### 測試 Docker 環境變數

```bash
# 方法 1: 用 docker-compose (推薦)
docker compose up -d
# 訪問 http://localhost:8080

# 方法 2: 手動指定環境變數
docker compose down
BACKEND_URL=http://backend:3000 docker compose up -d
```

### 測試原生部署

```bash
# 設定環境變數
export PORT=3000
export BACKEND_URL=http://localhost:3000

# 終端 1: Backend
cargo build --release
./target/release/backend

# 終端 2: Frontend
cd frontend-new
npm install
npm run build
npm start
# 訪問 http://localhost:3001
```

---

## 效能優化建議

Render 免費方案會在無流量時休眠（sleep），首次訪問會有冷啟動延遲（約 30 秒）。

**改善方案：**
1. 升級到付費方案（$7/月起）
2. 使用 UptimeRobot 等服務定期 ping（保持喚醒）
3. 在首頁加載時顯示「正在喚醒伺服器...」訊息
