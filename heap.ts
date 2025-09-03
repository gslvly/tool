const heapify = <T>(arr: T[], key: (v: T) => number = (v) => v as number) => {
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
    down(arr, key, i)
  }
}
const down = <T>(arr: T[], key: (v: T) => number = (v) => v as number, i = 0) => {
  while (i * 2 + 1 < arr.length) {
    const n = key(arr[i])
    const l = key(arr[i * 2 + 1]) ?? Infinity
    const r = key(arr[i * 2 + 2]) ?? Infinity
    const min = Math.min(n, l, r)
    if (min === n) break

    const k = min === l ? i * 2 + 1 : i * 2 + 2
    ;[arr[i], arr[k]] = [arr[k], arr[i]]
    i = k
  }
}

const up = <T>(arr: T[], key: (v: T) => number = (v) => v as number, i = arr.length - 1) => {
  while (i > 0) {
    const n = key(arr[i]),
      pi = Math.floor((i - 1) / 2),
      p = key(arr[pi])
    if (n < p) {
      ;[arr[i], arr[pi]] = [arr[pi], arr[i]]
      i = pi
    } else {
      break
    }
  }
}

const push = <T>(arr: T[], value: T, key: (v: T) => number = (v) => v as number) => {
  arr.push(value)
  if (arr.length === 1) {
    return
  }
  up(arr, key, arr.length - 1)
}

const replace = <T>(arr: T[], value: T, key: (v: T) => number = (v) => v as number) => {
  const res = arr[0]
  arr[0] = value
  down(arr, key)
  return res
}

const pushPop = <T>(arr: T[], value: T, key: (v: T) => number = (v) => v as number) => {
  if (arr.length === 0 || key(value) <= key(arr[0])) return value
  const res = arr[0]
  replace(arr, value, key)
  return res
}

const pop = <T>(arr: T[], key: (v: T) => number = (v) => v as number) => {
  if (arr.length <= 1) return arr.pop()
  const res = arr[0]
  arr[0] = arr.pop()!
  down(arr, key)
  return res
}

export const heap = { pushPop, pop, push, replace, heapify }
