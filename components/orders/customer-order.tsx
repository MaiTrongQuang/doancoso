"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format-money";

type CustomerProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryId: number;
};

type CustomerCategory = {
  id: number;
  name: string;
  products: CustomerProduct[];
};

type CustomerTable = {
  id: number;
  name: string;
};

type CartItem = {
  product: CustomerProduct;
  quantity: number;
  note: string;
};

type SubmitResponse = {
  message?: string;
  data?: {
    id: number;
    totalAmount: number;
    status: string;
  };
};

type CustomerOrderProps = {
  table: CustomerTable;
  categories: CustomerCategory[];
};

type MenuVisual = {
  image: string;
  accent: string;
  soft: string;
};

const allCategory = "ALL";
const autumnMenuImage = "/images/menu/autumn-special-menu.png";
const successMessage =
  "Đã gửi đơn thành công. Bếp đã nhận đơn và sẽ chuẩn bị theo thứ tự.";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAjyVtJO98Pc71lJgKUEoqc9BkFspIH7-HZLzEp-0UfDVS6DgMSg8aNv-b9UPs7RskpspwRT1DeEHpwCmYucBkGw0CBjaeEbTXT_vmY5xtRjHpx9LSzr0Lp6nt5AMBxFmSxk66XQesWDRiCgK036crU0eQNLHSIJav9fzbhpbPo_dtH21VpwLQ3HmFOTPJx9jPU2fttZ5kTGJP7PiWl9roxzwu43J4--Mk9waWVduOjCRQ_gqyyPSobfWfjtDJoJgnzG5nX3FYoO7Q";

