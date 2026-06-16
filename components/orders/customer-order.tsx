"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appendCustomerAiMessage,
  type CustomerAiMessage,
  type CustomerAiSuggestedProduct,
} from "./customer-ai-messages";
import { getCategoryContextIds } from "./customer-order-navigation";
import { customerAiSampleQuestions } from "@/lib/ai-insights";
import { formatMoney } from "@/lib/format-money";
import {
  drinkOptionLevels,
  formatOrderItemNoteWithOptions,
  isCustomizableDrink,
  type DrinkOptionLevel,
} from "@/lib/order-item-options";

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
  activeSessionId: number | null;
};

type CartItem = {
  product: CustomerProduct;
  quantity: number;
  note: string;
  sugarLevel: DrinkOptionLevel | null;
  iceLevel: DrinkOptionLevel | null;
};

type SubmitResponse = {
  message?: string;
  data?: {
    id: number;
    totalAmount: number;
    status: string;
  };
};

type CustomerAiResponse = {
  message?: string;
  data?: {
    reply: string;
    sampleQuestions: string[];
    suggestedProducts?: CustomerAiSuggestedProduct[];
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
  "Đã gửi đơn thành công. Nhân viên sẽ xác nhận đơn trước khi chuẩn bị.";

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
  peachTea:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAD5EKpW5yzHbWxyw7iafcM3JB8iOJ6LCwBxMQTgFqXMsV01GY03qOyCXWZXTHtiHURXELZoWzEO7rVfs5CwsK4iBjTeZ4za3v5MA9tFh2uao0qwsIaBl9b78PYHDU94_MGaFtUOZR4oX-VnR8XXv2D7Z31bRq9RYgHK53fJftOWWFYwDmX2iBxWY_jjHuBPU6LUxpYHCgv5wyeOdzRxvoZyir2NXjGoisyQ_fNKOcxbcsjREn_MSNcUOTuxQuK7RGOz_8GTYJtyAM",
  lycheeTea:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBAGCqTKbQTzyerzuVE8XisrybszGqSaP7Rno2ZGHnAiltJHviXU2KSdc-cJe2Ze3BTPekqwjIe2vDh5zb3zJ-IBQ6TIM5RQq9E8CgMlUhOiS6w1Cb_u7x8jIc7ewZCL3GQ_vmWnjgcNUJsusguQelpUhhF4wNemplOeKURWFZYe7h7wakALUFL1tRsr0iQpLplWCILszB8OO0EW1CdrhX6fqDpJuj2dWb28FXQCYOkp81nj7pFAMClae-ios2KnvWVBSUs3yS26e4",
  lemonHoneyTea:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBD5I9YsjznsMANuDRW3paROk-DSomIuUONwD0zJ0iBuOY7QTSHYJr7ueSP-vSda5LEHN1WePLl1LHOnqi1_r5JgNpiyoDMBFCob0yg2uu2JAxxewaXiy-axTtYlfLauhKTD6VORgBEoYG08iTe_k5to9RFtejXzHP-0ii8TCzmJD-MooK9y3Mo57kHtoqZq8mGYYIRN1kQZ07vqvilU_0eTvlVYlI8OMasRrWwLBiXWmdqvNCSnwv5pejqp5nBsQmzap6G1Wc4ljU",
  kumquatTea:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBbngkNLVva8USbZnJn5MroFpblgETgqzlk2vdM30-0tHUgimhPsYZDoqPYkSWNZJ-dIJ0M0ZxTj_mRenmh-J5WkrTYPs6jQOgcuztj4J7ONaEeRm4CcF_keWoPRAcMGQ8ne572J8pyAwyQ4VQuNb8YziBA8du0yUgMtzaAquvAgapp7uaFTlZEj-bdpoD-HtllV13Il7HFJ6hSzite8XoS8k8hQwE8rBOiaRTj1mGmTTG8c6fxhBJuxrDFDgcyFZ4qFe_XNcpwzDM",
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
  taroMilkTea:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC6MfsM4-yZj6BlhvDgxC3a-GSePGclO4M_jqtBpr445T0F8OIsiZPNgJkXFg7l1F_uyD_YFofNW6CZ-FVcg6A1CPsP7-cagFJuZ7L9fs0qcdTjDjWidr4ajLg0nZAHV9YcuxRkOasMCSOlbp90tZ0d8X_OPwQ-7bCev005Gq1MbE10wHSxtfg6tXJk9bwpg56d7HB-oJ7fY6zPQZE7G-Fyhb7JT0PlUw95DRI2OWGtQlF8dlQKKc7Bxg_Ed0p3EvCqH8u9OF9u1Ds",
  avocadoSmoothie:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCo8J_k2OD0hXMTci9N1wDXnWBGxt0wAc5FlUoXFxv4d-3plygRi_lapw4yeSdv1BAl06RMc931doa6WOtX3AFAGI7QC6lE-09U5gALl_DaOaBEV4rXnBF5rIUW6RUzlWQQzXOleNLvRfEDOzm803Rp0JveJg5ueavPsodmixk_PhLPDEX_L0le735oOwFZRN46drK-8wJLNwG90wNz-MxBYHS1846dyJLpWawUnvVkRC1hYhSJq5InZJrMRJLziGkuLPdeOc_93-4",
  mangoSmoothie:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAC5kp_DuDoqQ8xMjEmP2mojwRMK9PUXWZDsXW7KUnyApC02NsJKaS_J90MWXlgm-L7Z5mxDBWJJGKrOsz0I42pdKHn8-_t4udz2mJszYnycxV1wZP9ZEevaCRsnFerO2fV29OyOP8sBVNZUkH4vtkiGst4ovwnt-wAi9Tx01Rvm_-Weu1qmN47L7dPBMqIJjBR-W4RFjQ699Tjp4IRgTAGEMw7sqQqFLtRkyn7N2Aha0LcHoQiCP_fzaea4C7Wja5kAlwj1HeLBUQ",
  soursopSmoothie:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAcrXYjT_QZTrVPBz9l8VZv3Ud0MAFz_9t9UovRc1kRkYpT_3o5p8_2KHRK_5e6HnG2onNZ4Eon5NZukx1990MkvDr52F2Tc23UqQDSURPSR6cDR-Dml6ukq-YJnx1HBq9-2458SK0zH6FqhvdXtQp63PQ2Sd6lZH74GSP9_pf7inlmNBbjcnKdIekbYRrLRkFEUL2VJ_TvCkeAhB87UliYWgHM8h-4X5kDB-MnkA5G7gslAj-ezrp3MHO6Wlfud5-BjJawjqga4Ec",
  flan:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB55vR1qhYUEOvY0xWcBLW80xhhuvFRPENBZ_gzkSiXTcmKoFswwFxs30IlGYf66qOYExaENBo5TtvYRn1iUY-4aXDrB8W5Gj0FYtmT2d2Tj9gwn_TVV6YoArdzIoQsla71Zlee-__oKVz-ggawYlKUKOqOEVKEJaSiZCdxuONmkG4ld1-gzcg64JEySIIrgVQpCFnJwNHaDbzHvtf8qhFWNnDx-zWYRd4HvjYCLAiG8Cv7Us7h_kJ6F3ri1lUp1P6NdrAS5NrEYjI",
  creamPuff:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAI22NSKuQfXw4ougYVO9k0sNfTg3hc6aeGBJZ_1C89QEgCAkL98_FAw_V0yd_QSO3-hnbkGGMSibt05UWGwq91aNETA_bJ2UfMWOuypbxe2RmP6Rv3Sblj8k1Vuy67z6LdtKChWncxNbtHJF5T4ooxXvSkJmjIR-G0b0Wyj7JKjrMj49afpuAq1fqMm6gFnifBqRTnl5tZcL1TpKE0xwU8TD1kYZZUUdV_iv1o7PJK2wLoY1r1IZ83soVELok-46g89FP1Y5mDrkc",
  bananaCake:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCBCr2EFHzg0tY4kbkGMiWDZUlFVfRrcfsaOYJtIQN-YMSNl-_f8svyRoZJ7IeB5RCeDc4O5Nct117U8NeqlB4Mux-ucSt_FxauLOF6wnnq0g3QkkSnYCMg9riWwzn60ZE7mmRhUpOMEr8udWa1iOQpaFs0PtY5D7rQNI0QklHXaMkAMhDozhnEwETmjYPl_0zk4iajehUF1-yJU2tB-g-1BLXl7XTIZbX8AvBIPISjuuxCcu4rPWxDAGM1gnP2V31DLuAdkUUL0CU",
  saltedSpongeCake:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBh8UEgzPOdGbzx_nTEIUchsKYXY5xBUwmm1CXU7EDen8Ud3r2tumxLDl_1lfjWjhT-wINBGYaX-bOTnGUDok4FYQc0cKx9rElz1QRkDO9lSUbz6iCyOwYsbjQf4DUWkT1FPViqtIvBVYujIv0qakc_oUFI1zm840N0Q5TEJiiNBrmwD3oLBllhXFdge2bRcowNqGO-BQEBJRG2HVhuCQEggrlleQ5I6_P_jg6eSEmCoafYyqJyUnLmd45jR8cXA1EIqVpzSsV5CqY",
  palmCake:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAuypAzRFG9Xp1aZprPwIZz8a_iOXnOpO6yhXuRkMhdcwwp3EiTHlbPrjsMjzx53v1S-VxViwV-Wo6H0DDKzSY1HSAgrvlL-KonEf_ryrGFXwTy4sg5BGMuOvyaKbsA4_K4n0k-Yz3XPbrA3kmqfin3TQ23ICfszu2s_SoR813QFDPCemVjW14PsfvncNsX3GVG8O_Mlx8poaXrab8-0YLWzVZOfS5X_1PXL1ePYHzQLdDYGMOAAXgwQHPGtU13Id9Vi5er7StRja4",
  greenBeanCake:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA_WGe0AEKIHaOZOc0dKbHiBDmya09Lx6MVz2vyRFP06dkhwmqi2TMckM3iDAQ4RBaaN6bjBUgJb1CIWHq9X2ZdFX46lHXHyot7_mCpJKqu6OadXN39NVGidsxXwrQCyeKG-UeOHnIKrtNuB4ufxy1AmPV31az_jrD-CM3sVEDpxe1hE2DmJ71Uo3K4S3GvX5sKIgkzoFLyNv3vkUuoYIzXyzqzPiN3rH2_xGN7ZZgnA6bIe0Rf-0ar0pCRDzn9W26EVPZ0eGydNRA",
  teaSet:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBU2CWOMCIO5udF35FPH5UEBXPgmTbKqz5U_fjdxqV2oIeU2oCkDC2RrN3wSdgL50XY8mJ-Ib87VyDVq44z6PJyEpYsLRAXujmhXl0O5neTb4CdoUHGPg7IJOmIhXWTisigQJEU-3wIArDuZxwtHSR5hUgoFkuu09h94vJdZ40W94YMEB2PgTi4jVlFQxQbPcPl4ls632Mkd82UNVuSeiJaVQ4Cym4Lb5eCs_OJl7LGgtIBaXVGgDYpuz1_qVURygZExECdyr5VuXE",
  brownSugarMilk:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA2NwRUbhtuOXpwrtE2LnhiUN97JbnhNKTB_wM5ggkmwwoRvkvI4M4FDrGjTzhVfxeZHJHYHaUOXx5xVks_EMK8ZDeaIjYg7uZ6AeGirPqszAivnA45lDxdxn4WQS-HCu0VtXS6ykytnjIPO2WDHdahW3b3xJ6d9KIzaXJd3xJFfzxCVYzoUqBU9You-5PxbW0tI10tItVjpauV7-7e12jx2Ndy6G4aiZl7s7e542ChGRFswd0TrkfS4jR7DzimYXlAfz_12kn3GZQ",
  hotCacao:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDvKEWPTXSvA-d1GvSRBKgHufnVdEiQz3q4kRfGxnxAbWgKi7aMJuv1YNoNOF6-747XNWiAxvqgkeOEsrqzJmZgklkMZKoGmNvjkA1n6xCmFZP3UuKyVOu0nxzg-U1tLv0G5WT2hJQCwTOSuePGtoJIQdw4GNkRbj6QuQClZKpWdEq42Hyq8Wrry9PwuInOVL6XQEiSC1EJTV0CLh1Ytz2fxR6z9ec8SbE9bbuTB5kiEXNDd49OTywLO1UMK8hOgtYg4Lu8Kug2Xz8",
};

const exactImageByName = new Map(
  Object.entries({
    "ca phe den": menuImages.blackCoffee,
    "ca phe sua": menuImages.milkCoffee,
    "bac xiu": menuImages.bacXiu,
    "ca phe muoi": menuImages.saltedCoffee,
    "tra dao cam sa": menuImages.peachTea,
    "tra vai": menuImages.lycheeTea,
    "tra chanh mat ong": menuImages.lemonHoneyTea,
    "tra tac xi muoi": menuImages.kumquatTea,
    "tra sua truyen thong": menuImages.milkTea,
    "tra sua matcha": menuImages.matchaTea,
    "tra sua khoai mon": menuImages.taroMilkTea,
    "sinh to bo": menuImages.avocadoSmoothie,
    "sinh to xoai": menuImages.mangoSmoothie,
    "sinh to mang cau": menuImages.soursopSmoothie,
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
    "banh bong lan trung muoi": menuImages.saltedSpongeCake,
    "brownie hanh nhan": menuImages.palmCake,
    "banh bo thot not": menuImages.palmCake,
    "banh dau xanh": menuImages.greenBeanCake,
    "banh dau xanh nuong": menuImages.greenBeanCake,
    "tra tao que mat ong": menuImages.teaSet,
    "sua tuoi tran chau duong den": menuImages.brownSugarMilk,
    "cacao nong": menuImages.hotCacao,
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
const productRankByName = new Map(
  productDisplayOrder.map((productName, index) => [productName, index]),
);

const statusLabel: Record<string, string> = {
  PENDING: "Đơn mới",
  CONFIRMED: "Đã xác nhận",
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
  return productRankByName.get(name) ?? 999;
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

const ProductCard = memo(function ProductCard({
  cartQuantity,
  onAdd,
  product,
  visual,
}: {
  cartQuantity: number;
  onAdd: (product: CustomerProduct) => void;
  product: CustomerProduct;
  visual: MenuVisual;
}) {
  return (
    <article className="group flex min-h-[252px] flex-col overflow-hidden rounded-[24px] border border-[#dac3ad] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(46,48,52,0.12)]">
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
            {cartQuantity > 0 ? (
              <p className="mt-1 text-xs font-bold text-[#544433]">
                Đã chọn x{cartQuantity}
              </p>
            ) : null}
          </div>
          <button
            aria-label={`Thêm ${product.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff9f0a] text-2xl font-bold leading-none text-[#2b1700] shadow-sm transition hover:brightness-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#885200]"
            onClick={() => onAdd(product)}
            type="button"
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
});

export function CustomerOrder({
  table,
  categories,
}: CustomerOrderProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(allCategory);
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<
    SubmitResponse["data"] | null
  >(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAiSubmitting, setIsAiSubmitting] = useState(false);
  const [aiMessages, setAiMessages] = useState<CustomerAiMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Bạn cần gợi ý món gì? Mình có thể tư vấn theo khẩu vị, món bán chạy hoặc đồ uống hợp thời điểm.",
    },
  ]);
  const categoryButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);

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

  const productById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const categoryById = useMemo(() => {
    return new Map(orderedCategories.map((category) => [category.id, category]));
  }, [orderedCategories]);

  const productVisualById = useMemo(() => {
    const visuals = new Map<number, MenuVisual>();

    for (const product of products) {
      const productImage = product.imageUrl?.trim();
      const categoryVisual = getCategoryVisual(
        categoryById.get(product.categoryId)?.name ?? product.name,
      );

      visuals.set(product.id, {
        ...categoryVisual,
        image: productImage || getProductFallbackImage(product.name),
      });
    }

    return visuals;
  }, [categoryById, products]);

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

  const categoryOptionVisualById = useMemo(() => {
    return new Map(
      categoryOptions.map((option) => [
        option.id,
        option.id === allCategory
          ? {
              image: "/images/menu/all.svg",
            }
          : getCategoryVisual(option.name),
      ]),
    );
  }, [categoryOptions]);

  const visibleCategories = useMemo(
    () => orderedCategories.filter((category) => category.products.length > 0),
    [orderedCategories],
  );

  const categoryPositionById = useMemo(() => {
    return new Map(
      orderedCategories.map((category, index) => [category.id, index]),
    );
  }, [orderedCategories]);

  const contextCategoryIds = useMemo(
    () =>
      getCategoryContextIds(
        categoryOptions.map((option) => option.id),
        selectedCategory,
      ),
    [categoryOptions, selectedCategory],
  );

  const contextCategoryIdSet = useMemo(
    () => new Set(contextCategoryIds),
    [contextCategoryIds],
  );

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
    return (
      productVisualById.get(product.id) ?? {
        image: getProductFallbackImage(product.name),
        accent: "#885200",
        soft: "#fff4e8",
      }
    );
  }

  useEffect(() => {
    let animationFrame = 0;

    function updateActiveCategory() {
      const stickyOffset = 92;
      let nextCategory = allCategory;

      for (const category of orderedCategories) {
        const categoryElement = document.getElementById(`category-${category.id}`);

        if (!categoryElement) {
          continue;
        }

        if (categoryElement.getBoundingClientRect().top <= stickyOffset) {
          nextCategory = String(category.id);
        } else {
          break;
        }
      }

      setSelectedCategory((currentCategory) =>
        currentCategory === nextCategory ? currentCategory : nextCategory,
      );
    }

    function queueActiveCategoryUpdate() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveCategory);
    }

    updateActiveCategory();
    window.addEventListener("scroll", queueActiveCategoryUpdate, {
      passive: true,
    });
    window.addEventListener("resize", queueActiveCategoryUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", queueActiveCategoryUpdate);
      window.removeEventListener("resize", queueActiveCategoryUpdate);
    };
  }, [orderedCategories]);

  useEffect(() => {
    categoryButtonRefs.current
      .get(selectedCategory)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
  }, [selectedCategory]);

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCartOpen(false);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!isAiOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAiOpen(false);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAiOpen]);

  useEffect(() => {
    if (!isAiOpen) {
      return;
    }

    aiMessagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [aiMessages, isAiOpen, isAiSubmitting]);

  function setCategoryButtonRef(
    categoryId: string,
    node: HTMLButtonElement | null,
  ) {
    if (node) {
      categoryButtonRefs.current.set(categoryId, node);
      return;
    }

    categoryButtonRefs.current.delete(categoryId);
  }

  function openCartSheet() {
    setIsCartOpen(true);
  }

  function selectCategory(categoryId: string) {
    setSelectedCategory(categoryId);

    if (categoryId === allCategory) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    document
      .getElementById(`category-${categoryId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const addToCart = useCallback((product: CustomerProduct) => {
    setMessage("");
    setError("");
    setCart((current) => {
      const currentItem = current[product.id];
      const categoryName = categoryById.get(product.categoryId)?.name ?? "";
      const hasDrinkOptions = isCustomizableDrink(categoryName, product.name);

      return {
        ...current,
        [product.id]: {
          product,
          quantity: Math.min((currentItem?.quantity ?? 0) + 1, 99),
          note: currentItem?.note ?? "",
          sugarLevel: currentItem?.sugarLevel ?? (hasDrinkOptions ? 100 : null),
          iceLevel: currentItem?.iceLevel ?? (hasDrinkOptions ? 100 : null),
        },
      };
    });
  }, [categoryById]);

  const buySuggestedProduct = useCallback((productId: number) => {
    const product = productById.get(productId);

    if (!product) {
      return;
    }

    addToCart(product);
    setIsAiOpen(false);
    setIsCartOpen(true);
  }, [addToCart, productById]);

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

  function updateItemOption(
    productId: number,
    field: "sugarLevel" | "iceLevel",
    level: DrinkOptionLevel,
  ) {
    setCart((current) => {
      const item = current[productId];

      if (!item) {
        return current;
      }

      return {
        ...current,
        [productId]: {
          ...item,
          [field]: level,
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
      setIsCartOpen(true);
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
          sessionId: table.activeSessionId,
          note,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            note: formatOrderItemNoteWithOptions({
              iceLevel: item.iceLevel,
              note: item.note,
              sugarLevel: item.sugarLevel,
            }),
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
      setIsCartOpen(false);
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

  async function askCustomerAi(nextQuestion?: string) {
    const question = (nextQuestion ?? aiInput).trim();

    if (!question || isAiSubmitting) {
      return;
    }

    const userMessage: Omit<CustomerAiMessage, "id"> = {
      role: "user",
      content: question,
    };

    setAiMessages((current) => appendCustomerAiMessage(current, userMessage));
    setAiInput("");
    setAiError("");
    setIsAiSubmitting(true);

    try {
      const response = await fetch("/api/ai/customer-chat", {
        body: JSON.stringify({
          tableId: table.id,
          message: question,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as CustomerAiResponse;

      if (!response.ok || !result.data?.reply) {
        throw new Error(getErrorMessage(result, "Không thể tư vấn món lúc này."));
      }

      setAiMessages((current) =>
        appendCustomerAiMessage(current, {
          role: "assistant",
          content: result.data!.reply,
          suggestedProducts: result.data!.suggestedProducts ?? [],
        }),
      );
    } catch (caughtError) {
      setAiError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tư vấn món lúc này.",
      );
    } finally {
      setIsAiSubmitting(false);
    }
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
            <h2
              className="mt-1 text-2xl font-extrabold text-[#1a1c1f]"
              id="cart-title"
            >
              Đơn của bạn
            </h2>
          </div>
          <span className="rounded-full bg-[#ffddbb] px-4 py-2 text-sm font-extrabold text-[#673d00]">
            {totalQuantity} món
          </span>
        </div>

        {cartItems.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[#dac3ad] bg-[#f9f9fe] p-4 text-sm leading-6 text-[#544433]">
            Giỏ hàng đang trống. Chọn món bằng nút +, rồi quay lại đây để
            ghi chú trước khi gửi đơn.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {cartItems.map((item) => {
              const visual = getProductVisual(item.product);
              const categoryName =
                categoryById.get(item.product.categoryId)?.name ?? "";
              const hasDrinkOptions = isCustomizableDrink(
                categoryName,
                item.product.name,
              );

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

                  {hasDrinkOptions ? (
                    <div className="mt-3 grid gap-3 rounded-xl border border-[#eadfce] bg-white p-3">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#885200]">
                          Đường
                        </p>
                        <div className="mt-2 grid grid-cols-5 gap-1.5">
                          {drinkOptionLevels.map((level) => (
                            <button
                              aria-pressed={item.sugarLevel === level}
                              className={
                                item.sugarLevel === level
                                  ? "min-h-9 min-w-0 rounded-full bg-[#ff9f0a] px-1 text-[13px] font-extrabold text-[#2b1700]"
                                  : "min-h-9 min-w-0 rounded-full border border-[#dac3ad] bg-[#fffdf9] px-1 text-[13px] font-extrabold text-[#544433] transition hover:bg-[#fff4e2]"
                              }
                              key={`sugar-${level}`}
                              onClick={() =>
                                updateItemOption(
                                  item.product.id,
                                  "sugarLevel",
                                  level,
                                )
                              }
                              type="button"
                            >
                              {level}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#885200]">
                          Đá
                        </p>
                        <div className="mt-2 grid grid-cols-5 gap-1.5">
                          {drinkOptionLevels.map((level) => (
                            <button
                              aria-pressed={item.iceLevel === level}
                              className={
                                item.iceLevel === level
                                  ? "min-h-9 min-w-0 rounded-full bg-[#2e3034] px-1 text-[13px] font-extrabold text-white"
                                  : "min-h-9 min-w-0 rounded-full border border-[#dac3ad] bg-[#fffdf9] px-1 text-[13px] font-extrabold text-[#544433] transition hover:bg-[#fff4e2]"
                              }
                              key={`ice-${level}`}
                              onClick={() =>
                                updateItemOption(
                                  item.product.id,
                                  "iceLevel",
                                  level,
                                )
                              }
                              type="button"
                            >
                              {level}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <label className="mt-3 flex flex-col gap-2 text-sm font-semibold text-[#544433]">
                    Ghi chú món
                    <input
                      className="min-h-11 rounded-lg border border-[#dac3ad] bg-white px-3 text-sm outline-none transition focus:border-[#885200] focus:ring-2 focus:ring-[#ffb868]"
                      onChange={(event) =>
                        updateItemNote(item.product.id, event.target.value)
                      }
                      placeholder={
                        hasDrinkOptions ? "Ví dụ: ít sữa..." : "Ví dụ: cắt nhỏ..."
                      }
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
            aria-busy={isSubmitting}
            className="min-h-12 rounded-lg bg-[#ff9f0a] px-6 text-sm font-extrabold text-[#2b1700] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[#ffb868]"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border-2 border-[#2b1700]/30 border-t-[#2b1700] animate-spin"
                />
                Đang gửi đơn
              </span>
            ) : (
              `Gửi đơn (${totalQuantity})`
            )}
          </button>
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-clip bg-[#e8e8ed] text-[#1a1c1f]">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-[#f9f9fe] pb-24 shadow-[0_0_40px_rgba(46,48,52,0.14)] md:border-x md:border-[#dac3ad]">
        <div className="px-4 py-4" id="menu-top">
          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-[#ffb868] bg-[#ffddbb] px-4 py-3 text-[#2b1700]">
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

            <div className="group relative min-h-[188px] overflow-hidden rounded-[24px] bg-[#2e3034] shadow-[0_18px_36px_rgba(46,48,52,0.16)]">
              <MenuImage
                className="absolute inset-0 h-full w-full opacity-90 transition duration-700 group-hover:scale-[1.03]"
                image={heroImage}
                label="Banner menu NaNa Cafe"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(46,48,52,0.05),rgba(0,0,0,0.72))]" />
              <div className="relative flex min-h-[188px] flex-col justify-end p-5">
                <p className="text-xs font-bold text-white/85">
                  NaNa Cafe & Tea
                </p>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-white">
                  Thực Đơn NaNa
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
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
                    {statusLabel[submittedOrder.status] ??
                      submittedOrder.status}
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
            className="sticky top-0 z-20 -mx-4 mb-4 border-y border-[#dac3ad] bg-[rgba(249,249,254,0.96)] px-3 py-1.5 shadow-[0_10px_24px_rgba(46,48,52,0.08)] backdrop-blur-xl"
            id="categories"
          >
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-end bg-[linear-gradient(90deg,rgba(249,249,254,0),rgba(249,249,254,0.96)_58%,rgba(249,249,254,1))] pr-1 text-xl font-bold text-[#885200]"
              >
                ›
              </div>
              <div className="flex snap-x gap-1.5 overflow-x-auto pb-0.5 pr-9 [scrollbar-width:thin]">
                {categoryOptions.map((option) => {
                  const isActive = selectedCategory === option.id;
                  const isContextCategory = contextCategoryIdSet.has(option.id);
                  const optionVisual = categoryOptionVisualById.get(option.id);

                  return (
                    <button
                      aria-current={isActive ? "true" : undefined}
                      aria-pressed={isActive}
                      className={`flex min-h-11 shrink-0 snap-center items-center gap-1.5 rounded-xl px-2 text-left transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#885200] ${
                        isActive ? "max-w-[130px]" : "max-w-[112px]"
                      } ${
                        isActive
                          ? "border border-[#ff9f0a] bg-[#ff9f0a] text-[#2b1700] shadow-[0_8px_18px_rgba(255,159,10,0.28)]"
                          : "border border-[#dac3ad] bg-white text-[#544433] hover:bg-[#fff4e2]"
                      } ${isContextCategory ? "opacity-100" : "opacity-80"}`}
                      key={option.id}
                      onClick={() => selectCategory(option.id)}
                      ref={(node) => setCategoryButtonRef(option.id, node)}
                      type="button"
                    >
                      <MenuImage
                        backgroundSize="cover"
                        className="h-5 w-5 shrink-0 rounded-full bg-[#fff4e2]"
                        image={optionVisual?.image ?? autumnMenuImage}
                        label={`Danh mục ${option.name}`}
                      />
                      <span
                        className={`min-w-0 ${
                          isActive ? "max-w-[90px]" : "max-w-[72px]"
                        }`}
                      >
                        <span className="block truncate text-xs font-extrabold leading-4">
                          {option.name}
                        </span>
                        <span className="block text-[10px] font-bold leading-3 opacity-75">
                          {option.count} món
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="space-y-7">
            {visibleCategories.length === 0 ? (
              <section className="rounded-xl border border-[#dac3ad] bg-white p-6 text-sm font-semibold text-[#544433] shadow-sm">
                Danh mục này chưa có món.
              </section>
            ) : null}

            {visibleCategories.map((category) => {
              const categoryIndex = categoryPositionById.get(category.id) ?? 0;

              return (
                <section
                  className="scroll-mt-24"
                  id={`category-${category.id}`}
                  key={category.id}
                >
                  <div className="mb-3 border-b border-[#dac3ad] pb-3">
                    <h2 className="text-xl font-extrabold text-[#1a1c1f]">
                      {categoryIndex + 1}. {category.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#544433]">
                      {category.products.length} món
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {category.products.map((product) => (
                      <ProductCard
                        cartQuantity={cart[product.id]?.quantity ?? 0}
                        key={product.id}
                        onAdd={addToCart}
                        product={product}
                        visual={getProductVisual(product)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {isCartOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-0">
          <button
            aria-label="Đóng giỏ hàng"
            className="absolute inset-0 bg-black/45"
            onClick={() => setIsCartOpen(false)}
            type="button"
          />
          <div
            aria-labelledby="cart-title"
            aria-modal="true"
            className="relative z-10 max-h-[88dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] bg-[#f9f9fe] p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.28)]"
            role="dialog"
          >
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 border-b border-[#dac3ad] bg-[rgba(249,249,254,0.96)] px-4 pb-3 pt-3 backdrop-blur-xl">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#c9b39e]" />
              <div className="flex justify-end">
                <button
                  className="min-h-11 rounded-full border border-[#dac3ad] bg-white px-4 text-sm font-extrabold text-[#544433] transition hover:bg-[#fff4e2] focus:outline-none focus:ring-2 focus:ring-[#885200]"
                  onClick={() => setIsCartOpen(false)}
                  type="button"
                >
                  Đóng
                </button>
              </div>
            </div>

            {renderCartPanel()}
          </div>
        </div>
      ) : null}

      {isAiOpen ? (
        <>
          <button
            aria-label="Đóng AI tư vấn"
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsAiOpen(false)}
            type="button"
          />
          <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-[430px] px-2">
            <section
              aria-labelledby="customer-ai-title"
              aria-modal="true"
              className="flex max-h-[76dvh] w-full flex-col overflow-hidden rounded-[28px] border border-[#dac3ad] bg-[#fffdf9] shadow-[0_-18px_52px_rgba(46,48,52,0.28)]"
              role="dialog"
            >
              <div className="px-4 pt-2">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-[#c9b39e]" />
              </div>
              <div className="flex items-start justify-between gap-3 border-b border-[#eadfce] px-4 pb-3 pt-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#172027] text-sm font-black text-white shadow-[0_8px_18px_rgba(23,32,39,0.22)]">
                    AI
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase leading-4 tracking-[0.1em] text-[#885200]">
                      AI tư vấn
                    </p>
                    <h2
                      className="mt-0.5 truncate text-lg font-extrabold leading-6 text-[#1a1c1f]"
                      id="customer-ai-title"
                    >
                      Gợi ý món cho bạn
                    </h2>
                  </div>
                </div>
                <button
                  className="min-h-9 rounded-full border border-[#dac3ad] bg-white px-3 text-xs font-extrabold text-[#544433] transition hover:bg-[#fff4e2] focus:outline-none focus:ring-2 focus:ring-[#885200]"
                  onClick={() => setIsAiOpen(false)}
                  type="button"
                >
                  Đóng
                </button>
              </div>

              <div className="min-h-[168px] flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {aiMessages.map((aiMessage, messageIndex) => {
                  const isAssistant = aiMessage.role === "assistant";

                  return (
                    <div
                      className={
                        aiMessage.role === "user"
                          ? "ml-auto max-w-[82%] rounded-2xl bg-[#ffddbb] px-4 py-3 text-sm font-semibold leading-6 text-[#2b1700]"
                          : "mr-auto max-w-[94%] rounded-2xl bg-[#eef4ef] px-4 py-3 text-sm font-semibold leading-6 text-[#1f463c]"
                      }
                      key={`${aiMessage.id}-${messageIndex}`}
                    >
                      <p>{aiMessage.content}</p>
                      {isAssistant && aiMessage.suggestedProducts?.length ? (
                        <div className="mt-3 grid gap-2">
                          {aiMessage.suggestedProducts.map(
                            (suggestedProduct, productIndex) => {
                              const product = productById.get(suggestedProduct.id);
                              const image = product
                                ? getProductVisual(product).image
                                : suggestedProduct.imageUrl?.trim() ||
                                  autumnMenuImage;

                              return (
                                <article
                                  className="grid min-h-[84px] grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-2xl border border-[#d8e5d8] bg-white p-2 shadow-sm"
                                  key={`${aiMessage.id}-${suggestedProduct.id}-${productIndex}`}
                                >
                                  <MenuImage
                                    className="h-16 w-16 rounded-xl bg-[#f3f3f8]"
                                    image={image}
                                    label={getMenuImageLabel(
                                      suggestedProduct.name,
                                    )}
                                  />
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm font-extrabold leading-5 text-[#1a1c1f]">
                                      {suggestedProduct.name}
                                    </p>
                                    <p className="mt-0.5 truncate text-[11px] font-bold uppercase text-[#6f8174]">
                                      {suggestedProduct.categoryName}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                      <span className="text-sm font-black tabular-nums text-[#885200]">
                                        {formatMoney(suggestedProduct.price)}
                                      </span>
                                      <button
                                        className="min-h-9 shrink-0 rounded-full bg-[#f6a62f] px-3 text-xs font-black text-[#2b1700] transition hover:bg-[#ffb94f] disabled:bg-[#d7d1c9] disabled:text-[#6f665d]"
                                        disabled={!product}
                                        onClick={() =>
                                          buySuggestedProduct(suggestedProduct.id)
                                        }
                                        type="button"
                                      >
                                        {product ? "Mua ngay" : "Hết món"}
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              );
                            },
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {isAiSubmitting ? (
                  <div className="mr-auto max-w-[88%] rounded-2xl bg-[#eef4ef] px-4 py-3 text-sm font-semibold leading-6 text-[#1f463c]">
                    AI đang nghĩ món phù hợp...
                  </div>
                ) : null}
                <div ref={aiMessagesEndRef} />
              </div>

              <div className="shrink-0 border-t border-[#eadfce] bg-[#fffdf9] p-3">
                <div className="mb-3 grid max-h-[148px] gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {customerAiSampleQuestions.map((question) => (
                    <button
                      className="min-h-10 w-full rounded-xl border border-[#dac3ad] bg-white px-3 text-left text-xs font-extrabold leading-5 text-[#544433] transition hover:bg-[#fff4e2] disabled:opacity-60"
                      disabled={isAiSubmitting}
                      key={question}
                      onClick={() => askCustomerAi(question)}
                      type="button"
                    >
                      {question}
                    </button>
                  ))}
                </div>
                {aiError ? (
                  <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
                    {aiError}
                  </p>
                ) : null}
                <form
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void askCustomerAi();
                  }}
                >
                  <input
                    className="min-h-11 rounded-xl border border-[#dac3ad] bg-white px-3 text-sm outline-none transition focus:border-[#885200] focus:ring-2 focus:ring-[#ffb868]"
                    disabled={isAiSubmitting}
                    onChange={(event) => setAiInput(event.target.value)}
                    placeholder="Hỏi AI tư vấn món..."
                    type="text"
                    value={aiInput}
                  />
                  <button
                    className="min-h-11 rounded-xl bg-[#2e3034] px-4 text-sm font-extrabold text-white disabled:opacity-60"
                    disabled={isAiSubmitting || !aiInput.trim()}
                    type="submit"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            </section>
          </div>
        </>
      ) : null}

      {!isAiOpen && !isCartOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(82px+env(safe-area-inset-bottom))] z-50">
          <div className="mx-auto flex w-full max-w-[430px] justify-end px-4">
            <button
              aria-label="Mở AI tư vấn món"
              className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full border border-[#2b1700]/15 bg-[#111111] text-sm font-black text-white shadow-[0_18px_38px_rgba(17,17,17,0.32)] transition hover:scale-[1.03] hover:bg-[#172027] focus:outline-none focus:ring-4 focus:ring-[#ffb868]"
              onClick={() => setIsAiOpen(true)}
              type="button"
            >
              <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-[#ff9f0a]" />
              AI
            </button>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        <div className="mx-auto flex max-w-[430px] items-center gap-2 rounded-t-2xl border border-b-0 border-[#dac3ad] bg-[rgba(255,255,255,0.95)] p-1.5 shadow-[0_-10px_24px_rgba(46,48,52,0.12)] backdrop-blur-xl">
          <button
            className="min-h-11 flex-1 rounded-xl border border-[#dac3ad] bg-white px-3 text-left transition hover:bg-[#f3f3f8] focus:outline-none focus:ring-2 focus:ring-[#885200]"
            onClick={openCartSheet}
            type="button"
          >
            <span className="block text-[11px] font-bold uppercase leading-4 text-[#885200]">
              Tạm tính
            </span>
            <span className="block text-base font-extrabold leading-5 tabular-nums text-[#1a1c1f]">
              {formatMoney(totalAmount)}
            </span>
          </button>
          <button
            aria-label="Mở giỏ hàng để ghi chú và gửi đơn"
            className="min-h-11 rounded-xl bg-[#ff9f0a] px-4 text-sm font-extrabold text-[#2b1700] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#885200]"
            onClick={openCartSheet}
            type="button"
          >
            Giỏ hàng ({totalQuantity})
          </button>
        </div>
      </div>
    </main>
  );
}
