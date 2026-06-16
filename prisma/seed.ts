import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, ProductStatus, Role, TableStatus } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    name: "Admin",
    email: "admin@gmail.com",
    password: "123456",
    role: Role.ADMIN,
  },
  {
    name: "Nhân viên",
    email: "staff@gmail.com",
    password: "123456",
    role: Role.STAFF,
  },
  {
    name: "Quầy vận hành",
    email: "cashier@gmail.com",
    password: "123456",
    role: Role.CASHIER,
  },
];

const categories = [
  "Cà phê",
  "Trà & trà sữa",
  "Sinh tố & nước ép",
  "Bánh ngọt",
  "Món đặc biệt",
];

const products = [
  {
    name: "Cà phê đen",
    description: "Cà phê đen truyền thống, đậm vị",
    price: 25000,
    categoryName: "Cà phê",
  },
  {
    name: "Cà phê sữa",
    description: "Cà phê pha sữa đặc thơm béo",
    price: 30000,
    categoryName: "Cà phê",
  },
  {
    name: "Bạc xỉu",
    description: "Sữa thơm béo cùng vị cà phê nhẹ",
    price: 35000,
    categoryName: "Cà phê",
  },
  {
    name: "Cà phê muối",
    description: "Cà phê kem muối béo nhẹ",
    price: 38000,
    categoryName: "Cà phê",
  },
  {
    name: "Trà đào cam sả",
    description: "Trà đào thanh mát cùng cam và sả",
    price: 45000,
    categoryName: "Trà & trà sữa",
  },
  {
    name: "Trà vải",
    description: "Trà vải ngọt dịu, thơm trái cây",
    price: 42000,
    categoryName: "Trà & trà sữa",
  },
  {
    name: "Trà chanh mật ong",
    description: "Trà chanh chua nhẹ cùng mật ong",
    price: 35000,
    categoryName: "Trà & trà sữa",
  },
  {
    name: "Trà tắc xí muội",
    description: "Trà tắc chua ngọt cùng xí muội",
    price: 35000,
    categoryName: "Trà & trà sữa",
  },
  {
    name: "Trà sữa truyền thống",
    description: "Trà sữa đậm vị trà, béo nhẹ",
    price: 38000,
    categoryName: "Trà & trà sữa",
  },
  {
    name: "Trà sữa matcha",
    description: "Trà sữa matcha thơm dịu",
    price: 45000,
    categoryName: "Trà & trà sữa",
  },
  {
    name: "Trà sữa khoai môn",
    description: "Trà sữa khoai môn ngọt bùi",
    price: 42000,
    categoryName: "Trà & trà sữa",
  },
  {
    name: "Sinh tố bơ",
    description: "Sinh tố bơ béo mịn",
    price: 45000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Sinh tố xoài",
    description: "Sinh tố xoài thơm ngọt",
    price: 42000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Sinh tố mãng cầu",
    description: "Sinh tố mãng cầu chua ngọt",
    price: 45000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép cam",
    description: "Cam ép tươi nguyên vị",
    price: 40000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép chanh dây",
    description: "Chanh dây ép chua thanh",
    price: 38000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép cần tây táo",
    description: "Cần tây và táo ép tươi mát",
    price: 45000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép mix cam cà rốt",
    description: "Cam và cà rốt ép cùng nhau",
    price: 45000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép thơm",
    description: "Thơm ép chua ngọt",
    price: 38000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép cà rốt",
    description: "Cà rốt ép nguyên chất",
    price: 38000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép ổi",
    description: "Ổi ép tươi mát",
    price: 38000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép táo",
    description: "Táo ép vị thanh",
    price: 42000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Nước ép dưa hấu",
    description: "Dưa hấu ép mát lạnh",
    price: 35000,
    categoryName: "Sinh tố & nước ép",
  },
  {
    name: "Bánh flan caramel",
    description: "Bánh flan mềm mịn cùng caramel",
    price: 30000,
    categoryName: "Bánh ngọt",
  },
  {
    name: "Bánh su kem",
    description: "Bánh su mềm với nhân kem béo nhẹ",
    price: 35000,
    categoryName: "Bánh ngọt",
  },
  {
    name: "Bánh chuối nướng",
    description: "Bánh chuối nướng thơm mềm",
    price: 38000,
    categoryName: "Bánh ngọt",
  },
  {
    name: "Bánh bông lan trứng muối",
    description: "Bông lan mềm cùng sốt trứng muối",
    price: 45000,
    categoryName: "Bánh ngọt",
  },
  {
    name: "Trà táo quế mật ong",
    description: "Trà táo quế ấm thơm cùng mật ong",
    price: 48000,
    categoryName: "Món đặc biệt",
  },
  {
    name: "Sữa tươi trân châu đường đen",
    description: "Sữa tươi béo nhẹ cùng trân châu đường đen",
    price: 45000,
    categoryName: "Món đặc biệt",
  },
  {
    name: "Cacao nóng",
    description: "Cacao nóng thơm đậm",
    price: 40000,
    categoryName: "Món đặc biệt",
  },
  {
    name: "Set trà bánh mùa thu",
    description: "Set trà và bánh dùng kèm",
    price: 89000,
    categoryName: "Món đặc biệt",
  },
];

