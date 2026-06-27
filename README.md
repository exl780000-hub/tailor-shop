# 西裝店管理系統

## 部署到 Vercel

### 步驟一：上傳到 GitHub
1. 開啟 https://github.com/new 建立新 repo（名稱：tailor-shop）
2. 把這個資料夾的所有檔案上傳

### 步驟二：部署到 Vercel
1. 開啟 https://vercel.com
2. 用 GitHub 帳號登入
3. 點「Add New Project」→ 選剛建的 repo
4. 點「Deploy」

### 步驟三：設定環境變數
1. 部署完成後，進入 Vercel 專案頁面
2. 點「Settings」→「Environment Variables」
3. 新增：
   - Name: NOTION_TOKEN
   - Value: YOUR_NOTION_TOKEN_HERE
4. 儲存後點「Redeploy」

### 完成
網站會有一個 .vercel.app 的固定網址，手機直接開即可使用。
