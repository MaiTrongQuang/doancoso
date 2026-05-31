# Cafe POS QR Order

Website POS cho quan ca phe, co QR Order tai ban. Khach hang quet QR tai ban de goi mon, nhan vien xu ly don, thu ngan thanh toan, admin quan ly du lieu va thong ke.

## Cong nghe

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM 6.x
- Supabase PostgreSQL
- bcrypt
- Cookie session hoac JWT se duoc lam o buoc dang nhap

Khong dung MySQL. Khong dung Supabase Auth trong giai doan dau.

## Nhom nguoi dung

- `CUSTOMER`: Khong dang nhap, quet QR tai ban, xem menu, them mon vao gio, gui don va xem thong bao thanh cong.
- `STAFF`: Dang nhap, xem don moi da duoc he thong tu dong dua vao bep, cap nhat trang thai chuan bi/phuc vu va huy don khi can.
- `CASHIER`: Dang nhap, xem don da phuc vu, chon phuong thuc thanh toan, thanh toan va tao hoa don.
- `ADMIN`: Dang nhap, quan ly danh muc, san pham, ban, don hang, hoa don, nhan vien va xem dashboard thong ke.

## Trang da tao o buoc 1

- `/login`
- `/admin/dashboard`
- `/admin/categories`
- `/admin/products`
- `/admin/tables`
- `/admin/orders`
- `/admin/invoices`
- `/admin/users`
- `/staff/orders`
- `/cashier/orders`
- `/order/table/[tableId]`

## API da tao

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

`GET /api/dashboard/summary` tra ve:

```json
{
  "todayRevenue": 0,
  "todayOrders": 0,
  "todayPaidOrders": 0,
  "availableProducts": 0,
  "totalTables": 0,
  "recentOrders": []
}
```

Auth hien da hoat dong voi bcrypt va JWT httpOnly cookie:

- `POST /api/auth/login`: nhan email/password, so sanh password hash, set cookie, tra ve user khong gom password.
- `POST /api/auth/logout`: xoa cookie dang nhap.
- `GET /api/auth/me`: tra ve user hien tai neu cookie hop le.

Phan quyen route:

- `ADMIN`: vao duoc `/admin/*`, `/staff/*`, `/cashier/*`.
- `STAFF`: vao duoc `/staff/*`.
- `CASHIER`: vao duoc `/cashier/*`.
- `CUSTOMER`: khong dang nhap, vao `/order/table/[tableId]`.

## Chuc nang da lam

- `/admin/categories`: hien thi danh sach danh muc, them, sua, xoa, xac nhan truoc khi xoa.
- `POST /api/categories`, `PUT /api/categories/[id]`, `DELETE /api/categories/[id]`: yeu cau role `ADMIN`.
- `DELETE /api/categories/[id]`: khong cho xoa neu danh muc van con san pham va tra loi loi ro rang.
- `/admin/products`: hien thi danh sach san pham, them, sua, xoa, bat/tat trang thai dang ban, loc theo danh muc, tim kiem theo ten.
- `POST /api/products`, `PUT /api/products/[id]`, `DELETE /api/products/[id]`: yeu cau role `ADMIN`.
- `DELETE /api/products/[id]`: khong cho xoa neu san pham da ton tai trong don hang va tra loi loi ro rang.
- `/admin/tables`: hien thi danh sach ban, them, sua, xoa, cap nhat trang thai, hien thi link goi mon, QR demo va nut copy link.
- `POST /api/tables`, `PUT /api/tables/[id]`, `DELETE /api/tables/[id]`: yeu cau role `ADMIN`.
- `DELETE /api/tables/[id]`: khong cho xoa ban neu ban da co don hang trong he thong.
- `/order/table/[tableId]`: trang khach hang goi mon, toi uu cho dien thoai, hien thi ban, danh muc, san pham dang ban, gio hang, ghi chu va tong tien.
- `POST /api/orders`: khach hang khong can dang nhap, tao order `CONFIRMED` de bep nhan don tuc thi, tao order item, backend tu tinh `totalAmount` va cap nhat ban sang `OCCUPIED`.
- `/staff/orders`: hien thi cac don bep da nhan (`CONFIRMED`, kem `PENDING` cu neu co) va `PREPARING` theo dang card, tu dong lam moi de bep nhan don moi.
- `PUT /api/orders/[id]/status`: STAFF/ADMIN cap nhat dung luong `CONFIRMED -> PREPARING -> SERVED`; don `PENDING` cu duoc xu ly truc tiep sang `PREPARING`, hoac huy don khi can.
- `/cashier/orders`: hien thi don `SERVED`, chon don, xem chi tiet, chon phuong thuc thanh toan va tao hoa don don gian.
- `POST /api/invoices`: CASHIER/ADMIN tao invoice, cap nhat order sang `PAID` va cap nhat ban ve `AVAILABLE`.
- `GET /api/invoices`, `GET /api/invoices/[id]`: tra ve hoa don kem thong tin don, ban va danh sach mon.
- `/admin/orders`: xem tat ca don hang, loc theo trang thai/ngay tao, xem chi tiet don va hien thi tong tien VND.
- `/admin/invoices`: xem danh sach hoa don, loc theo ngay thanh toan, xem chi tiet hoa don, phuong thuc va thoi gian thanh toan.
- `/admin/*`: dung layout chung co sidebar ben trai gom Dashboard, Danh muc, San pham, Ban, Don hang, Hoa don, Nhan vien va Dang xuat.

