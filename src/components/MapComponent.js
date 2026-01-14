import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, TileWMS, Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon } from 'ol/style'; // Chỉ cần Style và Icon là đủ
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { ScaleLine, defaults as defaultControls } from 'ol/control';

const MapComponent = ({ mapType, selectingMode, startPoint, endPoint, onMapClick, onStoreClick, stores }) => {
const mapRef = useRef();
const mapInstance = useRef(null);
const markerSourceRef = useRef(new VectorSource());
const roadsLayerRef = useRef(null);
const boundaryLayerRef = useRef(null);
const storeSourceRef = useRef(new VectorSource());


// import redIcon from '../assets/location-red.png';

  // 1. KHỞI TẠO MAP
  useEffect(() => {
    const canThoCenter = fromLonLat([105.76807802869124, 10.0297147053352]); 
    const extentLonLat = [105.67173723242153, 9.967970149681003, 105.86976424563423, 10.070899042324102]; 
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

    // Layer Marker
    const markerLayer = new VectorLayer({
        source: markerSourceRef.current,
        zIndex: 999,
    });

    const storeLayer = new VectorLayer({
      source: storeSourceRef.current,
      zIndex: 500, // Nằm trên bản đồ nền nhưng dưới Marker chọn điểm (999)
    });

    const map = new Map({
        target: mapRef.current,
        controls: defaultControls({ zoom: false }).extend([new ScaleLine()]),
        layers: [standardBase, satelliteBase, roadsLayer, boundaryLayer, markerLayer, storeLayer,],
        view: new View({
            center: canThoCenter, zoom: 13, extent: mapExtent, minZoom: 10, maxZoom: 18,
        }),
    });

    mapInstance.current = map;
    return () => map.setTarget(null);
  }, []); 

  // 2. EFFECT RIÊNG ĐỂ XỬ LÝ CLICK
  useEffect(() => {
      if (!mapInstance.current) return;

      const handleMapClickInternal = (evt) => {
          // Kiểm tra xem có click trúng Feature nào không
          const feature = mapInstance.current.forEachFeatureAtPixel(evt.pixel, (feat) => feat);

          if (feature) {
              const properties = feature.getProperties();
              // Kiểm tra nếu feature này là cửa hàng (có id và type)
              // (Loại trừ trường hợp click trúng StartPoint/EndPoint nếu cần)
              if (properties.id && onStoreClick) {
                  onStoreClick(properties); // Gọi hàm callback để mở Modal
                  return; // Dừng lại, không gọi onMapClick (tránh đặt điểm đi/đến nhầm chỗ)
              }
          }

          // Nếu không click trúng cửa hàng nào thì mới gọi logic chọn điểm
          if (onMapClick) {
              const lonLat = toLonLat(evt.coordinate);
              onMapClick(lonLat);
          }
      };

      mapInstance.current.on('click', handleMapClickInternal);

      return () => {
          mapInstance.current.un('click', handleMapClickInternal);
      };
  }, [onMapClick, onStoreClick]);


  // 3. EFFECT VẼ MARKER (Đã xóa fallbackStyle gây lỗi)
  useEffect(() => {
    const source = markerSourceRef.current;
    if (!source) return;
    source.clear();

    // Hàm tạo Style Icon đơn giản
    const iconStyle_blue = (src, color) => new Style({
        image: new Icon({ 
            anchor: [0.5, 1], 
            src: src, 
            scale: 0.12, 
            // color: color // Lưu ý: color chỉ hoạt động nếu ảnh là transparent/white
        })
    });

    const iconStyle_red = (src, color) => new Style({
        image: new Icon({ 
            anchor: [0.5, 1], 
            src: src, 
            scale: 0.09, 
            // color: color // Lưu ý: color chỉ hoạt động nếu ảnh là transparent/white
        })
    });

    // Vẽ Start Point (Xanh)
    if (startPoint) {
      const feature = new Feature(new Point(fromLonLat(startPoint)));
      feature.setStyle(iconStyle_blue('ping_blue.png'));
      source.addFeature(feature);
    }

    // Vẽ End Point (Đỏ)
    if (endPoint) {
      const feature = new Feature(new Point(fromLonLat(endPoint)));
      feature.setStyle(iconStyle_red('ping_red.png'));
      source.addFeature(feature);
    }
  }, [startPoint, endPoint]);

  // 4. Cursor effect
  useEffect(() => {
      if (!mapRef.current) return;
      mapRef.current.style.cursor = selectingMode ? 'crosshair' : 'default';
  }, [selectingMode]);

  // Đổi MapType
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

    // HÀM LẤY ICON AN TOÀN (Luôn trả về string, không bao giờ undefined)
    const getIconSrc = (type) => {
      // 1. Định nghĩa ảnh mặc định (Dùng khi không tìm thấy loại phù hợp)
      const DEFAULT_ICON = 'https://cdn-icons-png.flaticon.com/512/684/684908.png';

      if (!type) return DEFAULT_ICON;

      // Chuyển type về chuỗi để so sánh cho dễ (vì có thể backend trả về ID số 1, 2...)
      const typeStr = String(type).toLowerCase();

      // Logic map icon (Sửa lại logic này khớp với ID hoặc Slug của Category bên Backend bạn)
      // Ví dụ: Nếu ID danh mục Cafe là 1, Nhà hàng là 2...
      if (typeStr === '1' || typeStr.includes('cafe')) {
          return 'https://cdn-icons-png.flaticon.com/512/924/924514.png'; // Cafe
      }
      if (typeStr === '2' || typeStr.includes('nha-hang') || typeStr.includes('food')) {
          return 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png'; // Nhà hàng
      }
      if (typeStr === '3' || typeStr.includes('hotel')) {
          return 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'; // Khách sạn
      }
      
      // Nếu không khớp cái nào -> Trả về mặc định
      return DEFAULT_ICON;
    };

    stores.forEach(store => {
      // Kiểm tra tọa độ an toàn
      if (!store.lng || !store.lat) return;

      const feature = new Feature({
        geometry: new Point(fromLonLat([store.lng, store.lat])),
        ...store 
      });

      // Lấy src ảnh và đảm bảo nó tồn tại
      const iconSrc = getIconSrc(store.type);

      feature.setStyle(new Style({
        image: new Icon({
          src: iconSrc, // OpenLayers bắt buộc chỗ này không được null
          scale: 0.06, 
          anchor: [0.5, 1]
        })
      }));

      source.addFeature(feature);
    });

  }, [stores]);

  return <div ref={mapRef} style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />;
};

export default MapComponent;