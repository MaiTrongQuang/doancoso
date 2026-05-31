# Bo Nho Prompt Do An Co So CNTT

## 1. Thong Tin De Tai

**Ten de tai:** Xay dung website POS tich hop QR Order tai ban cho quan ca phe.

**Muc tieu:** Xay dung mot he thong website giup quan ca phe quan ly ban hang va cho phep khach hang goi mon bang cach quet ma QR tai ban.

He thong ho tro:

- Khach hang quet QR tai ban de xem menu va goi mon.
- Nhan vien tiep nhan don hang.
- Thu ngan thanh toan hoa don.
- Quan ly them, sua, xoa san pham.
- Quan ly ban, don hang, hoa don.
- Thong ke doanh thu co ban.

## 2. Cong Nghe Su Dung

Stack chinh du kien:

- **Frontend + Backend:** Next.js + TypeScript.
- **ORM:** Prisma ORM.
- **Database:** Supabase PostgreSQL.
- **Authentication:** Tu xay dung bang bcrypt va cookie session hoac JWT.
- **UI:** Tailwind CSS + shadcn/ui hoac component tu viet don gian.
- **Phan quyen:** Admin / Nhan vien / Thu ngan / Khach hang.

Ghi chu quan trong:

- Khach hang khong can dang nhap.
- Khach truy cap theo URL QR dang `/order/table/5`.
- Khong dung MySQL.
- Khong dung Supabase Auth trong giai doan dau.
- Supabase chi dung lam PostgreSQL database.
- Prisma ORM la lop truy cap du lieu chinh.
- `.env.example` can co `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`.
- `DATABASE_URL` dung cho Prisma Client.
- `DIRECT_URL` dung cho Prisma migration.
- Prisma schema dung `generator client` voi `provider = "prisma-client-js"`.
- Prisma datasource dung `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
- Neu can demo nhanh, uu tien thiet ke database gon, de seed du lieu va de chay local.

## 3. Pham Vi MVP

MVP la ban toi thieu co the demo duoc.

### CUSTOMER - Khach Hang

- Quet QR theo ban.
- Xem danh sach mon.
- Xem chi tiet mon.
- Them mon vao gio hang.
- Gui don goi mon.
- Xem thong bao gui don thanh cong.

### STAFF - Nhan Vien Phuc Vu

- Dang nhap.
- Xem danh sach don hang moi.
- Xac nhan don hang.
- Cap nhat trang thai: dang chuan bi, da phuc vu, da thanh toan.
- Huy don khi can.

### CASHIER - Thu Ngan

- Dang nhap.
- Xem cac don da phuc vu.
- Thanh toan hoa don.
- Chon phuong thuc thanh toan.
- Tao hoa don.

### ADMIN - Chu Quan / Quan Tri Vien

- Dang nhap.
- Quan ly danh muc san pham.
- Quan ly san pham / mon.
- Quan ly ban.
- Quan ly don hang.
- Xem hoa don.
- Quan ly hoa don.
- Quan ly nhan vien.
- Xem doanh thu theo ngay.
- Xem dashboard thong ke.

## 4. Actor Cua He Thong

He thong co 4 nhom nguoi dung.

### CUSTOMER - Khach Hang

Khong can dang nhap.

Chuc nang:

- Quet QR tai ban de mo trang goi mon.
- Xem menu.
- Them mon vao gio hang.
- Gui don hang.
- Xem thong bao gui don thanh cong.

### STAFF - Nhan Vien Phuc Vu

Can dang nhap.

Chuc nang:

- Xem danh sach don hang moi.
- Xac nhan don hang.
- Cap nhat trang thai don.
- Huy don khi can.

### CASHIER - Thu Ngan

Can dang nhap.

Chuc nang:

- Xem cac don da phuc vu.
- Thanh toan hoa don.
- Chon phuong thuc thanh toan.
- Tao hoa don.

### ADMIN - Chu Quan / Quan Tri Vien

Can dang nhap.

Chuc nang:

- Quan ly danh muc san pham.
- Quan ly san pham / mon.
- Quan ly ban.
- Quan ly don hang.
- Quan ly hoa don.
- Quan ly nhan vien.
- Xem dashboard thong ke.

## 5. Luong Hoat Dong Chinh

### Luong 1: Khach Hang Goi Mon Bang QR

1. Khach ngoi tai ban.
2. Khach quet ma QR duoc gan tren ban.
3. Website mo ra duong dan dang `/order/table/5`.
4. He thong hien thi menu mon.
5. Khach chon mon.
6. Khach them mon vao gio hang.
7. Khach bam "Gui don".
8. He thong tao don hang voi trang thai `PENDING`.
9. Nhan vien thay don moi trong man hinh quan ly.
10. Nhan vien xac nhan don.
11. Don chuyen sang trang thai `PREPARING`.
12. Khi phuc vu xong, nhan vien chuyen sang `SERVED`.
13. Thu ngan thanh toan, don chuyen sang `PAID`.

### Luong 2: Admin Quan Ly Menu

1. Admin dang nhap.
2. Vao trang quan ly san pham.
3. Them mon moi.
4. Nhap ten mon, gia, mo ta, danh muc, anh.
5. Luu san pham.
6. Mon xuat hien o menu khach hang.

### Luong 3: Thu Ngan Thanh Toan

1. Thu ngan vao danh sach don hang.
2. Chon don hang cua ban can thanh toan.
3. Xem tong tien.
4. Chon phuong thuc thanh toan: tien mat hoac QR.
5. Xac nhan thanh toan.
6. He thong tao hoa don.
7. Trang thai don hang chuyen thanh `PAID`.

## 6. Goi Y Database Supabase

Bang du kien:

- `users`: thong tin nguoi dung noi bo, gom name, email, password da hash bang bcrypt, role.
- `categories`: danh muc mon.
- `products`: san pham / mon.
- `cafe_tables`: ban trong quan ca phe.
- `orders`: don hang.
- `order_items`: chi tiet mon trong don.
- `invoices`: hoa don.

Enum / trang thai du kien:

- Role: `ADMIN`, `STAFF`, `CASHIER`.
- Order status: `PENDING`, `CONFIRMED`, `PREPARING`, `SERVED`, `PAID`, `CANCELLED`.
- Product status: `AVAILABLE`, `UNAVAILABLE`.
- Table status: `AVAILABLE`, `OCCUPIED`, `RESERVED`.
- Payment method: `CASH`, `BANK_TRANSFER`, `QR_PAYMENT`.

Luu y database:

- Cac truong tien dung `Int`, khong dung `Float`.
- Vi du `25000` nghia la 25.000 VND.
- Backend phai tu tinh `totalAmount` khi tao order.
- Mat khau user phai hash bang bcrypt.
- Khong dung Supabase Auth o giai doan dau.
- Supabase chi la PostgreSQL database, Prisma la ORM chinh.

## 7. Prompt Nen Dung Khi Lam Viec Voi Codex

### Prompt tong quat cho toan bo do an

```text
Hay xay dung website POS tich hop QR Order tai ban cho quan ca phe bang Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM va Supabase PostgreSQL. Khong dung MySQL va khong dung Supabase Auth o giai doan dau. He thong co cac nhom nguoi dung: khach hang khong can dang nhap, nhan vien/thu ngan/admin can dang nhap bang co che tu xay dung voi bcrypt va cookie session hoac JWT. Khach hang truy cap menu qua URL QR dang /order/table/[tableId], chon mon, them vao gio hang va gui don. Nhan vien xem va cap nhat trang thai don. Thu ngan thanh toan va tao hoa don. Admin quan ly danh muc, san pham, ban, nhan vien, hoa don va doanh thu co ban. Uu tien MVP de demo do an co so, code ro rang, de chay local va de mo rong.
```

### Prompt thiet ke database Prisma Supabase PostgreSQL

```text
Hay thiet ke Prisma schema cho website POS QR Order quan ca phe dung Supabase PostgreSQL. Dung generator `prisma-client-js`, datasource `postgresql`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`. Can co cac model User, Category, Product, CafeTable, Order, OrderItem va Invoice voi id Int autoincrement. Dinh nghia khoa chinh, khoa ngoai, enum Role, ProductStatus, TableStatus, OrderStatus, PaymentMethod, timestamp, tong tien va cac rang buoc can thiet. Cac truong tien dung Int, khong dung Float. Khach hang goi mon khong can dang nhap, con admin/nhan vien/thu ngan dang nhap bang co che tu xay dung, mat khau hash bang bcrypt vao truong password. Khong dung Supabase Auth.
```

