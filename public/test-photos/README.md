# Test Photos Directory

This directory contains placeholder structure for test photos used in the UDS-POS system.

## Directory Structure

```
test-photos/
├── before/          # Photos taken before repair/installation
├── after/           # Photos taken after repair/installation
├── parts/           # Photos of replaced/installed parts
├── signatures/      # Customer signature images
└── installations/   # Installation site photos
```

## Photo Types in Database

The `photos` table uses the following `photo_type` values:
- `before` - Device/site condition before work
- `after` - Device/site condition after work
- `signature` - Customer signature for work completion
- `installation` - Installation site documentation
- `device` - Device condition photos
- `issue` - Issue documentation photos
- `parts` - Replaced parts documentation

## Sample Photo URLs

Test data references these placeholder paths:
- `/test-photos/before/sample_before_TKT2024024.jpg`
- `/test-photos/after/sample_after_TKT2024024.jpg`
- `/test-photos/signatures/signature_TKT2024024.png`

## Adding Real Test Images

To add actual test images:

1. Add sample images to the appropriate subdirectories
2. Use standard web formats: JPG, PNG, WebP
3. Recommended sizes:
   - Photos: 1280x960 or smaller
   - Signatures: 400x200 PNG with transparency

## Supabase Storage

In production, photos are stored in Supabase Storage buckets:
- Bucket: `call-photos`
- Path pattern: `photos/calls/{call_id}/{photo_type}.jpg`

For local development, the public/test-photos folder serves as a placeholder.