const menuImages = {
  blackCoffee:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAkXM6V8Zjk5vC8p1VPpVdNgf-tFrJWiNyAr9yz_GE9empYQIW374_sU7tbBLUtuyf7TzZVrKpb8tUxVYyKoFk1TZYxFf21eHo-ra948GKaPsKVATJefuIra86a_P8_S_DVd8ShLKtfB03ZBmxdX2ESIM9LcxhQKnIkQ8pU7u_J7kyRkxXOz61uYIVMec5Xjj3Z-s8dKfeYR2ep6KqvzKNv8gB6DEZLhZg5LklJ-vq-HeNMqMy9RLmV9lfK-JQ4PwKsYu3ClfklJEQ",
  milkCoffee:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBbaoLAN53Zorkla8JlZ8o3DIrqxKzBzQndoQFJLHrXB6rsgWaxxdbWt6R8Mp_mqChP1WMNWIFmuxB5ngDDTOR5ihWkj-Qb9Ab3MxeBtFXM4TFXj9yNpmxo84FrfC1VBdgRrL1GpIlCWbJMkXvZ8qm1pwkjsb9kNbMvOBM1BRInyzKQtnpq79cFVGK6IvQwxdUBcgycp8u2dY_rjEuxS-VkpjgYdLlU1-1GGy3f_iDZZeA-zuLJKS2rE5hwgq78YpC2ORmwJm6yMK8",
  bacXiu:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBTuTeeW1VMiv_LjZVuzH6Tjp4Auv0YCuVwELZC3v-q_beDTQeGlVmtw1eg6umutoZlpCWu9Hz5TMG7BV8Da48U5XIQTfPZ2i9eQees1c8V18-BqLBfxN4EOG-KUBiezSqPXLSI2q8Z1kcB78ZQPyz-L4Fz42JIGsH8C3cBX85G85O-jr7jej30OaXt_kHxFWfWq-m7aIyxuFrJfOyXpqLi9_82QR4BFvioTv1kkWNkVJ25SBpFWLZpdjGTQ-zWkg4_36UA2NCmM8I",
  saltedCoffee:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAM1fusOAMpASYibEfI2rGuPdxTiKBLBHkD_z-no8CBFVRfgNhnVBeG6R0TaaaN73ldGmMnLi7bxeB9LRv_fWeAGaCPG781KYVPzYXBaaVWIETbVxbpY95djK8a29DsHC7QUKDZNL7IGwH6xq_xPLmTES6KmxZOOnkxjewozgXy0KuEl2uQWx2M-tcJusYKaZbwr-uNNkKnHDkzB_YDs_4QCBVGQBPt3agvaXFUPjUy9LEk39WmypvXpfTNRVQKlaOjgOItpEDoVmU",
  orangeJuice:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCZwO64z7i7RqKguM20cS-L5y37aT0n7E9IbX67reazei8T3-Pz6MsA-WhVr69QccO_xrv5EPZfwORhjgIomsuWKpyjRxSOk0WDIV784Nzt9vVwwyESHjHfJUpkhhTklP5dX6MV1ILK7t7Y7Iojxw89uJrrrz75QRWgVjhChSzJw6uREORozbp-bk-nBn0qZIXSRQlpuYN6AZLxm4KSuho88bu91JIPlv0C3ZMnO8L9GBFBH4Z5NOG5WFxM1nb1ifjA__gkuzQL0Qg",
  passionJuice:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCEl1BQ2lXN9yCiSRu6QlMakLNJ6AGYY6x5tW9OpBkU45hIrtucvKgxSmF2dXcwELygaMHho62Np73vGirFIDSnfoggtjyBlumbMu4cbQwpTidRlwgEWU7JftzylUJeO55oeoWIrLS9YdkvdLhWwGxZ_5YP3ZBS4gFHvvNOkMRWCSub8XjoVTtr7EqbxQW75-msBkcems75sNM_w5IQ8qsui7OXzZTi7L1eQX6fkVV4xN98jVD7sleLp-I--k6hmnJkVJIwdASy6kU",
  greenJuice:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCBb_E38nEfWPK4UpDys3hTsiOhg1uSif-Elrd3qF5i53pJEqh8fs4dNNS7AH6gMHXBwAHsUCR3yhoiQSSIOBdmNheRj3JmWrPUFOBjd4LzYFsfBnxDBq9H5mzxTO-B6wPfbO7Uyl9DDteBnxLfyBp5uR5mYTS0Pwwu2NKLzjUbjnv31Na2DFs3mPrVI12Xd1tkNF1h1JdM4D2qKZsyiY5jL_bvLSl-nU8u_uFZAD1qrmpR2sELZzWUUwypsn4etX4m6TJVDzIZiWg",
  milkTea:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAUpXXvoub-X04ZWM3KlFzXkswMh7Pkya_0HAysPPgMqQpiW6_0NAx-F4cBPE0B9Vjhrc8mH5Qis6wBSUkh9nufzGaK4AhboE3GfnO455QwTgIhHWw68EIRw_QQ4VS5DV8kcxUfiTgqSFunXgsBJwLnF5sGX5LwXVk388pTlAk_GLUAnTqgRb2BIYNrzB6XN1D4x3PnCncCF2CwmzDbYxlbNhRDD40r-RqaZqBvSjJSlUqFilB5mSaY3NhSCurtylRTORrjnGW4iG8",
  matchaTea:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC2I3vxN45CSQREroIUtcTk9fADkhQzA9-GHL747a0KnbkVYLBR0opioaPBzWuorP4hKB7EBdVUXE6SRLBpr5Fjb4p4LySn6Umt9i-tQX65H0i1SgZ2yfVN_k0Z-D-yHgC44wfdaQmxfohNDsPVWFgWWtPVRxMB7yuUM3xLUvNgpLC1C_tSke_voCBhCtAlaNym4V4YZGbqY7fcfw-QZX1U5_S2Fx55IBgza8ewaxRf7pSFnU5oLhToILLvzKV9yBIsGSVA3fN3ZUs",
  flan:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB55vR1qhYUEOvY0xWcBLW80xhhuvFRPENBZ_gzkSiXTcmKoFswwFxs30IlGYf66qOYExaENBo5TtvYRn1iUY-4aXDrB8W5Gj0FYtmT2d2Tj9gwn_TVV6YoArdzIoQsla71Zlee-__oKVz-ggawYlKUKOqOEVKEJaSiZCdxuONmkG4ld1-gzcg64JEySIIrgVQpCFnJwNHaDbzHvtf8qhFWNnDx-zWYRd4HvjYCLAiG8Cv7Us7h_kJ6F3ri1lUp1P6NdrAS5NrEYjI",
  creamPuff:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAI22NSKuQfXw4ougYVO9k0sNfTg3hc6aeGBJZ_1C89QEgCAkL98_FAw_V0yd_QSO3-hnbkGGMSibt05UWGwq91aNETA_bJ2UfMWOuypbxe2RmP6Rv3Sblj8k1Vuy67z6LdtKChWncxNbtHJF5T4ooxXvSkJmjIR-G0b0Wyj7JKjrMj49afpuAq1fqMm6gFnifBqRTnl5tZcL1TpKE0xwU8TD1kYZZUUdV_iv1o7PJK2wLoY1r1IZ83soVELok-46g89FP1Y5mDrkc",
  bananaCake:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCBCr2EFHzg0tY4kbkGMiWDZUlFVfRrcfsaOYJtIQN-YMSNl-_f8svyRoZJ7IeB5RCeDc4O5Nct117U8NeqlB4Mux-ucSt_FxauLOF6wnnq0g3QkkSnYCMg9riWwzn60ZE7mmRhUpOMEr8udWa1iOQpaFs0PtY5D7rQNI0QklHXaMkAMhDozhnEwETmjYPl_0zk4iajehUF1-yJU2tB-g-1BLXl7XTIZbX8AvBIPISjuuxCcu4rPWxDAGM1gnP2V31DLuAdkUUL0CU",
  palmCake:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAuypAzRFG9Xp1aZprPwIZz8a_iOXnOpO6yhXuRkMhdcwwp3EiTHlbPrjsMjzx53v1S-VxViwV-Wo6H0DDKzSY1HSAgrvlL-KonEf_ryrGFXwTy4sg5BGMuOvyaKbsA4_K4n0k-Yz3XPbrA3kmqfin3TQ23ICfszu2s_SoR813QFDPCemVjW14PsfvncNsX3GVG8O_Mlx8poaXrab8-0YLWzVZOfS5X_1PXL1ePYHzQLdDYGMOAAXgwQHPGtU13Id9Vi5er7StRja4",
  greenBeanCake:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA_WGe0AEKIHaOZOc0dKbHiBDmya09Lx6MVz2vyRFP06dkhwmqi2TMckM3iDAQ4RBaaN6bjBUgJb1CIWHq9X2ZdFX46lHXHyot7_mCpJKqu6OadXN39NVGidsxXwrQCyeKG-UeOHnIKrtNuB4ufxy1AmPV31az_jrD-CM3sVEDpxe1hE2DmJ71Uo3K4S3GvX5sKIgkzoFLyNv3vkUuoYIzXyzqzPiN3rH2_xGN7ZZgnA6bIe0Rf-0ar0pCRDzn9W26EVPZ0eGydNRA",
  teaSet:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBU2CWOMCIO5udF35FPH5UEBXPgmTbKqz5U_fjdxqV2oIeU2oCkDC2RrN3wSdgL50XY8mJ-Ib87VyDVq44z6PJyEpYsLRAXujmhXl0O5neTb4CdoUHGPg7IJOmIhXWTisigQJEU-3wIArDuZxwtHSR5hUgoFkuu09h94vJdZ40W94YMEB2PgTi4jVlFQxQbPcPl4ls632Mkd82UNVuSeiJaVQ4Cym4Lb5eCs_OJl7LGgtIBaXVGgDYpuz1_qVURygZExECdyr5VuXE",
};

