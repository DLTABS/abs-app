// Tính ngày hạn thực tế cho 1 task: clamp về số ngày thực có của tháng (vd ngày 30
// ở tháng 2 -> ngày 28/29), sau đó nếu rơi vào Chủ nhật thì dời sang thứ 2 tuần kế
// (nhân viên không cần làm/nộp việc vào Chủ nhật).
export function effectiveDeadlineDate(year, month, deadlineDay) {
  const lastDay = new Date(year, month, 0).getDate()
  const date = new Date(year, month - 1, Math.min(deadlineDay, lastDay))
  if (date.getDay() === 0) date.setDate(date.getDate() + 1) // Chủ nhật (0) -> thứ 2
  return date
}
