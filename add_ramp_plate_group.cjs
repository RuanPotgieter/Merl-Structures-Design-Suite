const fs = require('fs');
let content = fs.readFileSync('components/DeckVisualizer3D.tsx', 'utf8');

// Add RampPlate to imports from '../types'
content = content.replace(/Rostrum, Foot, TerrainConfig, Ledger/g, 'Rostrum, Foot, TerrainConfig, Ledger, RampPlate');

// Add MAT_RAMP_PLATE material
content = content.replace(/const MAT_SOLE_BOARD = new THREE\.MeshStandardMaterial\({[\s\S]*?}\);/g, `const MAT_SOLE_BOARD = new THREE.MeshStandardMaterial({
  color: "#b45309",
  roughness: 0.85,
  metalness: 0.08,
});

const MAT_RAMP_PLATE = new THREE.MeshStandardMaterial({
  color: "#333333", // Dark grey/black for the 18mm board
  roughness: 0.9,
  metalness: 0.1,
});`);

// Define RampPlateGroup component right before DeckVisualizer3D definition
// Let's find DeckVisualizer3D definition: "const DeckVisualizer3D:"
const componentDef = `const RampPlateGroup: React.FC<{ rampPlates: RampPlate[] }> = ({ rampPlates }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (meshRef.current && rampPlates.length > 0) {
      rampPlates.forEach((p, i) => {
        if (i >= meshRef.current.count) return;
        _TEMP_QUAT.setFromEuler(new THREE.Euler(0, -p.rotation, 0));
        _TEMP_MATRIX.compose(
          new THREE.Vector3(p.position.x, p.position.z + 0.009, p.position.y), // y is depth (Z in 3D), z is elev (Y in 3D). Elevates by half thickness (9mm).
          _TEMP_QUAT,
          _TEMP_VECTOR.set(p.width, 0.018, p.depth) // 18mm thickness
        );
        meshRef.current.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [rampPlates]);

  if (!rampPlates || rampPlates.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[BOX_GEO, MAT_RAMP_PLATE, rampPlates.length]} castShadow receiveShadow />
  );
};

const DeckVisualizer3D`;

content = content.replace(/const DeckVisualizer3D/g, componentDef);

// Add rampPlates to DeckVisualizer3D rendering
// <RostrumGroup rostrums={result.rostrums} terrain={result.terrain} />
content = content.replace(/<RostrumGroup rostrums={result\.rostrums} terrain={result\.terrain} \/>/g, `<RostrumGroup rostrums={result.rostrums} terrain={result.terrain} />
              {result.rampPlates && <RampPlateGroup rampPlates={result.rampPlates} />}`);


fs.writeFileSync('components/DeckVisualizer3D.tsx', content);
