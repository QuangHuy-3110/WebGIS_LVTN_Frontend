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

const MapComponent = ({ mapType, selectingMode, startPoint, endPoint, onMapClick, onStoreClick, stores, selectedStore, currentLocation, triggerFlyTo }) => {
    const mapRef = useRef();
    const mapInstance = useRef(null);
    const [algorithm, setAlgorithm] = useState('dijkstra');

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
            source: new XYZ({ url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' }),
            visible: true, properties: { name: 'standard' }
        });
        const satelliteBase = new TileLayer({
            source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 }),
            visible: false, properties: { name: 'satellite' }
        });

        // Lớp Geoserver (Đường & Ranh giới)
        const roadsLayer = new TileLayer({
            source: new TileWMS({
                url: 'http://localhost:8080/geoserver/cantho_map/wms',
                params: { 'LAYERS': 'cantho_map:planet_osm_line', 'TILED': true, 'STYLES': 'cantho_map:style_duong_di' },
                serverType: 'geoserver',
            }), zIndex: 5,
        });
        roadsLayerRef.current = roadsLayer;

        const boundaryLayer = new TileLayer({
            source: new TileWMS({
                url: 'http://localhost:8080/geoserver/cantho_map/wms',
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
        const routeLayer = new VectorLayer({ source: routeSourceRef.current, zIndex: 998, style: routeStyleFunction });
        const markerLayer = new VectorLayer({ source: markerSourceRef.current, zIndex: 999 });
        const storeLayer = new VectorLayer({ source: storeSourceRef.current, zIndex: 500 });
        const currentLocLayer = new VectorLayer({ source: currentLocSourceRef.current, zIndex: 1001 });
        storeLayerRef.current = storeLayer;

        const map = new Map({
            target: mapRef.current,
            controls: defaultControls({ zoom: false }).extend([new ScaleLine()]),
            layers: [standardBase, satelliteBase, roadsLayer, boundaryLayer, overlayLayer, routeLayer, markerLayer, storeLayer, currentLocLayer],
            view: new View({ center: canThoCenter, zoom: 13, extent: mapExtent, minZoom: 10, maxZoom: 18 }),
        });

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
            const isSelected = selectedId && (props.id === selectedId);
            const scale = isSelected ? 0.10 : 0.05;

            feature.setStyle(new Style({
                image: new Icon({
                    src: iconSrc,
                    scale,
                    anchor: [0.5, 1],
                    crossOrigin: 'anonymous',
                })
            }));
            source.addFeature(feature);
        });
    }, [stores, selectedStore]);

    // 3. EFFECT: ẨN/HIỆN LAYER CỬA HÀNG KHI CÓ/KHÔNG CÓ ĐƯỜNG ĐI
    useEffect(() => {
        if (storeLayerRef.current) {
            storeLayerRef.current.setVisible(!hasRoute);
        }
    }, [hasRoute]);

    // 4. EFFECT: TÌM ĐƯỜNG (ROUTING) - Có vẽ đường nối Connector
    useEffect(() => {
        const routeSource = routeSourceRef.current;
        if (!routeSource) return;

        if (!startPoint || !endPoint) {
            routeSource.clear();
            setHasRoute(false);
            return;
        }

        // Gọi API với thuật toán được chọn
        const url = `http://127.0.0.1:8000/api/route/?start_lat=${startPoint[1]}&start_lng=${startPoint[0]}&end_lat=${endPoint[1]}&end_lng=${endPoint[0]}&algo=${algorithm}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                routeSource.clear();
                if (data && data.features) {
                    const geojsonFormat = new GeoJSON();
                    const features = geojsonFormat.readFeatures(data, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    });

                    if (features.length > 0) {
                        const routeStartCoord = features[0].getGeometry().getFirstCoordinate();
                        const routeEndCoord = features[features.length - 1].getGeometry().getLastCoordinate();

                        const startConnector = new Feature({
                            geometry: new LineString([fromLonLat(startPoint), routeStartCoord])
                        });
                        startConnector.setStyle(new Style({
                            stroke: new Stroke({ color: '#1A73E8', width: 4, lineDash: [10, 10] })
                        }));

                        const endConnector = new Feature({
                            geometry: new LineString([routeEndCoord, fromLonLat(endPoint)])
                        });
                        endConnector.setStyle(new Style({
                            stroke: new Stroke({ color: '#1A73E8', width: 4, lineDash: [10, 10] })
                        }));

                        routeSource.addFeature(startConnector);
                        routeSource.addFeature(endConnector);
                    }

                    routeSource.addFeatures(features);
                    setHasRoute(features.length > 0);

                    if (mapInstance.current) {
                        const extent = routeSource.getExtent();
                        if (extent && !extent.includes(Infinity)) {
                            mapInstance.current.getView().fit(extent, { padding: [100, 100, 100, 100], duration: 1000 });
                        }
                    }
                }
            })
            .catch(e => console.error("Lỗi tìm đường:", e));
    }, [startPoint, endPoint, algorithm]);

    // 5. EFFECT: VẼ MARKER ĐIỂM ĐI / ĐẾN
    useEffect(() => {
        const source = markerSourceRef.current;
        if (!source) return;
        source.clear();

        const iconStyle = (src) => new Style({
            image: new Icon({ anchor: [0.5, 1], src: src, scale: 0.12 })
        });

        // Chỉ vẽ ping_blue khi điểm đi KHÔNG phải vị trí hiện tại
        // (vị trí hiện tại đã được đánh dấu bằng currentnode.png)
        const isStartAtCurrentLoc = currentLocation &&
            startPoint &&
            startPoint[0] === currentLocation[0] &&
            startPoint[1] === currentLocation[1];

        if (startPoint && !isStartAtCurrentLoc) {
            const feature = new Feature({ geometry: new Point(fromLonLat(startPoint)) });
            feature.setStyle(iconStyle('/ping_blue.png'));
            source.addFeature(feature);
        }

        if (endPoint) {
            const feature = new Feature({ geometry: new Point(fromLonLat(endPoint)) });
            feature.setStyle(iconStyle('/ping_red.png'));
            source.addFeature(feature);
        }
    }, [startPoint, endPoint, currentLocation]);

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
    }, [triggerFlyTo, currentLocation]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />

            {/* UI Chọn Thuật Toán */}
            <div className="algorithm-selector-card">
                <div className="algo-info">
                    <label>Chế độ tìm đường</label>
                    <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
                        <option value="dijkstra">Dijkstra (Mặc định)</option>
                        <option value="astar">A* (A-Star)</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default MapComponent;