### Prompt xay dung giao dien khach hang QR Order

```text
Hay xay dung giao dien khach hang cho duong dan /order/table/[tableId]. Man hinh can hien thi thong tin ban, danh sach danh muc, menu mon, chi tiet mon, gio hang, nut gui don va trang thai don hien tai cua ban. Khach hang khong can dang nhap. UI phu hop quan ca phe, de dung tren dien thoai, dung Tailwind CSS va component gon, ro rang.
```

### Prompt xay dung man hinh nhan vien

```text
Hay xay dung man hinh nhan vien cho website POS QR Order. Nhan vien can dang nhap, xem danh sach don hang moi, xem chi tiet don, xac nhan don, cap nhat trang thai PENDING -> CONFIRMED -> PREPARING -> SERVED -> PAID hoac CANCELLED. UI can de thao tac nhanh, ro rang cho moi don hang, co loc theo trang thai va ban.
```

### Prompt xay dung man hinh admin

```text
Hay xay dung dashboard admin cho website POS QR Order quan ca phe. Admin can dang nhap va co chuc nang quan ly danh muc, san pham, ban, nhan vien, don hang, hoa don va xem doanh thu theo ngay. UI can gon, de demo, co sidebar dieu huong, bang du lieu, form them/sua/xoa va thong bao ket qua thao tac.
```

