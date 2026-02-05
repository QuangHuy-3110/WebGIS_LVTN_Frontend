import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, TileWMS, Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon, Stroke } from 'ol/style'; 
import GeoJSON from 'ol/format/GeoJSON';         
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { ScaleLine, defaults as defaultControls } from 'ol/control';

const MapComponent = ({ mapType, selectingMode, startPoint, endPoint, onMapClick, onStoreClick, stores }) => {
  const mapRef = useRef();
  const mapInstance = useRef(null);
  const [algorithm, setAlgorithm] = useState('dijkstra');

  // Các Source dữ liệu
  const markerSourceRef = useRef(new VectorSource());
  const routeSourceRef = useRef(new VectorSource()); 
  const storeSourceRef = useRef(new VectorSource());
  
  const roadsLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);

  // Style cho đường đi
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
    const extentLonLat = [105.6717, 9.9679, 105.8697, 10.0708]; 
    const mapExtent = transformExtent(extentLonLat, 'EPSG:4326', 'EPSG:3857');

    const standardBase = new TileLayer({
        source: new XYZ({ url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' }),
        visible: true, properties: { name: 'standard' }
    });
    const satelliteBase = new TileLayer({
        source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 }),
        visible: false, properties: { name: 'satellite' }
    });

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

    const routeLayer = new VectorLayer({ source: routeSourceRef.current, zIndex: 998, style: routeStyleFunction });
    const markerLayer = new VectorLayer({ source: markerSourceRef.current, zIndex: 999 });
    const storeLayer = new VectorLayer({ source: storeSourceRef.current, zIndex: 500 });

    const map = new Map({
        target: mapRef.current,
        controls: defaultControls({ zoom: false }).extend([new ScaleLine()]),
        layers: [standardBase, satelliteBase, roadsLayer, boundaryLayer, routeLayer, markerLayer, storeLayer],
        view: new View({ center: canThoCenter, zoom: 13, extent: mapExtent, minZoom: 10, maxZoom: 18 }),
    });

    mapInstance.current = map;
    return () => map.setTarget(null);
  }, []); 

  // 2. EFFECT: XỬ LÝ STORE & ICON (QUAN TRỌNG NHẤT)
  useEffect(() => {
    const source = storeSourceRef.current;
    if (!source) return;
    source.clear();

    if (!stores || stores.length === 0) {
        console.log("⚠️ Không có dữ liệu stores để vẽ.");
        return;
    }

    // --- HÀM LẤY ICON ---
    const getIconSrc = (props) => {
        // 1. Kiểm tra Icon từ Server
        if (props.category_detail && props.category_detail.icon) {
            return props.category_detail.icon;
        }
        // 2. Fallback
        return 'https://cdn-icons-png.flaticon.com/512/684/684908.png'; // Chấm đỏ
    };

    console.log(`📍 Đang vẽ ${stores.length} cửa hàng...`);

    stores.forEach((store, index) => {
        // --- LOGIC BÓC TÁCH DỮ LIỆU ---
        // Nếu là GeoJSON, dữ liệu nằm trong 'properties'. Nếu là JSON thường, nó nằm ngay ngoài.
        const props = store.properties || store; 

        // --- SOI LỖI (DEBUG LOG) ---
        // Chỉ in log của cửa hàng đầu tiên để kiểm tra cấu trúc
        if (index === 0) {
            console.log("🔥 [DEBUG] Cửa hàng đầu tiên (Raw):", store);
            console.log("🔥 [DEBUG] Props sau khi bóc tách:", props);
            console.log("🔥 [DEBUG] Category Detail:", props.category_detail);
            console.log("🔥 [DEBUG] Link Icon tìm được:", props.category_detail?.icon);
        }

        // --- XỬ LÝ TỌA ĐỘ ---
        let lng, lat;
        if (store.geometry && store.geometry.coordinates) { // GeoJSON
            lng = store.geometry.coordinates[0];
            lat = store.geometry.coordinates[1];
        } else { // JSON thường
            lng = store.lng;
            lat = store.lat;
        }

        if (!lng || !lat) return;

        const feature = new Feature({
            geometry: new Point(fromLonLat([lng, lat])),
            ...props 
        });

        // Lấy link icon
        const iconSrc = getIconSrc(props);

        feature.setStyle(new Style({
            image: new Icon({ 
                src: iconSrc, 
                scale: 0.15, 
                anchor: [0.5, 1],
                crossOrigin: 'anonymous', 
            })
        }));
        source.addFeature(feature);
    });
  }, [stores]); // Chạy lại khi stores thay đổi

  // 3. EFFECT: ROUTING & MARKER
  useEffect(() => {
    // ... (Giữ nguyên logic vẽ đường đi và marker điểm đi/đến)
    const routeSource = routeSourceRef.current;
    if (routeSource && startPoint && endPoint) {
         // ... (Logic gọi API route giữ nguyên như file cũ của bạn)
         const url = `http://127.0.0.1:8000/api/route/?start_lat=${startPoint[1]}&start_lng=${startPoint[0]}&end_lat=${endPoint[1]}&end_lng=${endPoint[0]}&algo=${algorithm}`;
         fetch(url)
            .then(res => res.json())
            .then(data => {
                routeSource.clear();
                if (data && data.features) {
                    const features = new GeoJSON().readFeatures(data, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                    routeSource.addFeatures(features);
                }
            })
            .catch(e => console.error(e));
    } else if (routeSource) {
        routeSource.clear();
    }
  }, [startPoint, endPoint, algorithm]);

  useEffect(() => {
    // Vẽ Marker điểm đi/đến (Ping đỏ/xanh)
    const source = markerSourceRef.current;
    if (!source) return;
    source.clear();
    const iconStyle = (src) => new Style({ image: new Icon({ anchor: [0.5, 1], src: src, scale: 0.12 }) });
    if (startPoint) source.addFeature(new Feature({ geometry: new Point(fromLonLat(startPoint)) })).setStyle(iconStyle('/ping_red.png'));
    if (endPoint) source.addFeature(new Feature({ geometry: new Point(fromLonLat(endPoint)) })).setStyle(iconStyle('/ping_blue.png'));
  }, [startPoint, endPoint]);

  // Các Effect khác (Map Click, Style Change) giữ nguyên
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

  useEffect(() => { if (mapRef.current) mapRef.current.style.cursor = selectingMode ? 'crosshair' : 'default'; }, [selectingMode]);

  useEffect(() => {
      // Logic đổi style bản đồ (Standard/Satellite) giữ nguyên
      if (!mapInstance.current) return;
      const layers = mapInstance.current.getLayers().getArray();
      layers.forEach(layer => {
          if (layer.get('name') === 'standard') layer.setVisible(mapType === 'standard');
          if (layer.get('name') === 'satellite') layer.setVisible(mapType === 'satellite');
      });
      // Update WMS params...
  }, [mapType]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />
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