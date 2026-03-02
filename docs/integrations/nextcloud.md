# Nextcloud Integration

Tích hợp Nextcloud cho phép đồng bộ file từ Nextcloud shared folder vào Knowledge Base.

## Tính năng

- **Periodic Sync**: Tự động đồng bộ file định kỳ (mặc định mỗi giờ)
- **Manual Sync**: Có thể trigger sync thủ công bất cứ lúc nào
- **Change Detection**: Tự động phát hiện file mới, đã thay đổi, hoặc đã xóa
- **File Processing**: File được xử lý giống như upload thủ công (parse, chunk, embed)

## Cài đặt

### 1. Cài đặt package dependency

```bash
pnpm add webdav
```

### 2. Environment Variables (Optional)

Thêm vào `.env` để bảo mật cron endpoint:

```
INTEGRATION_SYNC_SECRET=your-secret-token-here
```

### 3. Database Migration

Migration đã được tạo tự động. Chạy migration:

```bash
bun run db:migrate
```

## Sử dụng

### Tạo Integration

1. Truy cập `/knowledge/integrations`
2. Click "新建集成" (Create Integration)
3. Điền thông tin:
   - **Knowledge Base**: Chọn KB muốn sync vào
   - **Name**: Tên integration
   - **Nextcloud URL**: URL của Nextcloud server (ví dụ: `https://nextcloud.example.com`)
   - **Username**: Tên người dùng Nextcloud
   - **Password**: Mật khẩu Nextcloud
   - **Folder Path**: Đường dẫn đến shared folder (ví dụ: `/shared-folder`)
   - **Sync Enabled**: Bật/tắt auto sync
   - **Sync Interval**: Khoảng thời gian sync (giây, mặc định 3600 = 1 giờ)

### Sync Manual

- Click nút "Sync now" trên integration item
- Hoặc click "View sync status" để xem chi tiết và trigger sync

### Xem Sync Status

Click "View sync status" trên integration item để xem:
- Trạng thái sync gần nhất
- Số file đã thêm/cập nhật/xóa/bỏ qua
- Lịch sử sync
- Logs chi tiết

## Periodic Sync

Để bật periodic sync tự động, cần setup cron job hoặc scheduled task gọi endpoint:

```
GET /api/cron/sync-integrations?secret=YOUR_SECRET_TOKEN
```

### Với Cron

Thêm vào crontab (chạy mỗi giờ):

```bash
0 * * * * curl -X GET "https://your-domain.com/api/cron/sync-integrations?secret=YOUR_SECRET_TOKEN"
```

### Với Vercel Cron

Thêm vào `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-integrations?secret=YOUR_SECRET_TOKEN",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Cấu trúc Database

### Tables

- `integrations`: Lưu thông tin integration
- `integration_syncs`: Lưu lịch sử sync jobs
- `integration_file_mappings`: Map file từ Nextcloud với file trong KB

## API Endpoints

### tRPC Endpoints

- `integration.create`: Tạo integration mới
- `integration.list`: Lấy danh sách integrations
- `integration.getById`: Lấy integration theo ID
- `integration.update`: Cập nhật integration
- `integration.delete`: Xóa integration
- `integration.testConnection`: Test kết nối Nextcloud
- `integration.sync`: Trigger sync manual
- `integration.getSyncStatus`: Lấy sync status và history

### REST Endpoints

- `GET /api/cron/sync-integrations`: Cron endpoint cho periodic sync

## Lưu ý

1. **Credentials**: Credentials được lưu plain text trong database (theo yêu cầu)
2. **File Processing**: File từ Nextcloud được xử lý giống như upload thủ công
3. **Sync Logic**: 
   - So sánh file dựa trên size, modified time, và ETag
   - File mới/changed sẽ được download và process
   - File đã xóa trong Nextcloud sẽ bị xóa khỏi KB
4. **Performance**: Sync có thể mất thời gian với nhiều file lớn




