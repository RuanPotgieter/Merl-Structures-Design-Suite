const fs = require('fs');
let content = fs.readFileSync('components/DeckVisualizer3D.tsx', 'utf8');

// Update TerrainMesh signature to receive rostrums
content = content.replace(/const TerrainMesh: React\.FC<\{ terrain: TerrainConfig, dimensions: any \}> = \(\{ terrain, dimensions \}\) => \{/, 'const TerrainMesh: React.FC<{ terrain: TerrainConfig, dimensions: any, rostrums: any[] }> = ({ terrain, dimensions, rostrums }) => {');

// Update geometry computation
const oldGeoLogic = `const groundY = getGroundYAt(x, worldZ, terrain, dimensions.width, dimensions.depth);
      pos.setZ(i, groundY);`;

const newGeoLogic = `let groundY = getGroundYAt(x, worldZ, terrain, dimensions.width, dimensions.depth);
      
      // Prevent ground from protruding through the deck surface
      // Find if this vertex is under a rostrum
      let minDeckElev = Infinity;
      for (const r of rostrums) {
        // Expand the bounds slightly to ensure we catch edges
        const buffer = 0.5;
        const minX = Math.min(r.topLeft.x, r.bottomRight.x) - buffer;
        const maxX = Math.max(r.topLeft.x, r.bottomRight.x) + buffer;
        const minY = Math.min(r.topLeft.y, r.bottomRight.y) - buffer;
        const maxY = Math.max(r.topLeft.y, r.bottomRight.y) + buffer;
        
        if (x >= minX && x <= maxX && worldZ >= minY && worldZ <= maxY) {
           // Simple approximation: just take the lowest elevation of this rostrum
           const rMinElev = Math.min(r.startElevation ?? Infinity, r.endElevation ?? Infinity);
           if (rMinElev < minDeckElev) {
              minDeckElev = rMinElev;
           }
        }
      }
      
      if (minDeckElev !== Infinity) {
         // Cap the ground to be at least 150mm below the deck surface to prevent clipping
         if (groundY > minDeckElev - 0.15) {
            groundY = minDeckElev - 0.15;
         }
      }

      pos.setZ(i, groundY);`;

content = content.replace(oldGeoLogic, newGeoLogic);

// Update <TerrainMesh ... />
content = content.replace(/<TerrainMesh terrain=\{result\.terrain\} dimensions=\{result\.dimensions\} \/>/g, '<TerrainMesh terrain={result.terrain} dimensions={result.dimensions} rostrums={result.rostrums} />');

fs.writeFileSync('components/DeckVisualizer3D.tsx', content);
console.log("Updated TerrainMesh");