const tables = ["Bàn 1", "Bàn 2", "Bàn 3", "Bàn 4", "Bàn 5"];

async function seedUsers() {
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role,
      },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
  }
}

async function seedCategories() {
  for (const name of categories) {
    const existingCategory = await prisma.category.findFirst({
      where: { name },
    });

    if (existingCategory) {
      await prisma.category.update({
        where: { id: existingCategory.id },
        data: { name },
      });
      continue;
    }

    await prisma.category.create({
      data: { name },
    });
  }
}

async function seedProducts() {
  const categoryRows = await prisma.category.findMany();
  const categoryByName = new Map(
    categoryRows.map((category) => [category.name, category.id]),
  );
  const activeProductNames = products.map((product) => product.name);

  await prisma.product.deleteMany({
    where: {
      name: {
        notIn: activeProductNames,
      },
      orderItems: {
        none: {},
      },
    },
  });

  await prisma.product.updateMany({
    where: {
      name: {
        notIn: activeProductNames,
      },
      orderItems: {
        some: {},
      },
    },
    data: {
      status: ProductStatus.UNAVAILABLE,
    },
  });

  for (const product of products) {
    const categoryId = categoryByName.get(product.categoryName);

    if (!categoryId) {
      throw new Error(`Không tìm thấy danh mục: ${product.categoryName}`);
    }

    const existingProduct = await prisma.product.findFirst({
      where: { name: product.name },
    });

    const data = {
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId,
      status: ProductStatus.AVAILABLE,
    };

    if (existingProduct) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data,
      });
      continue;
    }

    await prisma.product.create({ data });
  }

  await prisma.category.deleteMany({
    where: {
      products: {
        none: {},
      },
    },
  });
}

async function seedTables() {
  for (const name of tables) {
    const existingTable = await prisma.cafeTable.findFirst({
      where: { name },
    });

    if (existingTable) {
      await prisma.cafeTable.update({
        where: { id: existingTable.id },
        data: {
          name,
          qrCodeUrl: `/order/table/${existingTable.id}`,
          status: existingTable.status,
        },
      });
      continue;
    }

    const createdTable = await prisma.cafeTable.create({
      data: {
        name,
        status: TableStatus.AVAILABLE,
      },
    });

    await prisma.cafeTable.update({
      where: { id: createdTable.id },
      data: {
        qrCodeUrl: `/order/table/${createdTable.id}`,
      },
    });
  }
}

async function main() {
  await seedUsers();
  await seedCategories();
  await seedProducts();
  await seedTables();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
