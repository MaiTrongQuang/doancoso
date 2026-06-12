# Cafe POS QR Order

Website POS cho quán cà phê có QR Order tại bàn. Khách quét mã QR để gọi món, bếp nhận đơn theo thời gian thực, thu ngân thanh toán theo phiên bàn và admin quản lý dữ liệu vận hành.

## Công nghệ

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM 6.x
- Supabase PostgreSQL
- bcrypt
- JWT httpOnly cookie

Không dùng MySQL. Không dùng Supabase Auth.

## Nhóm người dùng

- `CUSTOMER`: Không cần đăng nhập, quét QR tại bàn, xem menu, thêm món vào giỏ và gửi đơn.
- `STAFF`: Đăng nhập để xem màn hình bếp, xác nhận đơn, bắt đầu chuẩn bị, chuyển sang đã phục vụ hoặc hủy đơn.
- `CASHIER`: Đăng nhập để xem các phiên bàn đã phục vụ, thanh toán và in hóa đơn.
- `ADMIN`: Quản lý danh mục, sản phẩm, bàn, đơn hàng, hóa đơn, nhân viên và dashboard thống kê.

## Trang chính

- `/login`: Đăng nhập theo vai trò.
- `/admin/dashboard`: Dashboard doanh thu, đơn hàng, sản phẩm và bàn.
- `/admin/categories`: Quản lý danh mục hiển thị trên menu.
- `/admin/products`: Quản lý sản phẩm, trạng thái bán, danh mục và ảnh món.
- `/admin/tables`: Quản lý bàn, trạng thái bàn, phiên phục vụ và QR gọi món.
- `/admin/orders`: Theo dõi toàn bộ đơn hàng.
- `/admin/invoices`: Quản lý hóa đơn, lọc theo khoảng ngày thanh toán.
- `/admin/users`: Quản lý nhân viên và tài khoản.
- `/staff/orders`: Màn hình bếp, tự động làm mới, sắp xếp đơn theo độ gấp và thời gian chờ.
- `/cashier/orders`: Thu ngân thanh toán theo phiên bàn.
- `/order/table/[tableId]`: Trang khách gọi món bằng QR.
- `/invoices/[id]/print`: Phiếu thanh toán nhỏ dạng hóa đơn in nhiệt.

