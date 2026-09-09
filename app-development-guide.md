# Scaffold Deck Builder - App Development Guide

This guide explicitly explains the logic, parameters, and build rules for the Scaffold Deck Builder application. A student or AI tool (like AIDE) can use this document to understand the underlying mechanics and reproduce or extend the application.

## 1. Project Structure

The app allows creating **Projects**, which consist of:
- **Site Name & Client Name**
- **Decks**: The main scaffold structures.
- **Ramps**: Sloped structures attached to decks.
- **Handrails**: Safety rails on the perimeter.

Projects can be saved locally (localStorage) or synced with **Google Drive** using Firebase Auth for identity.

## 2. Deck Parameters

Decks are the core structural element. They can be one of two types:
1. **Standard**: A flat deck grid.
2. **Raking**: A stepped/tiered deck (often used for seating or stages).

### Standard Deck Parameters:
- **Dimensions**: `width` and `depth` in meters. The app discretizes these into a 1.2m grid, preferring 2.4m x 1.2m bays where possible.
- **Origin & Orientation**: 
  - `originX`, `originZ` (meters) determine the position in 3D space.
  - `orientation` (degrees) rotates the deck around its origin.
- **Attachment**: Decks can be children of other decks.
  - `parentId`: ID of the parent deck.
  - `attachEdge`: Which side of the parent to attach to (`front`, `back`, `left`, `right`).
  - `attachOffset`: How far along that edge to attach.
- **Terrain & Elevation**:
  - `deckHeight` (meters): The target elevation of the deck platform from the datum.
  - `groundOffsets`: Four sliders (`origin`, `widthEnd`, `depthEnd`, `diagonal`) that allow bilinear interpolation of the ground under the deck. This allows the ground to slope.

### Raking Deck Parameters:
- **Tiers**: Number of stepped levels. Each tier is 1.2m deep and steps up by 0.25m.
- Inherits width, orientation, and terrain from standard parameters.

## 3. Ramp Parameters

Ramps are sloped platforms connected to the edges of a deck.
- **Attachment**: 
  - `deckId`: Which deck it connects to.
  - `side`: `top`, `bottom`, `left`, `right`.
  - `corner`: `topLeft`, `topRight`, `bottomLeft`, `bottomRight` (determines where the ramp starts on that side).
  - `offset`: Distance from the chosen corner.
- **Dimensions**: `width` and `length` (meters).
- **Landing Pads**: Ramps can have flat landing sections.
  - Defined by an `offset` (distance down the ramp) and a `length`. The rest of the ramp automatically slopes to the ground.

## 4. Handrail Parameters

Handrails secure the perimeter. They can be auto-generated or manually specified.
- **Attachment**: Similar to ramps (`side`, `corner`, `offset`, `length`).
- Handrails spawn `Upright` posts (Left, Right, Double, Corner types) and the railing itself.

## 5. Build Rules & Materials

The app calculates the structural scaffold needed to support the decks.

### Standard Scaffold Dimensions & Grid
- The base grid is **1.2m x 1.2m**.
- A full rostrum deck board is typically **2.4m wide x 1.2m deep**.
- A half rostrum is **1.2m x 1.2m**.
- Deck Thickness: 50mm. Sole Board Thickness: 38mm.

### Leg Assemblies (Feet)
Each intersection on the grid requires a vertical leg (foot) extending to the ground.
- **Basejacks**: Adjustable from the bottom. Available types: 600mm, 800mm. Target runout (extension) is kept between **100mm and 400mm**.
- **Pipes**: Fit into the basejack. (e.g., 0mm, 200mm, 400mm, 600mm).
- **Standards (Verticals)**: Stacked on top. Available heights (mm): 3000, 2500, 2000, 1750, 1500, 1250, 1000, 750, 500.
- **V-Pressings**: Connection points on the standards for ledgers. They start 250mm from the bottom of the standard and are spaced exactly 500mm apart.
- **Solver Logic**: The app calculates the required height (`deckHeight - groundElevation - deckThickness - soleThickness`) and finds the optimal combination of jack + pipe + standards to reach it.

### Ledgers (Horizontals)
Ledgers connect the verticals to keep the structure rigid. They attach at the V-pressings.
- The solver finds common V-pressing elevations between adjacent feet.
- Ledgers are placed every ~2m vertically, always including a kicker at the bottom.
- **Colors/Types**: 
  - `blueBlue` (Horizontal in half-rows, vertical in standard rows). Color: Blue.
  - `blueBlack` (Vertical in half-rows, horizontal in standard rows). Color: Green.
  - `blackBlack` (Outer edges). Color: Black.

### Bracing
Diagonal braces ensure stability.
- **Color**: Yellow.
- Placed on the **outer perimeter** of the deck structure (front, back, left, right faces).
- Cross bracing is automatically added to ramps taller than 0.75m.

## 6. Calculation Flow

When the app runs the calculation (`calculateDecks` in `deckLogic.ts`):
1. **Resolve Transforms**: It calculates global coordinates for all child decks based on their parent's position, edge, and offset.
2. **Generate Grid**: It lays out the rostrums (deck surfaces) covering the deck area, maximizing 2.4m x 1.2m segments.
3. **Terrain Sampling**: It calculates the exact ground elevation at every foot coordinate using bilinear interpolation of the `groundOffsets`.
4. **Leg Solving**: For each foot, it runs the leg assembly solver to find the standard/pipe/jack combo. If the height is too low (< 150mm), it throws an error.
5. **Ledger Matching**: It checks adjacent feet, looks at their V-pressing heights, and spans ledgers across matching elevations.
6. **Bracing**: It adds diagonal braces to the outermost bays.
7. **Ramps & Handrails**: Generates sloped rostrums and places handrail uprights along the edges.

## 7. 3D Visualization
The results are rendered using **React Three Fiber (R3F)**.
- The terrain is a dynamic plane mesh deformed by the ground offsets.
- Feet, ledgers, standards, and deck boards are rendered as colored meshes based on the engineering data.
- The user can toggle layers (Terrain, Structure, Decking).

## Summary
To build or extend this app, you must respect the physical constraints of the scaffolding system (specific standard sizes, v-pressing heights, 1.2m grid) while managing state in React and rendering the output data array into a 3D scene.
