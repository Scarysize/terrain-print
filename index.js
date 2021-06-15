import ndarray from 'ndarray';
import calcDistance from '@turf/distance';
import * as terrain from './terrain-rendering';
import * as mapboxgl from 'mapbox-gl';
import {accessToken} from './token.json';

mapboxgl.accessToken = accessToken;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/scarysize/cjo080wcka44k2rumgk2a3oz0',
  pitch: 0,
  bearing: 0,
  minPitch: 0,
  maxPitch: 0,
  center: {
    lat: 28.826691274346643,
    lng: 83.77246821511187,
  },
  zoom: 11.221280985035367,
});

map.on('load', () => {
  console.log('loaded visible map');
  const offscreenMap = new mapboxgl.Map({
    container: 'offscreen-map',
    preserveDrawingBuffer: true,
    style: {
      version: 8,
      name: 'raster-dem',
      sources: {
        terrain: {
          type: 'raster',
          tiles: [
            `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}@2x.pngraw?access_token=${accessToken}`,
          ],
        },
      },
      layers: [
        {
          id: 'terrain',
          source: 'terrain',
          type: 'raster',
          paint: {'raster-resampling': 'nearest'},
        },
      ],
    },
    center: map.getCenter(),
    zoom: map.getZoom(),
  });

  offscreenMap.on('load', () => {
    console.log('loaded offscreen map');
    map.on('move', () => {
      offscreenMap.setCenter(map.getCenter());
      offscreenMap.setZoom(map.getZoom());
    });

    const {width, height} = offscreenMap.getCanvas().getBoundingClientRect();
    const canvas = offscreenMap.getCanvas();
    const gl = canvas.getContext('webgl');
    const bufferWidth = gl.drawingBufferWidth;
    const bufferHeight = gl.drawingBufferHeight;
    console.log(
      `offscreenmap buffer: ${bufferWidth}x${bufferHeight}\noffscreenmap dom: ${width}x${height}`
    );
    const pixelDistance = Math.sqrt(bufferWidth ** 2 + bufferHeight ** 2);

    const terrain3d = terrain.initPlane(bufferWidth, bufferHeight);
    const positionsView = terrain3d.positions();

    offscreenMap.on('idle', () => {
      console.log('idle');
      applyHeightMap();
    });

    document.querySelector('#export-button').addEventListener('click', () => {
      const stlBinary = terrain3d.export();
      const blob = new Blob([stlBinary], {type: 'model/x.stl-binary'});
      const url = URL.createObjectURL(blob);
      const $a = document.createElement('a');
      $a.style.display = 'none';
      $a.href = url;
      $a.download = 'terrain.stl';

      document.body.appendChild($a);
      $a.click();

      URL.revokeObjectURL(url);
    });

    const $exaggeration = document.querySelector(
      '.controls input[type="range"]'
    );
    $exaggeration.addEventListener('input', () => applyHeightMap());

    function getExaggeration() {
      return Number($exaggeration.value);
    }

    const pixels = new Uint8Array(bufferWidth * bufferHeight * 4);

    function applyHeightMap() {
      const bounds = offscreenMap.getBounds().toArray();
      const meterDistance = calcDistance(bounds[0], bounds[1], {
        units: 'meters',
      });
      const meterToPixelsRatio = pixelDistance / meterDistance;

      const exaggeration = getExaggeration();

      gl.readPixels(
        0,
        0,
        bufferWidth,
        bufferHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );
      const pixelView = ndarray(
        pixels,
        [bufferWidth, bufferHeight, 4],
        [4, 4 * bufferWidth, 1]
      );

      let min = Infinity;
      for (let y = 0; y < bufferHeight; y++) {
        for (let x = 0; x < bufferWidth; x++) {
          const R = pixelView.get(x, y, 0);
          const G = pixelView.get(x, y, 1);
          const B = pixelView.get(x, y, 2);

          const heightMeters =
            -10000 + (R * 256 * 256 + G * 256 + B) * 0.1 * exaggeration;
          const heightUnits = heightMeters * meterToPixelsRatio;

          min = Math.min(heightUnits, min);
          positionsView.set(x, bufferHeight - (y + 1), 2, heightUnits);
        }
      }

      // fix the mesh's lowest point to 0 on the x-y-plane
      terrain3d.translateZ(-min);

      terrain3d.prepareUpdate();
    }

    function animate() {
      terrain.render();
      requestAnimationFrame(animate);
    }

    animate();
  });
});
