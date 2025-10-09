// 初始化地图
const map = L.map('map').setView([22.0636, 113.2834], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// OSRM 服务端点
const osrmBase = 'http://localhost:5000';
let waypoints = [];
let routeLayers = [];
let allSteps = [];
let highlightMarker = null;
let optimizedWaypoints = [];
let currentMode = 'manual';  // 默认手动模式

// 翻译映射
const modifierMap = {
    'left': '左',
    'right': '右',
    'straight': '直行',
    'slight left': '轻微左',
    'slight right': '轻微右',
    'sharp left': '急左',
    'sharp right': '急右',
    'uturn': '掉头'
};

const typeMap = {
    'new name': '道路名称变更',
    'notification': '通知'
};

// 翻译函数
function translateModifier(modifier) {
    return modifierMap[modifier] || modifier;
}

function translateType(type) {
    return typeMap[type] || type;
}

// 基本指令生成函数
function getInstruction(step) {
    const maneuver = step.maneuver;
    const name = step.name || '道路';
    let instruction = '';

    // 骑行特定：坡度提示
    const elevation = step.elevation_change || 0;
    const elevNote = elevation > 50 ? '（上坡 +50m）' : elevation < -50 ? '（下坡 -50m）' : '';

    const mod = translateModifier(maneuver.modifier || '');
    const typ = translateType(maneuver.type);

    switch (maneuver.type) {
        case 'depart':
            instruction = `从${name}出发，向${mod}方向${elevNote}`;
            break;
        case 'arrive':
            instruction = `您已到达目的地${elevNote}`;
            break;
        case 'turn':
            instruction = `向${mod}转弯进入${name}${elevNote}`;
            break;
        case 'left':
        case 'right':
        case 'sharp left':
        case 'sharp right':
        case 'slight left':
        case 'slight right':
            const dir = maneuver.type.includes('left') ? '左' : '右';
            const intensity = maneuver.type.includes('sharp') ? '急' : maneuver.type.includes('slight') ? '轻微' : '';
            instruction = `${intensity}${dir}转弯进入${name}${elevNote}`;
            break;
        case 'use lane':
            instruction = `继续沿${mod}车道行驶${name}${elevNote}`;
            break;
        case 'continue':
            instruction = `继续行驶进入${name}${elevNote}`;
            break;
        case 'merge':
            instruction = `汇入${name}${elevNote}`;
            break;
        case 'fork':
            instruction = `在岔路口向${mod}保持进入${name}${elevNote}`;
            break;
        case 'name change':
        case 'new name':
            instruction = `道路名称变更，继续${mod}进入${name}${elevNote}`;
            break;
        case 'notification':
            instruction = `${maneuver.instruction || typ}${elevNote}`;
            break;
        case 'off ramp':
            instruction = `驶出${mod}匝道进入${name}${elevNote}`;
            break;
        case 'on ramp':
            instruction = `驶入匝道进入${name}${elevNote}`;
            break;
        case 'rotary':
        case 'roundabout':
            instruction = `在环岛${maneuver.exit ? `第${maneuver.exit}个` : '第一个'}出口进入${name}${elevNote}`;
            break;
        case 'end of road':
            instruction = `目的地位于${mod}道路尽头${elevNote}`;
            break;
        default:
            instruction = `执行${typ}${mod ? ' ' + mod : ''}${elevNote}`;
    }
    return instruction;
}

// 高亮步骤节点
function highlightStep(stepIndex) {
    const step = allSteps[stepIndex];
    if (!step) return;
    const location = step.maneuver.location;
    if (!location || location.length < 2) return;
    const latLng = L.latLng(location[1], location[0]);
    if (highlightMarker) map.removeLayer(highlightMarker);
    highlightMarker = L.circleMarker(latLng, { radius: 8, color: 'yellow', fillColor: 'yellow', fillOpacity: 0.8 })
        .addTo(map).bindPopup(`骑行转向: ${getInstruction(step)}`);
    map.flyTo(latLng, 16);
    document.querySelectorAll('#directions-content li').forEach((li, idx) => {
        li.style.backgroundColor = idx === stepIndex ? '#ffff99' : '#f9f9f9';
    });
}

// 生成步步指导 HTML
function generateDirections(route) {
    allSteps = route.legs.flatMap(leg => leg.steps);
    let html = `<div class="directions-header">骑行起点到终点</div>
                <p>${Math.round(route.distance / 1000)} km, ${Math.round(route.duration / 60)} min</p>
                <ul>`;
    allSteps.forEach((step, index) => {
        const instruction = getInstruction(step);
        const distance = Math.round(step.distance);
        html += `<li id="step-${index}" onclick="highlightStep(${index})">${instruction}<br>${distance} 米</li>`;
    });
    html += '</ul>';
    document.getElementById('directions-content').innerHTML = html;
}

// 添加标记
function addMarker(latlng, text = '点', color = 'blue', order = null) {
    let html = `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; color:white;">${order || ''}</div>`;
    return L.marker(latlng, {
        icon: L.divIcon({
            html: html,
            className: 'custom-div-icon',
            iconSize: [20, 20]
        })
    }).addTo(map).bindPopup(text).on('dragend', function() {
        const idx = waypoints.findIndex(w => w.equals(this.getLatLng()));
        if (idx !== -1) waypoints[idx] = this.getLatLng();
        updateStatus('点位已调整，请重新生成路线。');
    });
}

// 模式切换
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(mode + '-content').classList.add('active');
    // 禁用所有按钮，等待重新添加点
    disableAllButtons();
    updateStatus(`已切换到${mode === 'manual' ? '手动模式' : '优化模式'}，请点击地图添加起点。`);
}

