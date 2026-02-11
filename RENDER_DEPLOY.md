# Render Deployment Guide

## 選項 1：Docker 部署（簡單但可能遇到限制）

使用 `render.yaml`：

```bash
# 1. Push to GitHub
git push origin main

# 2. 在 Render Dashboard
# - New Blueprint
# - Connect repository
# - 使用 render.yaml
```

**注意**: Render 免費方案對 Docker 支援可能有限制。

---

## 選項 2：原生部署（推薦，免費方案友好）

使用 `render-native.yaml`：

### 步驟 1：安裝前端依賴

```bash
cd frontend-new
npm install
```

### 步驟 2：Push 到 GitHub

```bash
git add .
git commit -m "feat: add Render deployment config"
git push origin main
```

### 步驟 3：在 Render 建立服務

#### 方法 A：使用 Blueprint（自動）

1. 在 Render Dashboard 點擊 "New Blueprint"
2. 連接 GitHub repository
3. 選擇 `render-native.yaml`
4. 點擊 "Apply"

#### 方法 B：手動建立（更彈性）

**Backend Service:**
1. New → Web Service
2. 連接 repository
3. 設定：
   - **Name**: dominion-backend
   - **Runtime**: Rust
   - **Build Command**: `cargo build --release`
   - **Start Command**: `./target/release/backend`
   - **Environment Variables**:
     - `RUST_LOG=info`

**Frontend Service:**
1. New → Web Service
2. 連接 repository
3. 設定：
   - **Name**: dominion-frontend
   - **Runtime**: Node
   - **Build Command**: `cd frontend-new && npm install && npm run build`
   - **Start Command**: `cd frontend-new && npm start`
   - **Environment Variables**:
     - `BACKEND_URL`: 填入 backend 的 URL（例如 `https://dominion-backend.onrender.com`）

---

## 環境變數說明

| 變數 | 服務 | 說明 |
|------|------|------|
| `PORT` | Backend & Frontend | Render 自動設定，程式會讀取 |
| `BACKEND_URL` | Frontend | Backend 的完整 URL，用於 proxy |
| `RUST_LOG` | Backend | Rust 日誌等級（可選） |

---

## 部署後檢查

1. **Backend health check**: `https://your-backend.onrender.com/api/health`
2. **Frontend**: 打開 `https://your-frontend.onrender.com`
3. **WebSocket**: 前端應該自動連接到 backend 的 WebSocket

---

## 常見問題

### Q: WebSocket 連不上？
A: 檢查 frontend 的 `BACKEND_URL` 環境變數是否正確設定（需包含 `https://`）

### Q: Build 失敗？
A: Render 免費方案有 build 時間限制，Rust 編譯可能超時。考慮：
- 使用 Docker（已經 pre-built）
- 升級到付費方案

### Q: Frontend 顯示但遊戲無法開始？
A: 檢查瀏覽器 console 是否有 CORS 或 WebSocket 錯誤

---

## 本地測試 Render 配置

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
```

開啟 http://localhost:3001 測試。
