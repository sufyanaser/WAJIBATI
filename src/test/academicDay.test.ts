import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getBaghdadParts,
  calculateSmartAcademicDay,
  computeNextNoonDelayMs,
} from '../lib/academicDay'

describe('Academic Day & 12:00 PM Baghdad Noon Transition', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Smart Day Calculation Table', () => {
    // Sun(0) to Wed(3) before 12:00 -> same day
    it('returns Sunday(0) on Sunday before 12:00 PM', () => {
      expect(calculateSmartAcademicDay(0, 8, 30)).toBe(0)
      expect(calculateSmartAcademicDay(0, 11, 59)).toBe(0)
    })

    // Sun(0) at/after 12:00 -> Monday(1)
    it('transitions to Monday(1) on Sunday at exactly 12:00 PM and after', () => {
      expect(calculateSmartAcademicDay(0, 12, 0)).toBe(1)
      expect(calculateSmartAcademicDay(0, 14, 15)).toBe(1)
      expect(calculateSmartAcademicDay(0, 23, 59)).toBe(1)
    })

    // Mon(1)
    it('calculates Monday transitions correctly', () => {
      expect(calculateSmartAcademicDay(1, 11, 59)).toBe(1)
      expect(calculateSmartAcademicDay(1, 12, 0)).toBe(2) // Tuesday
    })

    // Tue(2)
    it('calculates Tuesday transitions correctly', () => {
      expect(calculateSmartAcademicDay(2, 9, 0)).toBe(2)
      expect(calculateSmartAcademicDay(2, 12, 0)).toBe(3) // Wednesday
    })

    // Wed(3)
    it('calculates Wednesday transitions correctly', () => {
      expect(calculateSmartAcademicDay(3, 11, 59)).toBe(3)
      expect(calculateSmartAcademicDay(3, 12, 0)).toBe(4) // Thursday
    })

    // Thu(4)
    it('handles Thursday morning and afternoon roll to Sunday', () => {
      expect(calculateSmartAcademicDay(4, 8, 0)).toBe(4)  // Thursday before noon
      expect(calculateSmartAcademicDay(4, 11, 59)).toBe(4)
      expect(calculateSmartAcademicDay(4, 12, 0)).toBe(0)  // Roll to next Sunday
      expect(calculateSmartAcademicDay(4, 18, 0)).toBe(0)
    })

    // Fri(5) & Sat(6) - Weekend always displays Sunday opening week
    it('handles Friday and Saturday weekend rules', () => {
      expect(calculateSmartAcademicDay(5, 10, 0)).toBe(0) // Friday morning -> Sunday
      expect(calculateSmartAcademicDay(5, 15, 0)).toBe(0) // Friday afternoon -> Sunday
      expect(calculateSmartAcademicDay(6, 9, 0)).toBe(0)  // Saturday morning -> Sunday
      expect(calculateSmartAcademicDay(6, 20, 0)).toBe(0) // Saturday night -> Sunday
    })
  })

  describe('Transitions across 11:59:59, 12:00:00, and 12:00:01 with Fake Timers', () => {
    it('transitions exactly at the boundary using Baghdad time mock', () => {
      // 2026-11-01 is Sunday
      // Set to 11:59:59 Baghdad time (08:59:59 UTC)
      const t1 = new Date('2026-11-01T08:59:59.000Z')
      vi.setSystemTime(t1)
      const p1 = getBaghdadParts(t1)
      expect(p1.hour).toBe(11)
      expect(p1.minute).toBe(59)
      expect(calculateSmartAcademicDay(p1.weekdayIndex, p1.hour, p1.minute)).toBe(0) // Sunday

      // Advance 1 second -> 12:00:00 Baghdad time (09:00:00 UTC)
      vi.advanceTimersByTime(1000)
      const now2 = new Date()
      const p2 = getBaghdadParts(now2)
      expect(p2.hour).toBe(12)
      expect(p2.minute).toBe(0)
      expect(calculateSmartAcademicDay(p2.weekdayIndex, p2.hour, p2.minute)).toBe(1) // Monday

      // Advance 1 minute -> 12:01:00 Baghdad time (09:01:00 UTC)
      vi.advanceTimersByTime(60000)
      const now3 = new Date()
      const p3 = getBaghdadParts(now3)
      expect(p3.hour).toBe(12)
      expect(p3.minute).toBe(1)
      expect(calculateSmartAcademicDay(p3.weekdayIndex, p3.hour, p3.minute)).toBe(1) // Monday
    })
  })

  describe('Next Noon Delay Computation', () => {
    it('computes accurate ms delay when morning', () => {
      // 10:00:00 AM Baghdad time (07:00:00 UTC)
      const morning = new Date('2026-11-01T07:00:00.000Z')
      const delay = computeNextNoonDelayMs(morning)
      // 2 hours = 7200 seconds = 7,200,000 ms
      expect(delay).toBe(7200000)
    })

    it('computes delay to next day noon when afternoon', () => {
      // 02:00:00 PM Baghdad time (11:00:00 UTC)
      const afternoon = new Date('2026-11-01T11:00:00.000Z')
      const delay = computeNextNoonDelayMs(afternoon)
      // 10 hours until midnight + 12 hours until noon = 22 hours = 79,200,000 ms
      expect(delay).toBe(79200000)
    })
  })
})
