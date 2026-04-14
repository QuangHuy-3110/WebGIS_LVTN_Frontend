import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, TileWMS, Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Point, LineString, Polygon } from 'ol/geom';
import { Style, Icon, Stroke, Fill } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { ScaleLine, defaults as defaultControls } from 'ol/control';
import Overlay from 'ol/Overlay';
import { apply } from 'ol-mapbox-style';

/**
 * Tạo feature viền sọc đỏ-trắng kiểu Google Maps từ ring tọa độ [lon, lat].
 * Dùng 2 style chồng lên nhau: nền trắng + sọc đỏ đứt nét.
 */
function buildOverlayFeatures(lonLatRing) {
    const ring = lonLatRing.map(([lon, lat]) => fromLonLat([lon, lat]));
    const borderFeature = new Feature({ geometry: new Polygon([ring]) });

    // Style 1: Nền trắng dày
    const whiteStroke = new Style({
        stroke: new Stroke({
            color: 'rgba(255, 255, 255, 1)',
            width: 5,
        }),
        fill: new Fill({ color: 'rgba(0,0,0,0)' }),
    });

    // Style 2: Sọc đỏ đứt nét chồng lên
    const redDash = new Style({
        stroke: new Stroke({
            color: 'rgba(220, 30, 30, 1)',
            width: 5,
            lineDash: [12, 10],
            lineDashOffset: 0,
            lineCap: 'butt',
        }),
    });

    borderFeature.setStyle([whiteStroke, redDash]);
    return [borderFeature];
}

