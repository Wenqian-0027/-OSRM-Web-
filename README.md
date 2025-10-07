# 基于OSRM的城市骑行路径规划Web应用
- 项目介绍
这是一个基于 OpenStreetMap Routing Machine (OSRM)作为核心路径规划引擎 的 Web 应用，帮助用户在适合骑行漫游的城市中规划自行车骑行路径打卡热门点位，该项目的应用以珠海市为例，聚焦户外场景模拟骑行环境。
- 痛点解决
解决城市骑行漫游所面临的打卡点位多所导致的路径规划繁琐、行程时间无法量化等问题。
- 核心模式
  1）手动模式：用户自定义点位顺序生成路径。2）优化模式：系统根据用户选择的点位自动规划最便捷的路径。

## 功能
- 点位管理：点击地图添加起点/途经点/终点（最多 8 个），并显示顺序标签。
- 双规划模式：手动模式（按用户点击顺序生成固定路径）&优化模式（系统TSP算法重排点位生成最便捷路径）
- 道路吸附：基于OSRM Nearest API将用户所选点位吸附到最近自行车道。
- 路径生成：基于OSRM Route API生成路径。
- 步步指导：生成路径后提供对应的中文导航指示列表，点击高亮地图节点。
- 可视化：Leaflet地图实时渲染，Popup显示点位详情。

## 运行环境&技术栈
- 前端：HTML5、CSS3、JavaScript + Leaflet.js v1.9.4（交互地图）。
- 路径引擎： OSRM（bike profile，支持 A*/Dijkstra + CH 收缩层次加速）。
- API服务：OSRM Route/Trip/Nearest
- 算法：数据结构/算法、路径加速（CH/CRP）
- 浏览器：Chrome/Firefox，支持 Leaflet.js
- 地图中心：珠海示例（可修改坐标）

- 
- 需要本地 OSRM 服务器（支持 bike profile）：从 [OSRM GitHub](https://github.com/Project-OSRM/osrm-backend) 下载，运行 `osrm-extract`、`osrm-partition`、`osrm-customize` 和 `osrm-routed`（端口 5000）。

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
