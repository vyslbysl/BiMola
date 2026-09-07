# Higgsfield environment pass

Implemented on 2026-09-07 in the existing MOLA Three.js game.

Art direction: sunlit residential interiors, ivory plaster, sage door reveals, warm oak, terracotta floors, oatmeal linen, soft daylight and warm room fill. Existing five-room layout and gameplay are retained.

## Generation provenance

Higgsfield returned `nano_banana_2` for these completed jobs:

- Environment reference: `2aef5c61-7e6a-4222-ac54-bcc0231d5116` → higgsfield-room-reference.png
- Oak albedo: `6af85ae7-c682-47f0-b87a-565e9d8bbdd2`
- Terracotta albedo: `f80966df-7db0-4d81-a1f3-7c7fdda1d31d`
- Linen albedo: `d9038c15-e494-4162-964f-fb347bfa4c3d`

Original texture PNGs are archived in texture-originals/. Runtime uses optimized 1024px JPEG copies in public/assets/higgsfield/ (about 1.2 MB combined). Materials apply to actual geometry and are shared by objects and disguises. They are albedo images, not a generated 3D scene or complete PBR map set. Existing procedural bump maps remain in use.

The reference is visual direction, not a screenshot of the running game. The real-time scene still uses procedural geometry; it does not reproduce the reference's photographic fidelity.

Pre-edit visual files are saved in before-higgsfield/. No changes to game rules, server protocol, world footprints or room settings were made.
