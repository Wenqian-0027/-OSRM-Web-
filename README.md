# 基于OSRM的城市骑行路径规划Web应用
- 项目介绍
这是一个基于 OpenStreetMap Routing Machine (OSRM)作为核心路径规划引擎 的 Web 应用，帮助用户在适合骑行漫游的城市中规划自行车骑行路径打卡热门点位，该项目的应用以珠海市为例，聚焦户外场景模拟骑行环境。
- 痛点解决
解决城市骑行漫游所面临的打卡点位多所导致的路径规划繁琐、行程时间无法量化等问题。
- 核心模式
  1）手动模式：用户自定义点位顺序生成路径。2）优化模式：系统根据用户选择的点位自动规划最便捷的路径。

## 功能
- 点位管理：点击地图添加起点/途经点/终点，并显示顺序标签。
- 双规划模式：手动模式（按用户点击顺序生成固定路径）&优化模式（系统TSP算法重排点位生成最便捷路径）
- 道路吸附：基于OSRM Nearest API将用户所选点位吸附到最近自行车道。
- 路径生成：基于OSRM Route API生成路径。
- 步步指导：生成路径后提供对应的中文导航指示列表，点击高亮地图节点。
- 可视化：Leaflet地图实时渲染，Popup显示点位详情。

## 技术栈
- 前端：HTML5、CSS3、JavaScript + Leaflet.js v1.9.4（交互地图）。
- 路径引擎： OSRM【bike profile，支持Contraction Hierarchies (CH)与Multi-Level Dijkstra (MLD)路径加速收缩】
- API服务：
  + Nearest Service
  + Route Service
  + Trip Service
- 浏览器：Chrome/Firefox，支持 Leaflet.js
- 地图中心：珠海示例（可修改坐标）
- 需要本地 OSRM 服务器（支持 bike profile）

## 运行环境&快速启动
- 使用Docker导入后端环境
1. 下载珠海的OpenStreetMap[摘录](https://download.geofabrik.de/)。
2. 提取（osrm-extract）：从原始 .osm.pbf 文件（OpenStreetMap 数据）提取路网，生成 .osrm 文件。 在osm.pbf目录下打开终端，输入以下指令（PowerShell 支持）。
```C
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/bicycle.lua /data/guangdong-latest.osm.pbf; if ($LASTEXITCODE -ne 0) { Write-Output "osrm-extract failed" }
```
3. 分区（osrm-partition）：将路网划分为子区域,OSRM 使用多级分区（Multi-Level Partitioning）技术来优化大规模路由数据的查询性能。
```C
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/guangdong-latest.osrm; if ($LASTEXITCODE -ne 0) { Write-Output "osrm-partition failed" }
```
4. 定制（osrm-customize）：生成查询所需的额外数据结构（如权重、查找表）。
```C
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/guangdong-latest.osrm; if ($LASTEXITCODE -ne 0) { Write-Output "osrm-customize failed" }
```
5. 启动路由服务，基于处理后的数据响应路由请求，启动服务器，提供 API 查询。
```C
docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/berlin-latest.osrm
```
- 前端运行
1. 打开 `index.html` 在浏览器中运行。


## OSRM API官方
OSRM API [官方文档](https://project-osrm.org/docs/v5.5.1/api/?language=cURL#general-options)

## 实现效果
![image](https://github.com/Wenqian-0027/-OSRM-Web-/blob/main/Data/%E7%BD%91%E9%A1%B5%E6%88%AA%E5%9B%BE1.png)
![image](https://github.com/Wenqian-0027/-OSRM-Web-/blob/main/Data/%E7%BD%91%E9%A1%B5%E6%88%AA%E5%9B%BE2.png)


