const SLOT_MINUTES = 15

/** JS getDay(): 0=Sun → ISO 1=Mon … 7=Sun */
function jsDayToIso(jsDay) {
  return jsDay === 0 ? 7 : jsDay
}

function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function generateSlots(startTime, endTime) {
  const slots = []
  let current = parseTime(startTime)
  const end = parseTime(endTime)
  while (current + SLOT_MINUTES <= end) {
    slots.push(formatTime(current))
    current += SLOT_MINUTES
  }
  return slots
}

function combineDateAndSlot(dateStr, slotTime) {
  return `${dateStr}T${slotTime}:00`
}

module.exports = {
  SLOT_MINUTES,
  jsDayToIso,
  parseTime,
  formatTime,
  generateSlots,
  combineDateAndSlot,
}