### Prompt dang nhap va phan quyen

```text
Hay xay dung dang nhap va phan quyen cho project Next.js TypeScript dung Prisma va Supabase PostgreSQL. Khong dung Supabase Auth. User dang nhap bang email va mat khau, so sanh mat khau voi bcrypt, sau do tao cookie session hoac JWT. Bao ve cac trang /admin, /staff va /cashier. Khach hang vao /order/table/[tableId] khong can dang nhap. Phan quyen dua tren bang users voi role ADMIN, STAFF, CASHIER.
```

### Prompt seed du lieu demo

```text
Hay tao du lieu demo cho website POS QR Order quan ca phe tren Supabase PostgreSQL. Seed phai khong tao trung du lieu khi chay lai. Tai khoan mau: admin@gmail.com / 123456 / ADMIN, staff@gmail.com / 123456 / STAFF, cashier@gmail.com / 123456 / CASHIER. Mat khau phai hash bang bcrypt. Danh muc: Ca phe, Tra, Tra sua, Nuoc ep, Banh ngot. San pham: Ca phe den 25000, Ca phe sua 30000, Bac xiu 35000, Espresso 35000, Latte 45000, Tra dao 40000, Tra vai 40000, Tra sua truyen thong 35000, Nuoc cam 40000, Banh tiramisu 45000. Ban: Ban 1 den Ban 5. Them script npm run db:seed de chay seed.
```

## 8. Nguyen Tac Khi Phat Trien