## Cau truc thu muc chinh

```text
app/
  api/
    auth/
      login/
      logout/
      me/
    categories/
    products/
    tables/
    orders/
    invoices/
    dashboard/
  admin/
    dashboard/
    categories/
    products/
    tables/
    orders/
    invoices/
    users/
  cashier/
    orders/
  login/
  order/
    table/
      [tableId]/
  staff/
    orders/
  layout.tsx
  page.tsx
components/
  layout/
  ui/
  categories/
  products/
  tables/
  orders/
  invoices/
lib/
  prisma.ts
  auth.ts
  jwt.ts
  format-money.ts
  utils.ts
middleware.ts
prisma/
  schema.prisma
  seed.ts
public/
  images/
```

## Cau hinh moi truong

Sao chep file mau:

```bash
cp .env.example .env
```

Cap nhat bien moi truong bang connection string PostgreSQL cua Supabase:

- `DATABASE_URL`: dung cho Prisma Client khi ung dung chay.
- `DIRECT_URL`: dung cho Prisma migration va `prisma db push`.
- `JWT_SECRET`: dung cho JWT hoac signed cookie session o buoc dang nhap.

Vi du:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&schema=public"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Cai dat va chay project

Cai dependency:

```bash
npm install
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Day schema len Supabase PostgreSQL:

```bash
npm run prisma:push
```

Seed du lieu mau:

```bash
npm run db:seed
```

Chay dev server:

```bash
npm run dev
```

Mo trinh duyet tai:

```text
http://localhost:3000
```

## Tai khoan seed mau

Mat khau da duoc hash bang bcrypt trong seed.

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | admin@gmail.com | 123456 |
| STAFF | staff@gmail.com | 123456 |
| CASHIER | cashier@gmail.com | 123456 |

## Database models

Prisma schema gom:

- `User`
- `Category`
- `Product`
- `CafeTable`
- `Order`
- `OrderItem`
- `Invoice`

Enums:

- `Role`: `ADMIN`, `STAFF`, `CASHIER`
- `ProductStatus`: `AVAILABLE`, `UNAVAILABLE`
- `TableStatus`: `AVAILABLE`, `OCCUPIED`, `RESERVED`
- `OrderStatus`: `PENDING`, `CONFIRMED`, `PREPARING`, `SERVED`, `PAID`, `CANCELLED`
- `PaymentMethod`: `CASH`, `BANK_TRANSFER`, `QR_PAYMENT`

Tien duoc luu bang `Int`, khong dung `Float`. Vi du `25000` nghia la 25.000 VND. Backend se tu tinh `totalAmount` khi tao order o cac buoc tiep theo.

Schema hien dung `generator client` voi `provider = "prisma-client-js"` va datasource PostgreSQL co `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.

## Lo trinh phat trien

1. Tao project, Prisma schema, seed, README va trang rong.
2. Lam dang nhap va phan quyen.
3. Lam admin layout.
4. Lam CRUD danh muc.
5. Lam CRUD san pham.
6. Lam quan ly ban va QR.
7. Lam trang khach hang goi mon.
8. Lam trang nhan vien xu ly don.
9. Lam trang thu ngan thanh toan.
10. Lam dashboard thong ke.