const exactImageByName = new Map(
  Object.entries({
    "ca phe den": menuImages.blackCoffee,
    "ca phe sua": menuImages.milkCoffee,
    "bac xiu": menuImages.bacXiu,
    "ca phe muoi": menuImages.saltedCoffee,
    "tra sua truyen thong": menuImages.milkTea,
    "tra sua matcha": menuImages.matchaTea,
    "nuoc ep mix cam ca rot": menuImages.orangeJuice,
    "nuoc ep cam": menuImages.orangeJuice,
    "nuoc ep ca rot": menuImages.orangeJuice,
    "nuoc ep thom": menuImages.passionJuice,
    "nuoc ep chanh day": menuImages.passionJuice,
    "nuoc ep oi": menuImages.greenJuice,
    "nuoc ep tao": menuImages.greenJuice,
    "nuoc ep can tay tao": menuImages.greenJuice,
    "nuoc ep dua hau": menuImages.orangeJuice,
    "banh flan caramel": menuImages.flan,
    "banh pho mai nhat": menuImages.flan,
    "cheesecake chanh day": menuImages.flan,
    "banh su kem": menuImages.creamPuff,
    "muffin viet quat": menuImages.creamPuff,
    "croissant bo": menuImages.creamPuff,
    "banh chuoi nuong": menuImages.bananaCake,
    "brownie hanh nhan": menuImages.palmCake,
    "banh bo thot not": menuImages.palmCake,
    "banh dau xanh": menuImages.greenBeanCake,
    "banh dau xanh nuong": menuImages.greenBeanCake,
    "set tra banh mua thu": menuImages.teaSet,
  }),
);

