import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

/**
 * 购物车 store。
 *
 * 设计：购物车只在 client 端持久化（localStorage），不下发到 server。
 * cart item 只保存最小信息（productId + quantity + selected），
 * 显示时由调用方按需 fetch /products/:id 取最新价格与库存。
 */
export interface CartLine {
  productId: number
  quantity: number
  selected: boolean
}

const STORAGE_KEY = 'cart'

function loadFromStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is CartLine =>
        typeof x === 'object' &&
        x !== null &&
        typeof x.productId === 'number' &&
        typeof x.quantity === 'number' &&
        typeof x.selected === 'boolean'
    )
  } catch {
    return []
  }
}

function saveToStorage(items: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* 静默失败，容量满等情况不影响主流程 */
  }
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartLine[]>(loadFromStorage())

  // 任意变化都写回 localStorage
  watch(
    items,
    (v) => saveToStorage(v),
    { deep: true }
  )

  const totalCount = computed(() =>
    items.value.reduce((s, it) => s + it.quantity, 0)
  )

  const selectedCount = computed(() =>
    items.value.filter((it) => it.selected).reduce((s, it) => s + it.quantity, 0)
  )

  const allSelected = computed({
    get: () =>
      items.value.length > 0 && items.value.every((it) => it.selected),
    set: (val: boolean) => {
      items.value = items.value.map((it) => ({ ...it, selected: val }))
    }
  })

  function add(productId: number, quantity = 1) {
    const existing = items.value.find((it) => it.productId === productId)
    if (existing) {
      existing.quantity += quantity
    } else {
      items.value.push({ productId, quantity, selected: true })
    }
  }

  function setQuantity(productId: number, quantity: number) {
    const it = items.value.find((x) => x.productId === productId)
    if (it) it.quantity = Math.max(1, Math.min(99, quantity))
  }

  function remove(productId: number) {
    items.value = items.value.filter((it) => it.productId !== productId)
  }

  function clearSelected() {
    items.value = items.value.filter((it) => !it.selected)
  }

  function clear() {
    items.value = []
  }

  /** 取出当前选中的商品列表（按 store 顺序），供下单使用 */
  function selectedLines(): CartLine[] {
    return items.value.filter((it) => it.selected)
  }

  return {
    items,
    totalCount,
    selectedCount,
    allSelected,
    add,
    setQuantity,
    remove,
    clearSelected,
    clear,
    selectedLines
  }
})