const MapComponent = ({ mapType, selectingMode, startPoint, endPoint, waypoints, activeFilters, onMapClick, onStoreClick, stores, selectedStore, currentLocation, triggerFlyTo, onRouteCalculated, activeRouteStep, hoveredStoreId }) => {
    const mapRef = useRef();
    const stepOverlayRef = useRef(null);
    const mapInstance = useRef(null);
    const [algorithm, setAlgorithm] = useState('astar');

    // Các Source dữ liệu
    const markerSourceRef = useRef(new VectorSource());
    const routeSourceRef = useRef(new VectorSource());
    const storeSourceRef = useRef(new VectorSource());
    const overlaySourceRef = useRef(new VectorSource());
    const currentLocSourceRef = useRef(new VectorSource());

    const roadsLayerRef = useRef(null);
    const boundaryLayerRef = useRef(null);
    const storeLayerRef = useRef(null);

    // Track trạng thái route
    const [hasRoute, setHasRoute] = useState(false);
    const lastRoutePointsRef = useRef('');

    // Style cho đường đi chính (Lộ trình)
    const routeStyleFunction = (feature) => {
        const type = feature.get('type');
        const isVirtual = type === 'virtual';
        return new Style({
            stroke: new Stroke({
                color: isVirtual ? '#808080' : '#1A73E8',
                width: isVirtual ? 4 : 6,
                lineDash: isVirtual ? [10, 10] : null,
                lineCap: 'round',
                lineJoin: 'round'
            })
        });
    };

    // 1. KHỞI TẠO BẢN ĐỒ
    useEffect(() => {
        const canThoCenter = fromLonLat([105.768078, 10.029714]);
        const extentLonLat = [105.648, 9.973, 105.856, 10.116];
        const mapExtent = transformExtent(extentLonLat, 'EPSG:4326', 'EPSG:3857');

        // Nền bản đồ
        const standardBase = new TileLayer({
            source: new XYZ({
                // Link này trỏ thẳng đến bản đồ đã CUSTOM của Huy (đã ẩn icon)
                // https://api.maptiler.com/maps/dataviz-v4/{z}/{x}/{y}.png?key=8VtL7nDfk7i0W2TAHvlE
                // https://api.maptiler.com/maps/base-v4/{z}/{x}/{y}@2x.png?key=8VtL7nDfk7i0W2TAHvlE
                // https://api.maptiler.com/maps/topo-v4/{z}/{x}/{y}@2x.png?key=8VtL7nDfk7i0W2TAHvlE
                url: `https://api.maptiler.com/maps/topo-v4/{z}/{x}/{y}@2x.png?key=${process.env.REACT_APP_MAPTILER_KEY}`,
                crossOrigin: 'anonymous',

                attributions: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
                maxZoom: 20
            }),
            visible: true,
            properties: { name: 'standard' }
        });
        // const standardBase = new TileLayer({
        //     source: new XYZ({ url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' }),
        //     visible: true, properties: { name: 'standard' }
        // });
        const satelliteBase = new TileLayer({
            source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 }),
            visible: false, properties: { name: 'satellite' }
        });

        // Lớp Geoserver (Đường & Ranh giới)
        const roadsLayer = new TileLayer({
            source: new TileWMS({
                url: `${process.env.REACT_APP_GEOSERVER_URL}/cantho_map/wms`,
                params: { 'LAYERS': 'cantho_map:planet_osm_line', 'TILED': true, 'STYLES': 'cantho_map:style_duong_di' },
                serverType: 'geoserver',
            }), zIndex: 5,
        });
        roadsLayerRef.current = roadsLayer;

        const boundaryLayer = new TileLayer({
            source: new TileWMS({
                url: `${process.env.REACT_APP_GEOSERVER_URL}/cantho_map/wms`,
                params: { 'LAYERS': 'cantho_map:ranh_gioi_can_tho', 'TILED': true, 'STYLES': 'style_ranh_gioi_ninh_kieu' },
                serverType: 'geoserver',
            }), zIndex: 10,
        });
        boundaryLayerRef.current = boundaryLayer;

        // --- OVERLAY VÙNG MỜ + VIỀN CHẤM ---
        // Fetch từ cantho_boundary.geojson (17 điểm tọa độ thực tế Cần Thơ)
        const overlaySource = overlaySourceRef.current;

        const FALLBACK_RING = [
            [105.633, 10.08], [105.646, 10.015], [105.665, 9.989],
            [105.692, 9.981], [105.709, 9.942], [105.724, 9.91],
            [105.762, 9.893], [105.78, 9.918], [105.796, 9.938],
            [105.805, 9.96], [105.839, 9.977], [105.847, 10.007],
            [105.778, 10.089], [105.753, 10.1], [105.729, 10.118],
            [105.678, 10.145], [105.647, 10.128], [105.633, 10.08]
        ];

        const applyOverlay = (ring) => {
            overlaySource.clear();
            overlaySource.addFeatures(buildOverlayFeatures(ring));
        };

        fetch('/cantho_boundary.geojson?v=' + Date.now())
            .then(r => r.json())
            .then(geojson => {
                const ring = geojson?.features?.[0]?.geometry?.coordinates?.[0];
                applyOverlay((ring && ring.length >= 4) ? ring : FALLBACK_RING);
            })
            .catch(() => applyOverlay(FALLBACK_RING));

        const overlayLayer = new VectorLayer({ source: overlaySource, zIndex: 50 });

        // Các lớp Vector
        const routeLayer = new VectorLayer({ source: routeSourceRef.current, zIndex: 500, style: routeStyleFunction }); // Hạ zIndex của đường đi xuống
        const markerLayer = new VectorLayer({ source: markerSourceRef.current, zIndex: 1000, declutter: true });
        const storeLayer = new VectorLayer({ source: storeSourceRef.current, zIndex: 998, declutter: true }); // Z-Index cao hơn đường đi
        const currentLocLayer = new VectorLayer({ source: currentLocSourceRef.current, zIndex: 1001 });
        storeLayerRef.current = storeLayer;

        const map = new Map({
            target: mapRef.current,
            controls: defaultControls({ zoom: false }).extend([new ScaleLine()]),
            layers: [standardBase, satelliteBase, roadsLayer, boundaryLayer, overlayLayer, routeLayer, markerLayer, storeLayer, currentLocLayer],
            view: new View({ center: canThoCenter, zoom: 13, extent: mapExtent, minZoom: 10, maxZoom: 21 }),
        });

        // Khởi tạo Overlay cho Chấm đánh dấu của Lộ Trình (Active Step)
        const stepElement = document.createElement('div');
        stepElement.style.width = '20px';
        stepElement.style.height = '20px';
        stepElement.style.backgroundColor = '#4285F4';
        stepElement.style.border = '3px solid white';
        stepElement.style.borderRadius = '50%';
        stepElement.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        stepElement.style.transition = 'all 0.3s ease';

        const stepOverlay = new Overlay({
            element: stepElement,
            positioning: 'center-center',
            stopEvent: false
        });
        map.addOverlay(stepOverlay);
        stepOverlayRef.current = stepOverlay;

        let mapRenderStartTime = performance.now();
        map.on('movestart', () => {
            mapRenderStartTime = performance.now();
        });
        map.on('moveend', () => {
            console.log(`🗺️ [MEASURE] Thời gian thao tác và render lại bản đồ: ${(performance.now() - mapRenderStartTime).toFixed(2)} ms`);
        });

        // apply(map, 'https://api.maptiler.com/maps/019d0506-cf0e-703d-ad64-49a526a7b56d/style.json?key=8VtL7nDfk7i0W2TAHvlE')
        //     .then(() => {
        //         console.log("Đã tải xong Vector Style của Huy!");
        //         // Nếu muốn lớp vệ tinh Esri cũ vẫn hoạt động, bạn có thể thêm logic ở đây
        //     });

        mapInstance.current = map;
        return () => map.setTarget(null);
    }, []);

    // 1b. EFFECT: VẼ / CẬP NHẬT ICON VỊ TRÍ HIỆN TẠI
    useEffect(() => {
        const source = currentLocSourceRef.current;
        source.clear();
        if (!currentLocation) return;

        const feature = new Feature({
            geometry: new Point(fromLonLat(currentLocation))
        });
        feature.setStyle(new Style({
            image: new Icon({
                src: '/currentnode.png',
                scale: 0.02,
                anchor: [0.5, 0.5],
                crossOrigin: 'anonymous',
            })
        }));
        source.addFeature(feature);
    }, [currentLocation]);

    // 2. EFFECT: XỬ LÝ HIỂN THỊ CỬA HÀNG & ICON
    useEffect(() => {
        const source = storeSourceRef.current;
        if (!source) return;
        source.clear();

        if (!stores || stores.length === 0) return;

        const getIconSrc = (props) => {
            if (props.category_detail && props.category_detail.icon) {
                return props.category_detail.icon;
            }
            return 'https://cdn-icons-png.flaticon.com/512/684/684908.png';
        };

        const selectedId = selectedStore ? (selectedStore.id || selectedStore.ID) : null;

        // Chọn 1 đại diện ổn định (ngẫu nhiên theo ID) cho mỗi danh mục để đảm bảo ít nhất 1 cửa hàng luôn hiển thị
        const categoryRepresentatives = {};
        stores.forEach(store => {
            const props = store.properties || store;
            const categoryId = props.category_detail ? props.category_detail.id : (props.category || 1);
            if (!categoryRepresentatives[categoryId]) {
                categoryRepresentatives[categoryId] = props.id;
            } else {
                // Pseudo-random ổn định dựa vào ID (tránh bị thay đổi cửa hàng liên tục khi di chuyển bản đồ)
                if ((props.id * 17) % 13 > (categoryRepresentatives[categoryId] * 17) % 13) {
                    categoryRepresentatives[categoryId] = props.id;
                }
            }
        });

        stores.forEach(store => {
            const props = store.properties || store;

            let lng, lat;
            if (store.geometry && store.geometry.coordinates) {
                lng = store.geometry.coordinates[0];
                lat = store.geometry.coordinates[1];
            } else {
                lng = store.lng;
                lat = store.lat;
            }

            if (!lng || !lat) return;

            const feature = new Feature({
                geometry: new Point(fromLonLat([lng, lat])),
                ...props
            });

            const iconSrc = getIconSrc(props);

            feature.setStyle((_, resolution) => {
                const mapInstanceObj = mapInstance.current;
                const mapZoom = mapInstanceObj ? mapInstanceObj.getView().getZoomForResolution(resolution) : 13;

                const ratingCount = props.rating_count || 0;
                const ratingAvg = props.rating_avg || 0;
                const isHighQuality = ratingAvg >= 3.5 && ratingCount >= 1; // Điều chỉnh ngưỡng vừa phải
                const categoryId = props.category_detail ? props.category_detail.id : (props.category || 1);

                const selectedStoreId = selectedStore ? (selectedStore.id || selectedStore.ID) : null;
                const isSelected = selectedStoreId && (props.id === selectedStoreId);
                const isRepresentative = categoryRepresentatives[categoryId] === props.id;

                // Phân loại nhóm để gán mức ưu tiên xuất hiện & Z-Index
                const categoryName = props.category_detail ? (props.category_detail.name || '').toLowerCase() : '';

                let visibilityLevel = 4;

                // Level 1: Nhóm thiết yếu & công cộng (Luôn ưu tiên hiển thị nhất)
                if (categoryName.includes('y tế') || categoryName.includes('giáo dục') || categoryName.includes('vận tải') || categoryName.includes('ẩm thực') || categoryName.includes('nhà hàng') || categoryName.includes('quán')) {
                    visibilityLevel = 1;
                }
                // Level 2: Nhóm tiện ích & sinh hoạt
                else if (categoryName.includes('siêu thị') || categoryName.includes('hành chính') || categoryName.includes('tài chính') || categoryName.includes('đồ uống') || categoryName.includes('lưu trú') || categoryName.includes('cafe')) {
                    visibilityLevel = 2;
                }
                // Level 3: Nhóm thương mại, công nghệ & giải trí
                else if (categoryName.includes('mua sắm') || categoryName.includes('công nghệ') || categoryName.includes('xe cộ') || categoryName.includes('giải trí')) {
                    visibilityLevel = 3;
                }
                // Level 4: Nhóm dịch vụ cá nhân, tôn giáo, xây dựng, nông nghiệp...
                else {
                    visibilityLevel = 4;
                }

                let isVisible = true;

                // Kiểm tra xem store này có phải là điểm trên lộ trình không
                const isRoutePoint = (
                    (startPoint && props.lng === startPoint[0] && props.lat === startPoint[1]) ||
                    (endPoint && props.lng === endPoint[0] && props.lat === endPoint[1]) ||
                    (waypoints && waypoints.some(wp => props.lng === wp[0] && props.lat === wp[1]))
                );

                // Kiểm tra xem có đang dùng bộ lọc không
                const hasActiveFilter = activeFilters && activeFilters.length > 0;

                const isHovered = hoveredStoreId && String(props.id) === String(hoveredStoreId);

                if (!isSelected && !isRoutePoint && !isHovered && !hasActiveFilter) {
                    // 1. Phân loại theo zoom để ẩn bớt lớp
                    if (mapZoom < 12 && visibilityLevel > 1) {
                        isVisible = false;
                    } else if (mapZoom >= 12 && mapZoom < 14 && visibilityLevel > 3) {
                        isVisible = false;
                    } else if (mapZoom >= 14 && mapZoom < 16 && visibilityLevel > 4) {
                        isVisible = false;
                    }

                    // 2. Lọc chất lượng & đại diện (chỉ áp dụng ở mapZoom < 13)
                    if (mapZoom < 13 && !isHighQuality && !isRepresentative) {
                        isVisible = false;
                    }
                }

                if (!isVisible) return null; // Không hiển thị feature này

                const scale = (isSelected || isRoutePoint || isHovered) ? 0.08 : 0.054;

                // TÍNH ĐIỂM ƯU TIÊN (Z-INDEX)
                let priorityZ = 0;
                if (isHighQuality || isRepresentative) {
                    if (visibilityLevel === 1) priorityZ = 90;
                    else if (visibilityLevel === 2) priorityZ = 80;
                    else if (visibilityLevel === 3) priorityZ = 70;
                    else priorityZ = 60; // Level 4
                } else {
                    if (visibilityLevel === 1) priorityZ = 40;
                    else if (visibilityLevel === 2) priorityZ = 30;
                    else if (visibilityLevel === 3) priorityZ = 20;
                    else priorityZ = 10;
                }

                // Đảm bảo zIndex là duy nhất cho mỗi feature để declutter (chống đè) ổn định 100%
                const storeIdNum = parseInt(props.id || 0, 10) || 0;
                const uniquePriorityZ = priorityZ * 100000 + storeIdNum;
                // Nếu cửa hàng được Click, Hover hoặc là điểm trên lộ trình, set thẳng lên tối đa để ăn hết khoảng trống
                const finalZIndex = (isSelected || isRoutePoint || isHovered) ? 99999999 : uniquePriorityZ;

                // Mức zoom sát nhất thì bỏ chống đè, hiện cho bằng hết (20.5)
                const isMaxZoom = mapZoom >= 20.5;

                return new Style({
                    image: new Icon({
                        src: iconSrc,
                        scale,
                        anchor: [0.5, 1],
                        crossOrigin: 'anonymous',
                        declutterMode: (isSelected || isRoutePoint || isHovered) ? 'none' : ((hasActiveFilter || isMaxZoom) ? 'none' : 'declutter')
                    }),
                    zIndex: finalZIndex
                });
            });

            source.addFeature(feature);
        });
    }, [stores, selectedStore, activeFilters, startPoint, endPoint, waypoints, hoveredStoreId]);

    // 3. EFFECT: CỬA HÀNG LUÔN HIỂN THỊ KỂ CẢ KHI CÓ ĐƯỜNG ĐI
    useEffect(() => {
        if (storeLayerRef.current) {
            storeLayerRef.current.setVisible(true);
        }
    }, [hasRoute]);

    // 4. EFFECT: TÌM ĐƯỜNG (ROUTING) - Hỗ trợ nhiều chặng (waypoints)
    useEffect(() => {
        const routeSource = routeSourceRef.current;
        if (!routeSource) return;

        const points = [startPoint, ...(waypoints || []), endPoint].filter(Boolean);

        if (points.length < 2) {
            routeSource.clear();
            setHasRoute(false);
            if (onRouteCalculated) onRouteCalculated([]);
            return;
        }

        const fetchRouteSegment = async (p1, p2) => {
            const startFetchTime = performance.now();
            const url = `${process.env.REACT_APP_API_URL}/route/?start_lat=${p1[1]}&start_lng=${p1[0]}&end_lat=${p2[1]}&end_lng=${p2[0]}&algo=${algorithm}`;
            const res = await fetch(url);
            const data = await res.json();
            const endFetchTime = performance.now();
            console.log(`⏱️ [MEASURE] Thời gian phản hồi API Route: ${(endFetchTime - startFetchTime).toFixed(2)} ms`);
            return data;
        };

        const fetchAllRoutes = async () => {
            try {
                const promises = [];
                for (let i = 0; i < points.length - 1; i++) {
                    promises.push(fetchRouteSegment(points[i], points[i + 1]));
                }

                const results = await Promise.all(promises);

                routeSource.clear();
                let allFeatures = [];
                let routeInstructions = [];
                const geojsonFormat = new GeoJSON();

                results.forEach((data, index) => {
                    if (data && data.features) {
                        const features = geojsonFormat.readFeatures(data, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        });

                        if (features.length > 0) {
                            const p1 = points[index];
                            const p2 = points[index + 1];
                            const routeStartCoord = features[0].getGeometry().getFirstCoordinate();
                            const routeEndCoord = features[features.length - 1].getGeometry().getLastCoordinate();

                            const startConnector = new Feature({
                                geometry: new LineString([fromLonLat(p1), routeStartCoord])
                            });
                            startConnector.setStyle(new Style({
                                stroke: new Stroke({ color: '#1A73E8', width: 4, lineDash: [10, 10] })
                            }));

                            const endConnector = new Feature({
                                geometry: new LineString([routeEndCoord, fromLonLat(p2)])
                            });
                            endConnector.setStyle(new Style({
                                stroke: new Stroke({ color: '#1A73E8', width: 4, lineDash: [10, 10] })
                            }));

                            routeSource.addFeature(startConnector);
                            routeSource.addFeature(endConnector);
                        }

                        // Collect instructions from properties, aligning geometries sequentially!
                        if (data.features) {
                            let previousEnd = null;

                            data.features.forEach((f, fIndex) => {
                                if (f.properties && f.properties.type === 'road') {
                                    const rawGeom = f.geometry;
                                    if (!rawGeom || !rawGeom.coordinates || rawGeom.coordinates.length < 2) return;

                                    let coords = [...rawGeom.coordinates];
                                    let isReversed = false;

                                    if (previousEnd) {
                                        // Compare the distance from previousEnd to first vs last node
                                        const distToFirst = Math.pow(coords[0][0] - previousEnd[0], 2) + Math.pow(coords[0][1] - previousEnd[1], 2);
                                        const distToLast = Math.pow(coords[coords.length - 1][0] - previousEnd[0], 2) + Math.pow(coords[coords.length - 1][1] - previousEnd[1], 2);

                                        if (distToLast < distToFirst) {
                                            coords.reverse();
                                            isReversed = true;
                                        }
                                    } else {
                                        // For the very first feature, compare with the next feature to see which end connects
                                        const nextF = data.features[fIndex + 1];
                                        if (nextF && nextF.geometry && nextF.geometry.coordinates && nextF.geometry.coordinates.length > 0) {
                                            const nextCoords = nextF.geometry.coordinates;
                                            const pA = nextCoords[0];
                                            const pB = nextCoords[nextCoords.length - 1];

                                            const distFirstToNext1 = Math.pow(coords[0][0] - pA[0], 2) + Math.pow(coords[0][1] - pA[1], 2);
                                            const distFirstToNext2 = Math.pow(coords[0][0] - pB[0], 2) + Math.pow(coords[0][1] - pB[1], 2);
                                            const distLastToNext1 = Math.pow(coords[coords.length - 1][0] - pA[0], 2) + Math.pow(coords[coords.length - 1][1] - pA[1], 2);
                                            const distLastToNext2 = Math.pow(coords[coords.length - 1][0] - pB[0], 2) + Math.pow(coords[coords.length - 1][1] - pB[1], 2);

                                            // If first point of this edge connects to next edge, then this edge is backward!
                                            const minFirst = Math.min(distFirstToNext1, distFirstToNext2);
                                            const minLast = Math.min(distLastToNext1, distLastToNext2);
                                            if (minFirst < minLast) {
                                                coords.reverse();
                                            }
                                        }
                                    }

                                    // Next iteration standard
                                    previousEnd = coords[coords.length - 1];

                                    routeInstructions.push({
                                        name: f.properties.name || 'Đường không tên',
                                        length_m: parseFloat(f.properties.length_m) || 0,
                                        coord: coords[0], // Lấy đúng điểm ĐẦU bước vào của ngã rẽ!
                                        geom: coords
                                    });
                                }
                            });
                        }

                        allFeatures = [...allFeatures, ...features];
                    }

                    // Thêm thông tin điểm dừng (waypoint) hoặc điểm đến (destination)
                    if (index < results.length - 1) {
                        const wpCoord = points[index + 1];
                        const wpStore = stores.find(s => s.lng === wpCoord[0] && s.lat === wpCoord[1]);
                        const wpName = wpStore ? wpStore.name : `Điểm dừng ${index + 1}`;
                        routeInstructions.push({
                            isWaypoint: true,
                            name: wpName,
                            coord: wpCoord,
                            length_m: 0,
                            geom: []
                        });
                    } else if (index === results.length - 1) {
                        const destCoord = points[points.length - 1];
                        const destStore = stores.find(s => s.lng === destCoord[0] && s.lat === destCoord[1]);
                        const destName = destStore ? destStore.name : 'đích';
                        routeInstructions.push({
                            isDestination: true,
                            name: destName,
                            coord: destCoord,
                            length_m: 0,
                            geom: []
                        });
                    }
                });

                routeSource.addFeatures(allFeatures);
                setHasRoute(allFeatures.length > 0);
                if (onRouteCalculated) {
                    onRouteCalculated(routeInstructions);
                }

                const currentPointsStr = JSON.stringify(points);
                const isNewRoute = lastRoutePointsRef.current !== currentPointsStr;
                lastRoutePointsRef.current = currentPointsStr;

                if (isNewRoute && mapInstance.current && allFeatures.length > 0) {
                    const extent = routeSource.getExtent();
                    if (extent && !extent.includes(Infinity)) {
                        mapInstance.current.getView().fit(extent, { padding: [100, 100, 100, 100], duration: 1000 });
                    }
                }
            } catch (e) {
                console.error("Lỗi tìm đường:", e);
            }
        };

        fetchAllRoutes();

    }, [startPoint, endPoint, waypoints, algorithm]);

    // 5. EFFECT: VẼ MARKER ĐIỂM ĐI / ĐẾN
    useEffect(() => {
        const source = markerSourceRef.current;
        if (!source) return;
        source.clear();

        const iconStyle = (src) => new Style({
            image: new Icon({ anchor: [0.5, 1], src: src, scale: 0.12 })
        });

        // Hàm kiểm tra xem một toạ độ có thuộc về một cửa hàng bất kỳ không
        const isStoreCoord = (coord) => {
            if (!coord) return false;
            return stores && stores.some(s => s.lng === coord[0] && s.lat === coord[1]);
        };

        // Chỉ vẽ ping_blue khi điểm đi KHÔNG phải vị trí hiện tại
        // VÀ KHÔNG trùng với toạ độ của quán
        const isStartAtCurrentLoc = currentLocation &&
            startPoint &&
            startPoint[0] === currentLocation[0] &&
            startPoint[1] === currentLocation[1];

        if (startPoint && !isStartAtCurrentLoc && !isStoreCoord(startPoint)) {
            const feature = new Feature({ geometry: new Point(fromLonLat(startPoint)) });
            feature.setStyle(iconStyle('/ping_blue.png'));
            source.addFeature(feature);
        }

        // Vẽ các điểm dừng (waypoints)
        if (waypoints && waypoints.length > 0) {
            waypoints.forEach((wp) => {
                if (!isStoreCoord(wp)) {
                    const feature = new Feature({ geometry: new Point(fromLonLat(wp)) });
                    feature.setStyle(iconStyle('/ping_blue.png'));
                    source.addFeature(feature);
                }
            });
        }

        if (endPoint && !isStoreCoord(endPoint)) {
            const feature = new Feature({ geometry: new Point(fromLonLat(endPoint)) });
            feature.setStyle(iconStyle('/ping_red.png'));
            source.addFeature(feature);
        }
    }, [startPoint, endPoint, waypoints, currentLocation, stores]);

    // 6. CÁC TƯƠNG TÁC KHÁC
    useEffect(() => {
        if (!mapInstance.current) return;
        const handleMapClickInternal = (evt) => {
            const feature = mapInstance.current.forEachFeatureAtPixel(evt.pixel, (feat) => feat);
            if (feature && feature.getProperties().id && onStoreClick) {
                onStoreClick(feature.getProperties()); return;
            }
            if (onMapClick) onMapClick(toLonLat(evt.coordinate));
        };
        mapInstance.current.on('click', handleMapClickInternal);
        return () => mapInstance.current.un('click', handleMapClickInternal);
    }, [onMapClick, onStoreClick]);

    useEffect(() => {
        if (mapRef.current) mapRef.current.style.cursor = selectingMode ? 'crosshair' : 'default';
    }, [selectingMode]);

    useEffect(() => {
        if (!mapInstance.current) return;
        const layers = mapInstance.current.getLayers().getArray();
        layers.forEach(layer => {
            if (layer.get('name') === 'standard') layer.setVisible(mapType === 'standard');
            if (layer.get('name') === 'satellite') layer.setVisible(mapType === 'satellite');
        });
        if (roadsLayerRef.current) {
            const newStyle = mapType === 'satellite' ? 'cantho_map:style_ve_tinh' : 'cantho_map:style_duong_di';
            roadsLayerRef.current.getSource().updateParams({ 'STYLES': newStyle });
        }
        if (boundaryLayerRef.current) {
            const newStyle = mapType === 'satellite' ? 'style_ranh_gioi_vetinh' : 'style_ranh_gioi_mac_dinh';
            boundaryLayerRef.current.getSource().updateParams({ 'STYLES': newStyle });
        }
    }, [mapType]);

    // 7. EFFECT: FLY TO LOCATION
    useEffect(() => {
        if (triggerFlyTo > 0 && mapInstance.current && currentLocation) {
            mapInstance.current.getView().animate({
                center: fromLonLat(currentLocation),
                zoom: 15,
                duration: 800,
            });
        }
        // Bỏ currentLocation để Map KHÔNG bị bay lại mỗi khi cập nhật GPS
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerFlyTo]);

    // CẬP NHẬT VỊ TRÍ CHẤM TRÒN LỘ TRÌNH (ACTIVE STEP)
    useEffect(() => {
        if (stepOverlayRef.current) {
            if (activeRouteStep) {
                const targetPixel = fromLonLat(activeRouteStep);
                stepOverlayRef.current.setPosition(targetPixel);
                // Pan nhẹ màn hình tới
                if (mapInstance.current) {
                    mapInstance.current.getView().animate({ center: targetPixel, duration: 600 });
                }
            } else {
                stepOverlayRef.current.setPosition(undefined);
            }
        }
    }, [activeRouteStep]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />

            {/* UI Chọn Thuật Toán */}
            {/* <div className="algorithm-selector-card">
                <div className="algo-info">
                    <label>Chế độ tìm đường</label>
                    <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
                        <option value="dijkstra">Dijkstra (Mặc định)</option>
                        <option value="astar">A* (A-Star)</option>
                    </select>
                </div>
            </div> */}
        </div>
    );
};

export default MapComponent;