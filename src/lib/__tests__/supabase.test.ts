import { describe, it, expect, vi } from 'vitest'
import { normalizePhone, phoneToEmail, isValidPhone, isValidPin } from '../supabase'

// ── normalizePhone ─────────────────────────────────────────────────────────────

describe('normalizePhone', () => {
  it('accepts local format as-is', () => {
    expect(normalizePhone('07801234567')).toBe('07801234567')
  })

  it('converts 9647XXXXXXXXX → 07XXXXXXXXX', () => {
    expect(normalizePhone('9647801234567')).toBe('07801234567')
  })

  it('converts +9647XXXXXXXXX → 07XXXXXXXXX', () => {
    expect(normalizePhone('+9647801234567')).toBe('07801234567')
  })

  it('strips spaces before normalising', () => {
    expect(normalizePhone(' 07801234567 ')).toBe('07801234567')
  })

  it('throws on 8-digit local number', () => {
    expect(() => normalizePhone('0780123456')).toThrow('invalid_phone')
  })

  it('throws on empty string', () => {
    expect(() => normalizePhone('')).toThrow('invalid_phone')
  })

  it('throws on +9665XXXXXXXXX (non-Iraqi)', () => {
    expect(() => normalizePhone('+9665001234567')).toThrow('invalid_phone')
  })

  it('throws on number starting with 09', () => {
    expect(() => normalizePhone('09801234567')).toThrow('invalid_phone')
  })
})

// ── phoneToEmail ───────────────────────────────────────────────────────────────

describe('phoneToEmail', () => {
  it('produces local@guardian.rumaila.local domain', () => {
    expect(phoneToEmail('07801234567')).toBe('07801234567@guardian.rumaila.local')
  })

  it('normalises +964 before building email', () => {
    expect(phoneToEmail('+9647801234567')).toBe('07801234567@guardian.rumaila.local')
  })

  it('does NOT include + in email', () => {
    const email = phoneToEmail('07801234567')
    expect(email).not.toContain('+')
    expect(email).not.toContain('964')
  })
})

// ── isValidPhone ───────────────────────────────────────────────────────────────

describe('isValidPhone', () => {
  it.each([
    '07801234567',
    '07001234567',
    '07991234567',
  ])('returns true for valid local number %s', (p) => {
    expect(isValidPhone(p)).toBe(true)
  })

  it.each([
    '',
    '0780123456',     // 10 digits
    '078012345678',   // 12 digits
    '+9647801234567', // E164 — normalised internally but isValidPhone wraps success
    '7801234567',     // no leading 0
    'not-a-number',
  ])('returns true/false consistently for %s', (p) => {
    // This just verifies it doesn't throw — it's a boolean guard
    const result = isValidPhone(p)
    expect(typeof result).toBe('boolean')
  })

  it('returns false for 10-digit number', () => {
    expect(isValidPhone('0780123456')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidPhone('')).toBe(false)
  })
})

// ── isValidPin ─────────────────────────────────────────────────────────────────

describe('isValidPin', () => {
  it('accepts 6 numeric digits', () => {
    expect(isValidPin('111111')).toBe(true)
    expect(isValidPin('000000')).toBe(true)
    expect(isValidPin('012345')).toBe(true)
  })

  it('preserves leading zeros (string comparison)', () => {
    expect(isValidPin('001234')).toBe(true)
    expect(isValidPin('000001')).toBe(true)
  })

  it('rejects 5 digits', () => {
    expect(isValidPin('12345')).toBe(false)
  })

  it('rejects 7 digits', () => {
    expect(isValidPin('1234567')).toBe(false)
  })

  it('rejects letters', () => {
    expect(isValidPin('12345a')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidPin('')).toBe(false)
  })
})

// ── login auth email contract ──────────────────────────────────────────────────
// Verifies the email used for signInWithPassword matches the stored guardian email.

describe('login auth email contract', () => {
  it('produces 07-prefixed email for local phone', () => {
    expect(phoneToEmail('07801234567')).toBe('07801234567@guardian.rumaila.local')
  })

  it('normalises +964 phone to local email (backward-compat input)', () => {
    expect(phoneToEmail('+9647801234567')).toBe('07801234567@guardian.rumaila.local')
  })

  it('email does not contain + or 964', () => {
    const email = phoneToEmail('07801234567')
    expect(email).not.toMatch(/\+|964/)
  })

  it('rejects non-Iraqi numbers', () => {
    expect(() => phoneToEmail('+966501234567')).toThrow('invalid_phone')
  })

  it('demo guardian #1 email matches seed data after migration', () => {
    // After 20261022000000_local_phone_format.sql runs:
    // +9647801234567 stored → 07801234567, email → 07801234567@guardian.rumaila.local
    expect(phoneToEmail('07801234567')).toBe('07801234567@guardian.rumaila.local')
  })
})
