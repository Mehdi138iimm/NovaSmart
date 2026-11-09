/** Heuristic filter: avoids storing passwords, tokens, card numbers and private keys without consent. */
export function looksSensitive(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t)) return true;
  if (/\b(password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]/i.test(t)) return true;
  if (/^(sk-|sk_live|pk_live|ghp_|gho_|github_pat_|xox[bap]-|AIza|AKIA|eyJ[A-Za-z0-9_-]{10,}\.)/.test(t)) return true;
  const digits = t.replace(/[\s-]/g, "");
  if (/^\d{13,19}$/.test(digits) && luhn(digits)) return true;
  // Single "word" that mixes letters, digits and symbols — typical of a copied password.
  if (t.length >= 8 && t.length <= 64 && !/\s/.test(t) && /[a-z]/.test(t) && /[A-Z]/.test(t) && /\d/.test(t) && /[^A-Za-z0-9]/.test(t) && !/^https?:\/\//i.test(t)) return true;
  return false;
}

function luhn(d: string) {
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