const productDisplayOrder = [
  "Cà phê đen",
  "Cà phê sữa",
  "Bạc xỉu",
  "Cà phê muối",
  "Trà đào cam sả",
  "Trà vải",
  "Trà chanh mật ong",
  "Trà tắc xí muội",
  "Trà sữa truyền thống",
  "Trà sữa matcha",
  "Trà sữa khoai môn",
  "Sinh tố bơ",
  "Sinh tố xoài",
  "Sinh tố mãng cầu",
  "Nước ép cam",
  "Nước ép chanh dây",
  "Nước ép cần tây táo",
  "Nước ép mix cam cà rốt",
  "Nước ép thơm",
  "Nước ép cà rốt",
  "Nước ép ổi",
  "Nước ép táo",
  "Nước ép dưa hấu",
  "Bánh flan caramel",
  "Bánh su kem",
  "Bánh chuối nướng",
  "Bánh bông lan trứng muối",
  "Trà táo quế mật ong",
  "Sữa tươi trân châu đường đen",
  "Cacao nóng",
  "Set trà bánh mùa thu",
];

const statusLabel: Record<string, string> = {
  PENDING: "Đơn mới",
  CONFIRMED: "Bếp đã nhận",
  PREPARING: "Đang chuẩn bị",
  SERVED: "Đã phục vụ",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

const categoryVisuals: Array<{
  keywords: string[];
  visual: MenuVisual;
}> = [
  {
    keywords: ["ca phe", "coffee", "bac xiu"],
    visual: {
      image: menuImages.milkCoffee,
      accent: "#885200",
      soft: "#fff4e2",
    },
  },
  {
    keywords: ["tra sua", "milk tea"],
    visual: {
      image: menuImages.milkTea,
      accent: "#885200",
      soft: "#fff3df",
    },
  },
  {
    keywords: ["tra", "tea"],
    visual: {
      image: menuImages.teaSet,
      accent: "#705d00",
      soft: "#fff7d4",
    },
  },
  {
    keywords: ["sinh to", "nuoc ep", "do uong", "juice"],
    visual: {
      image: menuImages.orangeJuice,
      accent: "#885200",
      soft: "#fff0d6",
    },
  },
  {
    keywords: ["banh", "cake"],
    visual: {
      image: menuImages.flan,
      accent: "#705d00",
      soft: "#fff5e7",
    },
  },
  {
    keywords: ["dac biet", "special"],
    visual: {
      image: menuImages.teaSet,
      accent: "#885200",
      soft: "#fff1d6",
    },
  },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function getCategoryRank(name: string) {
  const normalizedName = normalizeText(name);

  if (normalizedName.includes("ca phe")) {
    return 1;
  }

  if (normalizedName.includes("tra")) {
    return 2;
  }

  if (
    normalizedName.includes("sinh to") ||
    normalizedName.includes("nuoc ep") ||
    normalizedName.includes("do uong")
  ) {
    return 3;
  }

  if (normalizedName.includes("banh")) {
    return 4;
  }

  if (normalizedName.includes("dac biet")) {
    return 5;
  }

  return 99;
}

function getProductRank(name: string) {
  const index = productDisplayOrder.findIndex((productName) => productName === name);

  return index === -1 ? 999 : index;
}

function getCategoryVisual(name: string): MenuVisual {
  const normalizedName = normalizeText(name);

  return (
    categoryVisuals.find(({ keywords }) =>
      keywords.some((keyword) => normalizedName.includes(keyword)),
    )?.visual ?? {
      image: autumnMenuImage,
      accent: "#885200",
      soft: "#fff4e8",
    }
  );
}

function getProductFallbackImage(productName: string) {
  const normalizedName = normalizeText(productName);
  const exactImage = exactImageByName.get(normalizedName);

  if (exactImage) {
    return exactImage;
  }

  if (normalizedName.includes("coffee") || normalizedName.includes("ca phe")) {
    return menuImages.milkCoffee;
  }

  if (normalizedName.includes("matcha")) {
    return menuImages.matchaTea;
  }

  if (normalizedName.includes("tra sua")) {
    return menuImages.milkTea;
  }

  if (normalizedName.includes("tra") || normalizedName.includes("set")) {
    return menuImages.teaSet;
  }

  if (
    normalizedName.includes("ep") ||
    normalizedName.includes("cam") ||
    normalizedName.includes("ca rot")
  ) {
    return menuImages.orangeJuice;
  }

  if (
    normalizedName.includes("oi") ||
    normalizedName.includes("tao") ||
    normalizedName.includes("can tay")
  ) {
    return menuImages.greenJuice;
  }

  if (
    normalizedName.includes("brownie") ||
    normalizedName.includes("chocolate") ||
    normalizedName.includes("thot not")
  ) {
    return menuImages.palmCake;
  }

  if (normalizedName.includes("dau xanh")) {
    return menuImages.greenBeanCake;
  }

  if (normalizedName.includes("banh")) {
    return menuImages.flan;
  }

  return autumnMenuImage;
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return fallback;
}

function getMenuImageLabel(name: string) {
  return `Hình món ${name}`;
}

function MenuImage({
  backgroundSize = "cover",
  className,
  image,
  label,
}: {
  backgroundSize?: "contain" | "cover";
  className: string;
  image: string;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className={className}
      role="img"
      style={{
        backgroundImage: `url("${image}")`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize,
      }}
    />
  );
}

export function CustomerOrder({ table, categories }: CustomerOrderProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(allCategory);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<
    SubmitResponse["data"] | null
  >(null);

  const orderedCategories = useMemo(() => {
    return [...categories]
      .sort((firstCategory, secondCategory) => {
        const rankDiff =
          getCategoryRank(firstCategory.name) -
          getCategoryRank(secondCategory.name);

        if (rankDiff !== 0) {
          return rankDiff;
        }

        return firstCategory.name.localeCompare(secondCategory.name, "vi");
      })
      .map((category) => ({
        ...category,
        products: [...category.products].sort((firstProduct, secondProduct) => {
          const rankDiff =
            getProductRank(firstProduct.name) - getProductRank(secondProduct.name);

          if (rankDiff !== 0) {
            return rankDiff;
          }

          return firstProduct.name.localeCompare(secondProduct.name, "vi");
        }),
      }));
  }, [categories]);

  const products = useMemo(
    () => orderedCategories.flatMap((category) => category.products),
    [orderedCategories],
  );

  const categoryById = useMemo(() => {
    return new Map(orderedCategories.map((category) => [category.id, category]));
  }, [orderedCategories]);

  const categoryOptions = useMemo(
    () => [
      {
        id: allCategory,
        name: "Tất cả",
        count: products.length,
      },
      ...orderedCategories.map((category) => ({
        id: String(category.id),
        name: category.name,
        count: category.products.length,
      })),
    ],
    [orderedCategories, products.length],
  );

  const visibleCategories = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim());

    return orderedCategories
      .filter(
        (category) =>
          selectedCategory === allCategory ||
          category.id === Number(selectedCategory),
      )
      .map((category) => ({
        ...category,
        products: category.products.filter((product) => {
          if (!normalizedSearch) {
            return true;
          }

          return normalizeText(
            `${product.name} ${product.description ?? ""} ${category.name}`,
          ).includes(normalizedSearch);
        }),
      }))
      .filter((category) => category.products.length > 0);
  }, [orderedCategories, searchTerm, selectedCategory]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const totalAmount = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0,
      ),
    [cartItems],
  );
  const totalQuantity = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  );

  function getProductVisual(product: CustomerProduct): MenuVisual {
    const productImage = product.imageUrl?.trim();
    const categoryVisual = getCategoryVisual(
      categoryById.get(product.categoryId)?.name ?? product.name,
    );

    return {
      ...categoryVisual,
      image: productImage || getProductFallbackImage(product.name),
    };
  }

  function scrollToCart() {
    document.getElementById("cart")?.scrollIntoView({ behavior: "smooth" });
  }

  function addToCart(product: CustomerProduct) {
    setMessage("");
    setError("");
    setCart((current) => {
      const currentItem = current[product.id];

      return {
        ...current,
        [product.id]: {
          product,
          quantity: Math.min((currentItem?.quantity ?? 0) + 1, 99),
          note: currentItem?.note ?? "",
        },
      };
    });
  }

  function increaseQuantity(productId: number) {
    setCart((current) => {
      const item = current[productId];

      if (!item) {
        return current;
      }

      return {
        ...current,
        [productId]: {
          ...item,
          quantity: Math.min(item.quantity + 1, 99),
        },
      };
    });
  }

  function decreaseQuantity(productId: number) {
    setCart((current) => {
      const item = current[productId];

      if (!item) {
        return current;
      }

      if (item.quantity <= 1) {
        const nextCart = { ...current };
        delete nextCart[productId];
        return nextCart;
      }

      return {
        ...current,
        [productId]: {
          ...item,
          quantity: item.quantity - 1,
        },
      };
    });
  }

  function removeItem(productId: number) {
    setCart((current) => {
      const nextCart = { ...current };
      delete nextCart[productId];
      return nextCart;
    });
  }

  function updateItemNote(productId: number, itemNote: string) {
    setCart((current) => {
      const item = current[productId];

      if (!item) {
        return current;
      }

      return {
        ...current,
        [productId]: {
          ...item,
          note: itemNote,
        },
      };
    });
  }

  async function handleSubmit() {
    setMessage("");
    setError("");
    setSubmittedOrder(null);

    if (cartItems.length === 0) {
      setError("Vui lòng chọn ít nhất một món.");
      scrollToCart();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableId: table.id,
          note,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            note: item.note,
          })),
        }),
      });
      const result = (await response.json()) as SubmitResponse;

      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Không thể gửi đơn."));
      }

      setMessage(result.message ?? successMessage);
      setSubmittedOrder(result.data ?? null);
      setCart({});
      setNote("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể gửi đơn.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderProductCard(product: CustomerProduct) {
    const visual = getProductVisual(product);
    const cartItem = cart[product.id];

    return (
      <article
        className="group flex min-h-[252px] flex-col overflow-hidden rounded-xl border border-[#dac3ad] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(46,48,52,0.12)]"
        key={product.id}
      >
        <MenuImage
          className="aspect-square w-full bg-[#f3f3f8] transition duration-500 group-hover:scale-[1.04]"
          image={visual.image}
          label={getMenuImageLabel(product.name)}
        />
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#1a1c1f]">
            {product.name}
          </h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div className="min-w-0">
              <p className="text-base font-extrabold tabular-nums text-[#885200]">
                {formatMoney(product.price)}
              </p>
              {cartItem ? (
                <p className="mt-1 text-xs font-bold text-[#544433]">
                  Đã chọn x{cartItem.quantity}
                </p>
              ) : null}
            </div>
            <button
              aria-label={`Thêm ${product.name}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff9f0a] text-2xl font-bold leading-none text-[#2b1700] shadow-sm transition hover:brightness-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#885200]"
              onClick={() => addToCart(product)}
              type="button"
            >
              +
            </button>
          </div>
        </div>
      </article>
    );
  }

  function renderCartPanel() {
    return (
      <section
        className="rounded-xl border border-[#dac3ad] bg-white p-4 shadow-sm"
        id="cart"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-[#885200]">
              Giỏ hàng
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#1a1c1f]">
              Đơn của bạn
            </h2>
          </div>
          <span className="rounded-full bg-[#ffddbb] px-4 py-2 text-sm font-extrabold text-[#673d00]">
            {totalQuantity} món
          </span>
        </div>

        {cartItems.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[#dac3ad] bg-[#f9f9fe] p-4 text-sm leading-6 text-[#544433]">
            Giỏ hàng đang trống.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cartItems.map((item) => {
              const visual = getProductVisual(item.product);

              return (
                <div
                  className="rounded-lg border border-[#dac3ad] bg-[#f9f9fe] p-3"
                  key={item.product.id}
                >
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                    <MenuImage
                      className="h-16 w-16 rounded-lg bg-[#e2e2e7]"
                      image={visual.image}
                      label={getMenuImageLabel(item.product.name)}
                    />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-extrabold leading-5 text-[#1a1c1f]">
                            {item.product.name}
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-[#885200]">
                            {formatMoney(item.product.price * item.quantity)}
                          </p>
                        </div>
                        <button
                          className="min-h-9 rounded-md border border-[#ffdad6] bg-white px-3 text-xs font-bold text-[#93000a] transition hover:bg-[#fff5f4] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]"
                          onClick={() => removeItem(item.product.id)}
                          type="button"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="grid grid-cols-[40px_44px_40px] overflow-hidden rounded-full border border-[#dac3ad] bg-white">
                      <button
                        aria-label={`Giảm số lượng ${item.product.name}`}
                        className="min-h-10 text-lg font-bold text-[#673d00] transition hover:bg-[#ffddbb] focus:outline-none focus:ring-2 focus:ring-[#885200]"
                        onClick={() => decreaseQuantity(item.product.id)}
                        type="button"
                      >
                        -
                      </button>
                      <span className="flex min-h-10 items-center justify-center border-x border-[#dac3ad] text-sm font-extrabold text-[#1a1c1f]">
                        {item.quantity}
                      </span>
                      <button
                        aria-label={`Tăng số lượng ${item.product.name}`}
                        className="min-h-10 text-lg font-bold text-[#673d00] transition hover:bg-[#ffddbb] focus:outline-none focus:ring-2 focus:ring-[#885200]"
                        onClick={() => increaseQuantity(item.product.id)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold text-[#544433]">
                      {formatMoney(item.product.price)}
                    </span>
                  </div>

                  <label className="mt-3 flex flex-col gap-2 text-sm font-semibold text-[#544433]">
                    Ghi chú món
                    <input
                      className="min-h-11 rounded-lg border border-[#dac3ad] bg-white px-3 text-sm outline-none transition focus:border-[#885200] focus:ring-2 focus:ring-[#ffb868]"
                      onChange={(event) =>
                        updateItemNote(item.product.id, event.target.value)
                      }
                      placeholder="Ít đá, ít đường..."
                      type="text"
                      value={item.note}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}

        <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-[#544433]">
          Ghi chú đơn hàng
          <textarea
            className="min-h-24 rounded-lg border border-[#dac3ad] bg-white px-3 py-2 outline-none transition focus:border-[#885200] focus:ring-2 focus:ring-[#ffb868]"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: giao món cùng lúc..."
            value={note}
          />
        </label>

        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-[#2e3034] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/70">Tạm tính</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">
              {formatMoney(totalAmount)}
            </p>
          </div>
          <button
            className="min-h-12 rounded-lg bg-[#ff9f0a] px-6 text-sm font-extrabold text-[#2b1700] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-[#ffb868]"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Đang gửi..." : `Gửi đơn (${totalQuantity})`}
          </button>
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f9f9fe] pb-32 text-[#1a1c1f] md:pl-56">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-[#dac3ad] bg-[#f3f3f8] md:flex md:flex-col">
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff9f0a] text-sm font-extrabold text-[#2b1700]">
              N
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-[#885200]">NaNa Cafe</p>
              <p className="text-xs font-semibold text-[#544433]">
                Phục vụ tận tâm
              </p>
            </div>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-2">
            <a
              className="flex min-h-12 items-center gap-3 rounded-lg bg-[#ff9f0a] px-4 text-sm font-extrabold text-[#2b1700] transition active:scale-[0.98]"
              href="#menu-top"
            >
              <span aria-hidden="true">H</span>
              Trang chủ
            </a>
            <button
              className="flex min-h-12 items-center gap-3 rounded-lg px-4 text-left text-sm font-bold text-[#544433] transition hover:bg-[#e1dfe1] active:scale-[0.98]"
              onClick={scrollToCart}
              type="button"
            >
              <span aria-hidden="true">+</span>
              Giỏ hàng
              <span className="ml-auto rounded-full bg-white px-2 py-1 text-xs text-[#885200]">
                {totalQuantity}
              </span>
            </button>
            <a
              className="flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-bold text-[#544433] transition hover:bg-[#e1dfe1] active:scale-[0.98]"
              href="#categories"
            >
              <span aria-hidden="true">...</span>
              Danh mục
            </a>
          </nav>

          <div className="border-t border-[#dac3ad] pt-4 text-xs font-bold text-[#544433]">
            © 2026 NaNa F&B
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[#dac3ad] bg-[rgba(255,255,255,0.78)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff9f0a] text-sm font-extrabold text-[#2b1700]">
              N
            </div>
            <span className="font-extrabold text-[#885200]">NaNa</span>
          </div>

          <h1 className="hidden text-xl font-extrabold text-[#885200] md:block">
            NaNa
          </h1>

          <div className="relative ml-auto flex-1 md:ml-4 md:max-w-xl">
            <input
              aria-label="Tìm kiếm sản phẩm"
              className="min-h-11 w-full rounded-full border border-[#877461] bg-[#f3f3f8] px-4 py-2 text-sm outline-none transition focus:border-[#885200] focus:bg-white focus:ring-2 focus:ring-[#ffb868]"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm kiếm sản phẩm"
              type="search"
              value={searchTerm}
            />
          </div>

          <button
            aria-label="Đi tới giỏ hàng"
            className="flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-extrabold text-[#885200] transition hover:bg-[#ffddbb] focus:outline-none focus:ring-2 focus:ring-[#885200]"
            onClick={scrollToCart}
            type="button"
          >
            {totalQuantity}
          </button>
        </div>
      </header>

      <div
        className="mx-auto w-full max-w-[1200px] px-4 py-5 md:px-6 md:py-8"
        id="menu-top"
      >
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between rounded-xl border border-[#ffb868] bg-[#ffddbb] px-4 py-3 text-[#2b1700]">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2b1700] text-sm font-extrabold text-white"
              >
                i
              </span>
              <p className="truncate text-sm font-extrabold">
                Đã chọn {table.name}
              </p>
            </div>
          </div>

          <div className="group relative min-h-[220px] overflow-hidden rounded-[24px] bg-[#2e3034] shadow-[0_18px_42px_rgba(46,48,52,0.16)] md:min-h-[280px]">
            <MenuImage
              className="absolute inset-0 h-full w-full opacity-90 transition duration-700 group-hover:scale-[1.03]"
              image={heroImage}
              label="Banner menu NaNa Cafe"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(46,48,52,0.05),rgba(0,0,0,0.72))]" />
            <div className="relative flex min-h-[220px] flex-col justify-end p-5 md:min-h-[280px] md:p-7">
              <p className="text-sm font-bold text-white/85">NaNa Cafe & Tea</p>
              <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                Thực Đơn NaNa
              </h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/85 md:text-base">
                Hương vị mộc mạc, trải nghiệm tinh tế.
              </p>
            </div>
          </div>
        </section>

        {message ? (
          <div
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800 shadow-sm"
            role="status"
          >
            {message}
            {submittedOrder ? (
              <div className="mt-3 rounded-lg bg-white/85 p-3 text-[#1a1c1f]">
                <p>Đơn #{submittedOrder.id}</p>
                <p>
                  Trạng thái:{" "}
                  {statusLabel[submittedOrder.status] ?? submittedOrder.status}
                </p>
                <p>Tổng tiền: {formatMoney(submittedOrder.totalAmount)}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700 shadow-sm"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <nav
          aria-label="Danh mục món"
          className="sticky top-16 z-20 -mx-4 mb-6 border-y border-[#dac3ad] bg-[rgba(249,249,254,0.9)] px-4 py-3 backdrop-blur-xl md:mx-0 md:rounded-xl md:border"
          id="categories"
        >
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {categoryOptions.map((option) => {
              const isActive = selectedCategory === option.id;

              return (
                <button
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? "min-h-11 shrink-0 rounded-full bg-[#ff9f0a] px-5 text-sm font-extrabold text-[#2b1700] shadow-sm transition active:scale-[0.98]"
                      : "min-h-11 shrink-0 rounded-full border border-[#dac3ad] bg-white px-5 text-sm font-bold text-[#544433] transition hover:bg-[#ffddbb] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#885200]"
                  }
                  key={option.id}
                  onClick={() => setSelectedCategory(option.id)}
                  type="button"
                >
                  {option.name} · {option.count}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="space-y-8">
          {visibleCategories.length === 0 ? (
            <section className="rounded-xl border border-[#dac3ad] bg-white p-6 text-sm font-semibold text-[#544433] shadow-sm">
              Không tìm thấy món phù hợp.
            </section>
          ) : null}

          {visibleCategories.map((category) => {
            const visual = getCategoryVisual(category.name);
            const categoryIndex = orderedCategories.findIndex(
              (item) => item.id === category.id,
            );

            return (
              <section
                className="scroll-mt-36"
                id={`category-${category.id}`}
                key={category.id}
              >
                <div className="mb-4 flex items-center justify-between border-b border-[#dac3ad] pb-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#1a1c1f]">
                      {categoryIndex + 1}. {category.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#544433]">
                      {category.products.length} món
                    </p>
                  </div>
                  <div
                    className="hidden h-12 w-12 rounded-xl bg-[#fff4e2] md:block"
                    style={{ backgroundColor: visual.soft }}
                  >
                    <MenuImage
                      className="h-full w-full rounded-xl"
                      image={visual.image}
                      label={getMenuImageLabel(category.name)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {category.products.map((product) => renderProductCard(product))}
                </div>
              </section>
            );
          })}

          {renderCartPanel()}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dac3ad] bg-[rgba(255,255,255,0.92)] px-4 py-3 shadow-[0_-12px_30px_rgba(46,48,52,0.12)] backdrop-blur-xl md:left-56">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          <button
            className="min-h-12 flex-1 rounded-lg border border-[#dac3ad] bg-white px-4 text-left transition hover:bg-[#f3f3f8] focus:outline-none focus:ring-2 focus:ring-[#885200]"
            onClick={scrollToCart}
            type="button"
          >
            <span className="block text-xs font-bold uppercase text-[#885200]">
              Tạm tính
            </span>
            <span className="block text-lg font-extrabold tabular-nums text-[#1a1c1f]">
              {formatMoney(totalAmount)}
            </span>
          </button>
          <button
            className="min-h-12 rounded-lg bg-[#ff9f0a] px-5 text-sm font-extrabold text-[#2b1700] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-[#885200]"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Đang gửi..." : `Gửi đơn (${totalQuantity})`}
          </button>
        </div>
      </div>
    </main>
  );
}
