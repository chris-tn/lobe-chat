# DxAi Logo Customization Guide

## Current Logo Setup

DxAi logo đã được cấu hình và sẵn sàng sử dụng.

### Logo Files Location

```
public/
├── logo.png                           # Main logo file (1024x1024 recommended)
├── apple-touch-icon.png               # iOS home screen icon
└── icons/
    ├── icon-192x192.png               # PWA icon 192x192
    ├── icon-192x192.maskable.png      # PWA maskable icon 192x192
    ├── icon-512x512.png               # PWA icon 512x512
    └── icon-512x512.maskable.png      # PWA maskable icon 512x512
```

### Logo Configuration

Logo URL được configure trong `packages/const/src/branding.ts`:

```typescript
export const BRANDING_LOGO_URL = '/logo.png';
```

## Logo Display Modes

DxAi logo có thể hiển thị theo nhiều modes khác nhau:

### 1. Image Only (default)
```tsx
<ProductLogo size={48} />
```
Chỉ hiển thị logo image.

### 2. Text Only
```tsx
<ProductLogo size={48} type="text" />
```
Chỉ hiển thị text "DxAi".

### 3. Combine (Image + Text)
```tsx
<ProductLogo size={48} type="combine" />
```
Hiển thị logo image + text "DxAi" bên cạnh.

### 4. With Extra Label
```tsx
<ProductLogo size={48} type="combine" extra="Discover" />
```
Hiển thị logo + text + extra label với divider.

## How to Update Logo

### Option 1: Replace Existing File

Nếu bạn có logo mới:

1. Prepare logo file (PNG format, transparent background recommended)
2. Optimal size: 1024x1024 pixels
3. Replace file:
```bash
cp your-new-logo.png public/logo.png
```

4. Update PWA icons (nếu cần different sizes):
```bash
# Generate different sizes using image tools
convert logo.png -resize 192x192 public/icons/icon-192x192.png
convert logo.png -resize 512x512 public/icons/icon-512x512.png
```

5. Restart application:
```bash
docker-compose restart lobe
```

### Option 2: Use Different File Path

Nếu muốn dùng file khác:

1. Copy logo vào `public/` folder
2. Update `packages/const/src/branding.ts`:
```typescript
export const BRANDING_LOGO_URL = '/your-logo-name.png';
```

3. Rebuild application

### Option 3: Use External URL

Nếu logo được host externally:

1. Update `packages/const/src/branding.ts`:
```typescript
export const BRANDING_LOGO_URL = 'https://cdn.yourcompany.com/logo.png';
```

2. Restart application

## Logo Best Practices

### Image Format
- **Format**: PNG with transparent background
- **Size**: 1024x1024 pixels (square)
- **File size**: < 100KB recommended for performance

### Design Considerations
- Simple, recognizable design
- Works well in both light and dark themes
- Readable at small sizes (down to 32x32)
- High contrast for accessibility

### SVG Alternative

Nếu muốn dùng SVG (better for scaling):

1. Convert your logo to SVG
2. Place in `public/logo.svg`
3. Update `BRANDING_LOGO_URL = '/logo.svg'`
4. Update `CustomImageLogo` component to handle SVG if needed

## Favicon Configuration

Favicon được generate từ logo hoặc có thể customize riêng:

### Update Favicon

1. Create favicon.ico (16x16, 32x32, 48x48 sizes)
2. Replace files:
```bash
cp your-favicon.ico public/favicon.ico
cp your-favicon-32x32.ico public/favicon-32x32.ico
```

### Generate Favicon from Logo

Có thể dùng online tools:
- https://realfavicongenerator.net/
- https://favicon.io/

## PWA Icons

PWA cần icons cho home screen:

### Required Sizes
- 192x192 (standard)
- 512x512 (standard)
- 192x192 maskable (with safe zone)
- 512x512 maskable (with safe zone)

### Maskable Icons

Maskable icons cần padding để avoid clipping:
- Safe zone: 80% center area
- Padding: 10% on each side

Example with ImageMagick:
```bash
# Add padding for maskable icons
convert logo.png -background transparent -gravity center \
  -extent 120%x120% maskable-logo.png
```

## Logo in Different Contexts

### 1. Loading Screen
Size: 48px
Location: `src/components/Loading/FullscreenLoading/index.tsx`

### 2. Share Image
Size: default (varies)
Location: `src/features/ShareModal/ShareImage/Preview.tsx`

### 3. Sidebar/Header
Size: 32-48px
Location: Various layout components

### 4. Settings/About
Size: 64px+
Location: Settings pages

## Troubleshooting

### Logo không hiển thị
1. Check file path: `public/logo.png` exists
2. Verify `BRANDING_LOGO_URL` in branding.ts
3. Clear browser cache
4. Check browser console for 404 errors
5. Restart Docker container

### Logo bị blur
1. Ensure original file is high resolution (1024x1024+)
2. Use PNG format, not JPEG
3. Check if image has transparent background

### Logo quá lớn/nhỏ
1. Adjust `size` prop in component usage
2. Check if image aspect ratio is square
3. Verify image doesn't have extra whitespace

### Dark theme issues
1. Ensure logo works on both light/dark backgrounds
2. Use transparent background
3. Consider adding border/shadow if needed

## Advanced Customization

### Custom Logo Component

Nếu cần custom logic cho logo display:

Edit `src/components/Branding/ProductLogo/Custom.tsx`:

```typescript
const CustomImageLogo = memo<Omit<ImageProps, 'alt' | 'src'> & { size: number }>(
  ({ size, ...rest }) => {
    return (
      <Image
        alt={BRANDING_NAME}
        height={size}
        src={BRANDING_LOGO_URL}
        width={size}
        unoptimized={true}
        {...rest}
      />
    );
  },
);
```

### Logo Animation

Add animation to logo (optional):

```typescript
const CustomImageLogo = memo<Omit<ImageProps, 'alt' | 'src'> & { size: number }>(
  ({ size, style, ...rest }) => {
    return (
      <Image
        alt={BRANDING_NAME}
        height={size}
        src={BRANDING_LOGO_URL}
        width={size}
        style={{
          ...style,
          transition: 'transform 0.3s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      />
    );
  },
);
```

## Checklist

After updating logo:

- [ ] Logo hiển thị đúng trong loading screen
- [ ] Logo hiển thị đúng trong sidebar
- [ ] Logo hiển thị đúng trong share image
- [ ] PWA icons hoạt động trên mobile
- [ ] Favicon hiển thị đúng trong browser tab
- [ ] Logo rõ nét ở mọi kích thước
- [ ] Logo hoạt động tốt với dark theme
- [ ] Apple touch icon hoạt động trên iOS

## References

- Custom Logo Component: `src/components/Branding/ProductLogo/Custom.tsx`
- Branding Config: `packages/const/src/branding.ts`
- Manifest Config: `src/app/manifest.ts`
- Public Assets: `public/` folder

