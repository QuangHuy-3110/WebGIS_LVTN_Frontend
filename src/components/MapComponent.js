import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, TileWMS, Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon, Stroke } from 'ol/style'; // Import thêm Stroke để vẽ đường
import GeoJSON from 'ol/format/GeoJSON';         // Import GeoJSON để đọc dữ liệu đường
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { ScaleLine, defaults as defaultControls } from 'ol/control';

const MapComponent = ({ mapType, selectingMode, startPoint, endPoint, onMapClick, onStoreClick, stores }) => {
  const mapRef = useRef();
  const mapInstance = useRef(null);
  
  // Các Source dữ liệu
  const markerSourceRef = useRef(new VectorSource());
  const routeSourceRef = useRef(new VectorSource()); // Source riêng cho đường đi
  const storeSourceRef = useRef(new VectorSource());
  
  const roadsLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);

  // 1. KHỞI TẠO BẢN ĐỒ
  useEffect(() => {
    const canThoCenter = fromLonLat([105.768078, 10.029714]); 
    const extentLonLat = [105.6717, 9.9679, 105.8697, 10.0708]; 
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

    // --- LỚP ĐƯỜNG ĐI (ROUTE LAYER) ---
    const routeLayer = new VectorLayer({
        source: routeSourceRef.current,
        zIndex: 998, // Nằm dưới Marker (999) nhưng trên các lớp khác
        style: new Style({
            stroke: new Stroke({
                color: '#1A73E8', // Màu xanh Google Maps
                width: 6,         // Độ dày nét
                lineCap: 'round', // Bo tròn đầu
                lineJoin: 'round' // Bo tròn góc
            })
        })
    });

    // Lớp Marker (Điểm A, Điểm B)
    const markerLayer = new VectorLayer({
        source: markerSourceRef.current,
        zIndex: 999,
    });

    // Lớp Cửa hàng
    const storeLayer = new VectorLayer({
      source: storeSourceRef.current,
      zIndex: 500,
    });

    const map = new Map({
        target: mapRef.current,
        controls: defaultControls({ zoom: false }).extend([new ScaleLine()]),
        // Thêm routeLayer vào danh sách layer
        layers: [standardBase, satelliteBase, roadsLayer, boundaryLayer, routeLayer, markerLayer, storeLayer],
        view: new View({
            center: canThoCenter, zoom: 13, extent: mapExtent, minZoom: 10, maxZoom: 18,
        }),
    });

    mapInstance.current = map;
    return () => map.setTarget(null);
  }, []); 

  // 2. EFFECT QUAN TRỌNG: TỰ ĐỘNG VẼ ĐƯỜNG KHI CÓ 2 ĐIỂM
  useEffect(() => {
    const routeSource = routeSourceRef.current;
    if (!routeSource) return;

    // Nếu thiếu 1 trong 2 điểm -> Xóa đường cũ đi
    if (!startPoint || !endPoint) {
        routeSource.clear();
        return;
    }

    // Gọi API Backend Django (PostGIS + pgRouting)
    const url = `http://127.0.0.1:8000/api/route/?start_lat=${startPoint[1]}&start_lng=${startPoint[0]}&end_lat=${endPoint[1]}&end_lng=${endPoint[0]}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            routeSource.clear(); // Xóa đường cũ trước khi vẽ

            if (data && data.features) {
                const geojsonFormat = new GeoJSON();
                
                // Đọc dữ liệu GeoJSON trả về
                const features = geojsonFormat.readFeatures(data, {
                    dataProjection: 'EPSG:4326', // Backend trả về Kinh/Vĩ độ
                    featureProjection: 'EPSG:3857' // Map dùng Mercator
                });

                routeSource.addFeatures(features);

                // Tự động Zoom (Fit) bản đồ để thấy toàn bộ lộ trình
                if (mapInstance.current) {
                    const extent = routeSource.getExtent();
                    // Kiểm tra extent hợp lệ
                    if (extent && !extent.includes(Infinity)) {
                        mapInstance.current.getView().fit(extent, { 
                            padding: [100, 100, 100, 100], // Chừa lề 100px để không bị che
                            duration: 1000                 // Hiệu ứng zoom trong 1 giây
                        });
                    }
                }
            } else {
                console.warn("API không trả về đường đi hợp lệ.");
                // alert("Không tìm thấy đường đi!"); // Có thể bật lên nếu muốn thông báo
            }
        })
        .catch(err => console.error("Lỗi API tìm đường:", err));

  }, [startPoint, endPoint]); // Chạy lại mỗi khi startPoint hoặc endPoint thay đổi

  // 3. VẼ MARKER (ĐIỂM ĐI & ĐIỂM ĐẾN)
  useEffect(() => {
    const source = markerSourceRef.current;
    if (!source) return;
    source.clear();

    const iconStyle = (src, scale = 0.12) => new Style({
        image: new Icon({ anchor: [0.5, 1], src: src, scale: scale })
    });

    if (startPoint) {
      const feature = new Feature(new Point(fromLonLat(startPoint)));
      feature.setStyle(iconStyle('https://cdn-icons-png.flaticon.com/512/684/684908.png')); 
      source.addFeature(feature);
    }

    if (endPoint) {
      const feature = new Feature(new Point(fromLonLat(endPoint)));
      feature.setStyle(iconStyle('https://cdn-icons-png.flaticon.com/512/684/684908.png')); 
      source.addFeature(feature);
    }
  }, [startPoint, endPoint]);

  // 4. CÁC EFFECT KHÁC (Click, Icon Cửa hàng...) - Giữ nguyên
  useEffect(() => {
      if (!mapInstance.current) return;
      const handleMapClickInternal = (evt) => {
          const feature = mapInstance.current.forEachFeatureAtPixel(evt.pixel, (feat) => feat);
          if (feature && feature.getProperties().id && onStoreClick) {
              onStoreClick(feature.getProperties());
              return;
          }
          if (onMapClick) onMapClick(toLonLat(evt.coordinate));
      };
      mapInstance.current.on('click', handleMapClickInternal);
      return () => mapInstance.current.un('click', handleMapClickInternal);
  }, [onMapClick, onStoreClick]);

  useEffect(() => {
      if (!mapRef.current) return;
      mapRef.current.style.cursor = selectingMode ? 'crosshair' : 'default';
  }, [selectingMode]);

  useEffect(() => {
      if (!mapInstance.current) return;
      const layers = mapInstance.current.getLayers().getArray();
      layers.forEach(layer => {
          const name = layer.get('name');
          if (name === 'standard') layer.setVisible(mapType === 'standard');
          if (name === 'satellite') layer.setVisible(mapType === 'satellite');
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

  useEffect(() => {
    const source = storeSourceRef.current;
    if (!source) return;
    source.clear();
    const getIconSrc = (type) => {
        const t = String(type).toLowerCase();
        if (t === '1' || t.includes('cafe')) return 'https://cdn-icons-png.flaticon.com/512/924/924514.png';
        if (t === '2' || t.includes('food')) return 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png';
        if (t === '3' || t.includes('hotel')) return 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png';
        return 'https://cdn-icons-png.flaticon.com/512/684/684908.png';
    };
    stores.forEach(store => {
      if (!store.lng || !store.lat) return;
      const feature = new Feature({
        geometry: new Point(fromLonLat([store.lng, store.lat])),
        ...store 
      });
      feature.setStyle(new Style({
        image: new Icon({ src: getIconSrc(store.type), scale: 0.06, anchor: [0.5, 1] })
      }));
      source.addFeature(feature);
    });
  }, [stores]);

  return <div ref={mapRef} style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />;
};

export default MapComponent;