- Uu tien MVP truoc, khong mo rong qua lon khi chua can.
- Moi module nen co giao dien demo duoc.
- Code ro rang, dung TypeScript, tach component hop ly.
- Cau truc project dung root-level `app/`, `components/`, `lib/`, `prisma/`, `public/images/`.
- API route dat trong `app/api/`: auth, categories, products, tables, orders, invoices, dashboard, users.
- Cac API can co: auth login/logout/me; CRUD categories/products/tables/users; orders list/create/detail/update status; invoices list/create/detail; dashboard summary.
- `/api/dashboard/summary` tra ve `todayRevenue`, `todayOrders`, `todayPaidOrders`, `availableProducts`, `totalTables`, `recentOrders`.
- Trang quan tri co `/admin/dashboard`, `/admin/categories`, `/admin/products`, `/admin/tables`, `/admin/orders`, `/admin/invoices`, `/admin/users`.
- Supabase PostgreSQL la database chinh.
- Prisma ORM la lop truy cap du lieu chinh.
- Khong dung MySQL.
- Khong dung Supabase Auth trong giai doan dau.
- Mat khau user phai hash bang bcrypt.
- Co seed data mau de chay thu va demo.
- Co README huong dan cai dat va chay project.
- Khach hang khong can dang nhap.
- Admin / Nhan vien / Thu ngan can dang nhap.
- Dang nhap dung `/api/auth/login`, bcrypt compare, JWT luu trong httpOnly cookie `cafe_pos_session`.
- Dang xuat dung `/api/auth/logout`, xoa cookie.
- Lay user hien tai dung `/api/auth/me`, khong tra ve password.
- Middleware phan quyen: ADMIN vao `/admin/*`, `/staff/*`, `/cashier/*`; STAFF vao `/staff/*`; CASHIER vao `/cashier/*`; CUSTOMER vao `/order/table/[tableId]`.
- Sau dang nhap: ADMIN -> `/admin/dashboard`, STAFF -> `/staff/orders`, CASHIER -> `/cashier/orders`.
- `/admin/categories` co bang danh sach, form them/sua, nut Sua, nut Xoa, xac nhan truoc khi xoa.
- API category mutation yeu cau ADMIN; khong cho xoa danh muc neu con san pham thuoc danh muc do.
- `/admin/products` co bang danh sach, form them/sua, loc theo danh muc, tim kiem theo ten, nut bat/tat trang thai, nut Sua, nut Xoa.
- API product mutation yeu cau ADMIN; khong cho xoa san pham neu san pham da nam trong don hang.
- `/admin/tables` co bang danh sach, form them/sua, cap nhat trang thai AVAILABLE/OCCUPIED/RESERVED, link goi mon `/order/table/[tableId]`, QR demo va nut copy link.
- API table mutation yeu cau ADMIN; khong cho xoa ban neu ban da co don hang trong he thong.
- `/order/table/[tableId]` la trang khach hang khong can dang nhap, toi uu cho dien thoai, co danh muc, san pham AVAILABLE, loc danh muc, gio hang, tang/giam/xoa mon, ghi chu, tong tien va nut gui don.
- `POST /api/orders` tao order `PENDING`, tao order item, backend tu lay gia san pham va tinh `totalAmount`, khong tin tong tien tu frontend.
- `/staff/orders` hien thi don `PENDING`, `CONFIRMED`, `PREPARING` dang card, co ma don, ban, thoi gian, danh sach mon, so luong, ghi chu, tong tien va trang thai.
- `PUT /api/orders/[id]/status` cho STAFF/ADMIN xu ly dung luong `PENDING -> CONFIRMED -> PREPARING -> SERVED`, va huy `PENDING/CONFIRMED -> CANCELLED`.
- `/cashier/orders` hien thi don `SERVED`, cho thu ngan chon don, xem chi tiet mon, so luong, don gia, thanh tien, tong tien va chon `CASH`, `BANK_TRANSFER`, `QR_PAYMENT`.
- `POST /api/invoices` cho CASHIER/ADMIN tao hoa don, cap nhat order sang `PAID`, cap nhat ban ve `AVAILABLE`; `QR_PAYMENT` chi la mo phong.
- `/admin/orders` xem tat ca don hang, loc theo trang thai/ngay tao, xem chi tiet don va hien thi tong tien theo VND.
- `/admin/invoices` xem danh sach hoa don, loc theo ngay thanh toan, xem chi tiet hoa don, hien thi phuong thuc va thoi gian thanh toan.
- Admin layout co sidebar ben trai, active link, cac muc Dashboard/Danh muc/San pham/Ban/Don hang/Hoa don/Nhan vien va nut Dang xuat.
- Moi thay doi quan trong ve yeu cau hoac cong nghe se duoc cap nhat vao file nay.
