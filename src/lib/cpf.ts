export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function maskCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCpf(v: string) {
  const c = onlyDigits(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n: number) => { let sum = 0; for (let i = 0; i < n; i++) sum += +c[i] * (n + 1 - i); const r = (sum * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +c[9] && dv(10) === +c[10];
}
