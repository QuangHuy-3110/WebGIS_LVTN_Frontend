import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import { fromLonLat, transformExtent } from 'ol/proj';
import { ScaleLine, defaults as defaultControls } from 'ol/control';

const MapComponent = ({ mapType }) => {
  const mapRef = useRef();
  const mapInstance = useRef(null);
  
  // Lưu tham chiếu đến các layer WMS để update params sau này
  const roadsLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);

  useEffect(() => {
    const canThoCenter = fromLonLat([105.76807802869124, 10.0297147053352]); 
    // 10.0297147053352, 105.76807802869124
    // 10.070899042324102, 105.86976424563423
    // 9.967970149681003, 105.67173723242153

    const extentLonLat = [105.67173723242153, 9.967970149681003, 105.86976424563423, 10.070899042324102]; 
    const mapExtent = transformExtent(extentLonLat, 'EPSG:4326', 'EPSG:3857');

    // --- 1. BASE LAYERS (Nền) ---
    const standardBase = new TileLayer({
      source: new XYZ({
        url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attributions: '© OpenStreetMap © CARTO',
      }),
      visible: true,
      properties: { name: 'standard' }
    });

    const satelliteBase = new TileLayer({
      source: new XYZ({
        // Sử dụng ArcGIS như bạn đã chọn
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles © Esri',
        maxZoom: 19, 
      }),
      visible: false,
      properties: { name: 'satellite' }
    });

    // --- 2. WMS LAYERS (Dữ liệu GeoServer) ---
    
    // Layer đường xá / tổng hợp
    const roadsLayer = new TileLayer({
      source: new TileWMS({
        url: 'http://localhost:8080/geoserver/cantho_map/wms',
        params: { 
          'LAYERS': 'cantho_map:planet_osm_line', 
          'TILED': true, 
          'TRANSPARENT': true,
          // Mặc định load style chuẩn trước
          'STYLES': 'cantho_map:style_duong_di' 
        },
        serverType: 'geoserver',
      }),
      zIndex: 5,
    });
    roadsLayerRef.current = roadsLayer; // Lưu lại để dùng sau

    // Layer ranh giới (Ví dụ)
    const boundaryLayer = new TileLayer({
      source: new TileWMS({
        url: 'http://localhost:8080/geoserver/cantho_map/wms',
        params: { 
          'LAYERS': 'cantho_map:ranh_gioi_can_tho', 
          'TILED': true, 
          'TRANSPARENT': true,
          'STYLES': 'style_ranh_gioi_ninh_kieu'
        },
        serverType: 'geoserver',
      }),
      zIndex: 10,
    });
    boundaryLayerRef.current = boundaryLayer;

    // --- KHOỞI TẠO MAP ---
    const map = new Map({
      target: mapRef.current,
      controls: defaultControls({ zoom: false }).extend([new ScaleLine()]),
      layers: [
        standardBase, 
        satelliteBase, 
        roadsLayer, 
        boundaryLayer
      ],
      view: new View({
        center: canThoCenter,
        zoom: 13,
        extent: mapExtent,
        minZoom: 10,
        maxZoom: 18,
      }),
    });

    mapInstance.current = map;

    return () => map.setTarget(null);
  }, []);

  // --- EFFECT XỬ LÝ CHUYỂN ĐỔI STYLE ---
  useEffect(() => {
    if (!mapInstance.current) return;

    // 1. Ẩn/Hiện lớp nền (Base Map)
    const layers = mapInstance.current.getLayers().getArray();
    layers.forEach(layer => {
      const name = layer.get('name');
      if (name === 'standard') layer.setVisible(mapType === 'standard');
      if (name === 'satellite') layer.setVisible(mapType === 'satellite');
    });

    // 2. Đổi Style cho lớp WMS (GeoServer)
    if (roadsLayerRef.current) {
      // Logic chọn tên style tương ứng trong GeoServer
      const newStyle = mapType === 'satellite' 
        ? 'cantho_map:style_ve_tinh'   // Tên style bạn đặt trong GeoServer cho vệ tinh (Màu trắng/vàng)
        : 'cantho_map:style_duong_di'; // Tên style mặc định

      // Hàm updateParams sẽ gọi lại request WMS mới với tham số STYLES mới
      roadsLayerRef.current.getSource().updateParams({ 'STYLES': newStyle });
    }

    if (boundaryLayerRef.current) {
      const newStyle = mapType === 'satellite'
        ? 'style_ranh_gioi_vetinh' // Viền trắng/đỏ tươi
        : 'style_ranh_gioi_mac_dinh'; // Viền đen/xám
      
      boundaryLayerRef.current.getSource().updateParams({ 'STYLES': newStyle });
    }

  }, [mapType]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />
  );
};

export default MapComponent;