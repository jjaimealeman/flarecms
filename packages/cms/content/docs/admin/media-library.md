---
title: Media Library
slug: media-library
excerpt: Upload, browse, and manage media files stored in Cloudflare R2.
section: admin
order: 4
status: published
---

## Overview

The Media Library manages all uploaded files -- images, documents, videos, and audio. Files are stored in Cloudflare R2 (S3-compatible object storage) and served through your custom media domain or R2 public URL.

Navigate to **Admin > Media** to access the library.

## Browsing Files

The media library shows your files in a grid view by default. Each file card shows:

- Thumbnail preview (for images)
- File icon (for documents, videos, audio)
- Filename
- File size
- Upload date

### Filtering

Use the filters at the top to narrow down files:

| Filter | Options |
|--------|---------|
| **Folder** | All, or specific virtual folders |
| **Type** | All, Images, Documents, Videos |
| **View** | Grid or List |

### Pagination

Files are loaded 24 at a time. Use the pagination controls at the bottom to navigate through larger libraries.

## Uploading Files

### Single Upload

1. Click the **Upload** button
2. Select a file from your computer
3. Optionally choose a virtual folder
4. The file uploads to R2 and appears in the grid

### Supported File Types

| Category | Formats | Max Size |
|----------|---------|----------|
| **Images** | JPEG, PNG, GIF, WebP, SVG | 50 MB |
| **Documents** | PDF, TXT, DOC, DOCX | 50 MB |
| **Videos** | MP4, WebM, OGG, AVI, MOV | 50 MB |
| **Audio** | MP3, WAV, OGG, M4A | 50 MB |

Files that don't match an allowed MIME type will be rejected.

### Upload Flow

When you upload a file, Flare CMS:

1. Validates the file type and size
2. Generates a unique filename (UUID-based)
3. Uploads to the R2 bucket under the selected folder
4. For images: extracts dimensions from the file
5. Creates a database record with metadata
6. Returns the public URL

## Virtual Folders

Files are organized into virtual folders. These aren't real filesystem directories -- they're path prefixes in R2 (like `uploads/photo.jpg` or `blog-images/hero.jpg`).

The default folder is `uploads`. You can specify a different folder when uploading.

The sidebar shows folder statistics -- how many files are in each folder and their total size.

## File Details

Click on any file to see its details:

- **Filename** -- Original and generated names
- **URL** -- Public URL for embedding
- **MIME Type** -- File content type
- **Size** -- File size in bytes
- **Dimensions** -- Width and height (images only)
- **Uploaded by** -- User who uploaded the file
- **Upload date** -- When the file was uploaded

You can copy the file URL directly from the details panel for use in your content.

## Using Media in Content

When editing content, image fields show a file picker that connects to the media library. Click the image field to browse and select from your uploaded files.

You can also paste a media URL directly into rich text editors (Quill, TinyMCE, EasyMDE).

The public URL format depends on your configuration:

```
# Default R2 public URL
https://your-bucket.your-account.r2.cloudflarestorage.com/uploads/photo.jpg

# With custom domain (recommended)
https://images.flarecms.dev/uploads/photo.jpg
```

## Deleting Files

Click the delete button on a file card or in the file details panel. Deleted files are **soft-deleted** -- they're hidden from the library but remain in R2 storage.

> [!NOTE]
> Soft-deleted media files still consume R2 storage. To permanently remove files, you'd need to clean them up through the Wrangler CLI or the R2 dashboard.

## Storage

Media files are stored in the R2 bucket configured in your `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

R2 offers:

- No egress fees (free bandwidth)
- S3-compatible API
- Automatic global distribution
- 10 GB free tier, then $0.015/GB/month

## Tips

- **Use descriptive filenames** before uploading -- the original name is preserved in metadata
- **Optimize images** before uploading -- Flare CMS doesn't resize or compress images
- **Organize with folders** -- Use folders like `blog`, `products`, `team` to keep things tidy
- **Set up a custom domain** for media URLs -- it looks more professional and gives you CDN control