// 禁用所有按钮
function disableAllButtons() {
    document.querySelectorAll('button[id]').forEach(btn => btn.disabled = true);
}

// 1. Nearest 服务：吸附点到最近自行车道
async function snapPoints() {
    if (waypoints.length === 0) { updateStatus('请先添加点位！'); return; }
    updateStatus('正在吸附到最近道路...');
    let snappedPoints = [];
    for (let wp of waypoints) {
        const coords = `${wp.lng},${wp.lat}`;
        const url = `${osrmBase}/nearest/v1/bike/${coords}?number=1`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.waypoints && data.waypoints.length > 0) {
                const snapped = data.waypoints[0].location;
                snappedPoints.push(L.latLng(snapped[1], snapped[0]));
            } else {
                snappedPoints.push(wp);
            }
        } catch (error) {
            console.error('Nearest 失败:', error);
            snappedPoints.push(wp);
        }
    }
    map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
    waypoints = snappedPoints;
    waypoints.forEach((w, i) => {
        const orderNum = i + 1;
        const color = currentMode === 'optimize' ? `hsl(${i * 45}, 70%, 50%)` : 'blue';
        addMarker(w, `点 ${orderNum}`, color, orderNum);
    });
    enableModeButtons();
    updateStatus('点位已吸附到最近自行车道！');
}

// 2. Trip 服务：优化多点顺序
async function optimizeTrip() {
    if (waypoints.length < 3 || waypoints.length > 8) { updateStatus('优化需 3-8 个点位！'); return; }
    updateStatus('正在优化行程顺序...');
    const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `${osrmBase}/trip/v1/bike/${coords}?source=first&roundtrip=false`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.waypoints && data.waypoints.length > 0 && data.trips && data.trips.length > 0) {
            const filteredWaypoints = data.waypoints.filter(wp => wp.trips_index === 0);
            optimizedWaypoints = filteredWaypoints.sort((a, b) => a.waypoint_index - b.waypoint_index)
                .map(wp => L.latLng(wp.location[1], wp.location[0]));
            map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
            optimizedWaypoints.forEach((w, i) => {
                const orderNum = i + 1;
                addMarker(w, `优化点 ${orderNum}`, `hsl(${i * 45}, 70%, 50%)`, orderNum);
            });
            updateStatus(`行程已优化！新顺序：${optimizedWaypoints.map((_, i) => i + 1).join(' -> ')}。`);
            document.getElementById('compare-matrix').disabled = false;
            document.getElementById('generate-route-optimize').disabled = false;
        } else {
            updateStatus('优化失败：OSRM /trip 未返回有效数据。');
        }
    } catch (error) {
        console.error('Trip 失败:', error);
        updateStatus('优化失败：' + error.message);
    }
}

// 3. Table 服务：生成矩阵
async function compareMatrix() {
    if (optimizedWaypoints.length < 2) { updateStatus('需至少2个点位！'); return; }
    updateStatus('正在计算矩阵...');
    const coords = optimizedWaypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `${osrmBase}/table/v1/bike/${coords}?sources=all&destinations=all`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.durations && data.distances) {
            let html = '<h4>骑行矩阵比较 (分钟 / km)</h4><table><tr><th>从/到</th>';
            for (let i = 0; i < optimizedWaypoints.length; i++) html += `<th>点 ${i+1}</th>`;
            html += '</tr>';
            for (let i = 0; i < optimizedWaypoints.length; i++) {
                html += `<tr><td>点 ${i+1}</td>`;
                for (let j = 0; j < optimizedWaypoints.length; j++) {
                    const time = Math.round(data.durations[i][j] / 60);
                    const dist = Math.round(data.distances[i][j] / 1000);
                    html += `<td>${time} min<br>${dist} km</td>`;
                }
                html += '</tr>';
            }
            html += '</table>';
            document.getElementById('comparison').innerHTML = html;
            updateStatus('矩阵比较已加载！');
        } else {
            updateStatus('矩阵计算失败。');
        }
    } catch (error) {
        console.error('Table 失败:', error);
        updateStatus('矩阵失败：' + error.message);
    }
}

