# 基于OSRM的城市骑行路径规划Web应用

这是一个基于 OpenStreetMap Routing Machine (OSRM) 的 Web 应用，用于规划城市骑行路线。支持添加点位、吸附道路、优化顺序、生成备选路线等功能。

## 功能
- 点击地图添加起点/途经点/终点（最多 8 个）。
- 吸附点位到最近自行车道。
- TSP 优化行程顺序。
- 距离/时间矩阵比较。
- 生成 3 条备选骑行路线，并显示步步指导。

## 运行环境
- 需要本地 OSRM 服务器（支持 bike profile）：从 [OSRM GitHub](https://github.com/Project-OSRM/osrm-backend) 下载，运行 `osrm-extract`、`osrm-partition`、`osrm-customize` 和 `osrm-routed`（端口 5000）。
- 浏览器：Chrome/Firefox，支持 Leaflet.js。
- 地图中心：珠海示例（可修改坐标）。

## 快速启动
1. 启动 OSRM 服务器：`./osrm-routed --algorithm MLD data.osrm`.
2. 打开 `index2.html` 在浏览器中运行。

## 技术栈
- 前端：HTML/CSS/JavaScript + Leaflet.js。
- 后端：OSRM API（路径规划）。
- 语言：JavaScript。

## 贡献
欢迎 Pull Request！如需 AI 增强版，见分支 `ai-enhanced`。

## 许可证
MIT License。
