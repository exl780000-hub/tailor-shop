const { readFileSync, writeFileSync, mkdirSync } = require("fs");
const babel = require("@babel/core");

mkdirSync("dist", { recursive: true });
mkdirSync("dist/api", { recursive: true });

const jsxContent = readFileSync("public/order-entry.jsx", "utf8");
const result = babel.transformSync(jsxContent, {
  presets: [
    ["@babel/preset-env", { targets: { browsers: ["last 2 versions"] }, modules: false }],
    ["@babel/preset-react", {}]
  ],
  filename: "order-entry.jsx",
});

const wrapped = `
const { useState, useMemo } = React;
${result.code}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
`;

writeFileSync("dist/app.js", wrapped);

const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>✦ GONY 西裝店管理系統</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #0F1923; color: #F0EBE0; font-family: -apple-system, 'Segoe UI', sans-serif; }<\/style>
</head>
<body>
  <div id="root"></div>
  <script src="/app.js"><\/script>
</body>
</html>`;

writeFileSync("dist/index.html", html);

const apiContent = readFileSync("api/create-order.js", "utf8");
writeFileSync("dist/api/create-order.js", apiContent);

console.log("Build complete!");