// 4. Route 服务：手动模式生成
async function generateRouteManual() {
    if (waypoints.length < 2) { updateStatus('至少需要2个点位！'); return; }
    updateStatus('使用点击顺序生成骑行路线...');
    const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `${osrmBase}/route/v1/bike/${coords}?geometries=geojson&overview=full&alternatives=true&steps=true`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
            clearRoutes();
            const numRoutes = Math.min(3, data.routes.length);
            for (let i = 0; i < numRoutes; i++) {
                const layerGroup = L.layerGroup().addTo(map);
                displayRoute(data.routes[i], i, layerGroup);
                routeLayers.push(layerGroup);
            }
            generateDirections(data.routes[0]);
            updateInfo(data.routes[0]);
            updateStatus(`已生成 ${numRoutes} 条路线（手动顺序）。`);
        } else {
            updateStatus('未找到有效路线。');
        }
    } catch (error) {
        console.error('Route 失败:', error);
        updateStatus('生成失败：' + error.message);
    }
}

// 5. Route 服务：优化模式生成
async function generateRouteOptimize() {
    let usePoints = optimizedWaypoints.length > 0 ? optimizedWaypoints : waypoints;
    if (usePoints.length < 2) { updateStatus('至少需要2个点位！'); return; }
    updateStatus('使用优化顺序生成最优骑行路线...');
    const coords = usePoints.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `${osrmBase}/route/v1/bike/${coords}?geometries=geojson&overview=full&alternatives=true&steps=true`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
            clearRoutes();
            const numRoutes = Math.min(3, data.routes.length);
            for (let i = 0; i < numRoutes; i++) {
                const layerGroup = L.layerGroup().addTo(map);
                displayRoute(data.routes[i], i, layerGroup);
                routeLayers.push(layerGroup);
            }
            generateDirections(data.routes[0]);
            updateInfo(data.routes[0]);
            updateStatus(`已生成 ${numRoutes} 条最优路线（系统规划）。`);
        } else {
            updateStatus('未找到有效路线。');
        }
    } catch (error) {
        console.error('Route 失败:', error);
        updateStatus('生成失败：' + error.message);
    }
}

// 显示单条路线
function displayRoute(route, index, layerGroup) {
    const geoCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
    const color = `hsl(${index * 120}, 70%, 50%)`;
    L.polyline(geoCoords, {color: color, weight: 5})
        .addTo(layerGroup)
        .bindPopup(`备选路线 ${index + 1}:<br>距离: ${Math.round(route.distance)} 米<br>时间: ${Math.round(route.duration)} 秒`);
}

// 更新信息
function updateInfo(route) {
    document.getElementById('routeInfo').innerHTML = 
        `主路线距离: ${Math.round(route.distance)} 米 | 主路线时间: ${Math.round(route.duration)} 秒`;
}

// 更新状态
function updateStatus(msg) {
    document.getElementById('status').innerHTML = `状态: ${msg}`;
}

// 启用模式按钮
function enableModeButtons() {
    if (currentMode === 'manual') {
        document.getElementById('snap-points-manual').disabled = false;
        if (waypoints.length >= 2) document.getElementById('generate-route-manual').disabled = false;
    } else {
        document.getElementById('snap-points-optimize').disabled = false;
        if (waypoints.length >= 3) {
            document.getElementById('optimize-trip').disabled = false;
            document.getElementById('generate-route-optimize').disabled = false;
        }
    }
}

// 清空路线
function clearRoutes() {
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers = [];
    if (highlightMarker) map.removeLayer(highlightMarker);
}

// 交互：点击添加点位
map.on('click', function(e) {
    if (waypoints.length >= 8) { updateStatus('已达最大8个点位！'); return; }
    const idx = waypoints.length;
    const text = `点 ${idx + 1}`;
    const orderNum = idx + 1;
    const color = currentMode === 'optimize' ? `hsl(${idx * 45}, 70%, 50%)` : 'blue';
    const marker = addMarker(e.latlng, text, color, orderNum);
    waypoints.push(e.latlng);
    updateStatus(`已添加${text}。继续添加或生成路线。`);
    enableModeButtons();
    if (waypoints.length >= 3 && currentMode === 'optimize') {
        document.getElementById('optimize-trip').disabled = false;
    }
});

// 重置点位
function resetWaypoints() {
    map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
    clearRoutes();
    waypoints = [];
    optimizedWaypoints = [];
    allSteps = [];
    disableAllButtons();
    document.getElementById('routeInfo').innerHTML = '主路线距离: -- 米 | 主路线时间: -- 秒';
    document.getElementById('directions-content').innerHTML = '请添加点位并生成路线以查看详细步步指示。';
    document.getElementById('comparison').innerHTML = '';
    updateStatus('已重置，请点击地图添加起点。');
}

// 初始化
updateStatus('选择模式并点击地图添加起点。');