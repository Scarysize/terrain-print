import ndarray from 'ndarray';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {SceneUtils} from 'three/examples/jsm/utils/SceneUtils';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';
import './debug';
import {STLExporter} from './stl-export';

const {width, height} = document
  .querySelector('#preview canvas')
  .getBoundingClientRect();

// Three JS setup
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#preview canvas'),
});
renderer.setSize(width, height);

const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(13, -1385.3040589841394, 1088.902211964759);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x444444);

const axesHelper = new THREE.AxesHelper(125);
scene.add(axesHelper);

export function initPlane(width, height) {
  // Mesh
  const geometry = new THREE.PlaneGeometry(
    width,
    height,
    width - 1,
    height - 1
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0x00afaf,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x707070);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-500, 500, 500);
  dirLight.shadow.mapSize.width = 256;
  dirLight.shadow.mapSize.height = 256;
  const d = 1500;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.far = 1000;
  scene.add(dirLight);

  return {
    positions: () => {
      return ndarray(
        geometry.attributes.position.array,
        [width, height, 3],
        [3, 3 * width, 1]
      );
    },
    prepareUpdate: () => {
      console.log('preparing update');
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    },
    translateZ: distance => {
      // FIXME: This is very expensive
      geometry.translate(0, 0, distance);
    },
    export: () => {
      const exporter = new STLExporter();
      return exporter.parse(scene, {binary: true});
    },
  };
}

export function render() {
  renderer.render(scene, camera);
  controls.update();
}
