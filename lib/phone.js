// Chuẩn hóa số điện thoại VN về dạng E.164 (VD: "0901234567" -> "+84901234567")
// để lưu vào field `phone` thật của Supabase Auth (hiện ở cột "Phone" trong Users).
export function toE164VN(phone) {
  if (!phone) return null
  const trimmed = String(phone).trim()
  if (trimmed.startsWith('+')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('84')) return '+' + digits
  if (digits.startsWith('0')) return '+84' + digits.slice(1)
  return '+84' + digits
}