## API chính

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/[id]`
- `DELETE /api/categories/[id]`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/[id]`
- `DELETE /api/products/[id]`
- `POST /api/uploads/product-image`
- `GET /api/tables`
- `POST /api/tables`
- `PUT /api/tables/[id]`
- `DELETE /api/tables/[id]`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/[id]`
- `PUT /api/orders/[id]/status`
- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/invoices/[id]`
- `GET /api/dashboard/summary`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/[id]`
- `DELETE /api/users/[id]`

## Chức năng đã hoàn thiện

- Đăng nhập bằng email/password, hash mật khẩu bằng bcrypt và lưu phiên bằng JWT httpOnly cookie.
- Phân quyền route theo vai trò `ADMIN`, `STAFF`, `CASHIER`; khách chỉ truy cập được trang QR order.
- Admin CRUD danh mục, sản phẩm, bàn và nhân viên.
- Sản phẩm có trạng thái `AVAILABLE` / `UNAVAILABLE`; chỉ món đang bán và danh mục có món đang bán mới xuất hiện trên menu khách.
- Trang sản phẩm hỗ trợ nhập link ảnh hoặc tải ảnh món từ file lên thư mục `public/images/products`.
- Bàn có trạng thái `AVAILABLE`, `OCCUPIED`, `RESERVED`; khi khách gửi món lần đầu từ QR, hệ thống tự mở phiên phục vụ `DiningSession`.
- QR tại bàn vẫn là link tĩnh `/order/table/[tableId]`; khách ngồi vào bàn là có thể gọi món, các lần gọi sau tự gom vào phiên đang mở.
- Mỗi lần khách gửi món tạo một order riêng, nhưng các order cùng phiên bàn được gom vào một bill khi thanh toán.
- Backend tự tính `totalAmount`, kiểm tra món còn bán và không tin dữ liệu giá từ client.
- Màn hình bếp tự động làm mới, hiển thị đơn mới, đã xác nhận, đang chuẩn bị, thời gian chờ và cảnh báo đơn quá lâu.
- Luồng đơn hàng có kiểm soát: `PENDING -> CONFIRMED -> PREPARING -> SERVED -> PAID`, có thể hủy khi còn mở.
- Thu ngân chỉ thanh toán khi toàn bộ đơn trong phiên bàn đã được phục vụ hoặc đã hủy.
- Khi thanh toán, hệ thống chỉ trả bàn về trống nếu bàn không còn đơn/phiên đang mở.
- Hóa đơn lưu `paymentMethod`, `paidAt`, tổng tiền và danh sách món gộp theo phiên bàn.
- Trang in hóa đơn nhỏ gọn, có địa chỉ `xx, Phú Nhuận, Tp.HCM`, điện thoại `098 xxx` và lời cảm ơn cuối phiếu.
- Dashboard thống kê doanh thu hôm nay, đơn hôm nay, đơn đã thanh toán, sản phẩm đang bán, tổng bàn và đơn gần đây.

## Database models

Prisma schema gồm:

- `User`
- `Category`
- `Product`
- `CafeTable`
- `DiningSession`
- `Order`
- `OrderItem`
- `Invoice`

Enums:

- `Role`: `ADMIN`, `STAFF`, `CASHIER`
- `ProductStatus`: `AVAILABLE`, `UNAVAILABLE`
- `TableStatus`: `AVAILABLE`, `OCCUPIED`, `RESERVED`
- `DiningSessionStatus`: `OPEN`, `CLOSED`, `CANCELLED`
- `OrderStatus`: `PENDING`, `CONFIRMED`, `PREPARING`, `SERVED`, `PAID`, `CANCELLED`
- `PaymentMethod`: `CASH`, `BANK_TRANSFER`, `QR_PAYMENT`

Tiền được lưu bằng `Int`, không dùng `Float`. Ví dụ `25000` nghĩa là 25.000 VND.

## Cài đặt và chạy project

Sao chép file mẫu:

```bash
cp .env.example .env
```

Cập nhật biến môi trường:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&schema=public"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Cài dependency:

```bash
npm install
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Đẩy schema lên Supabase PostgreSQL:

```bash
npm run prisma:push
```

Seed dữ liệu mẫu:

```bash
npm run db:seed
```

Chạy dev server:

```bash
npm run dev
```

Mở trình duyệt tại:

```text
http://localhost:3000
```

## Tài khoản seed mẫu

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | admin@gmail.com | 123456 |
| STAFF | staff@gmail.com | 123456 |
| CASHIER | cashier@gmail.com | 123456 |

## Kịch bản demo báo cáo

1. Khách mở `/order/table/1`, chọn nhiều món và gửi đơn lần 1; hệ thống tự mở phiên bàn.
2. Khách gửi thêm món lần 2 trên cùng bàn để chứng minh nhiều order được gom vào một phiên.
3. Staff vào `/staff/orders`, bật chế độ bếp, xác nhận và chuyển trạng thái món đến `SERVED`.
4. Cashier vào `/cashier/orders`, thanh toán phiên bàn và tạo hóa đơn.
5. Mở `/invoices/[id]/print` để in phiếu thanh toán nhỏ.
6. Quay lại admin kiểm tra hóa đơn, dashboard và trạng thái bàn sau thanh toán.

## Điểm nhấn khi thuyết trình

- QR order không chỉ là tạo đơn, mà có phiên bàn để chống khách giữ link rồi đặt từ xa sau khi rời quán.
- Bill được gom theo bàn/phiên, phù hợp thực tế khách gọi thêm món nhiều lần.
- Bếp có màn hình ưu tiên theo thời gian chờ, giúp nhân viên biết đơn nào cần xử lý trước.
- Thanh toán có kiểm tra trạng thái phiên bàn, tránh lỗi trả bàn về trống khi vẫn còn đơn mở.
- Admin có đủ CRUD dữ liệu nền: danh mục, món, bàn, nhân viên, đơn hàng, hóa đơn và dashboard.
