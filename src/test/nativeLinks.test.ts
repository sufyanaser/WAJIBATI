import { describe, it, expect } from 'vitest'
import { pathFromUniversalLink, createLinkDeduper } from '../services/native/links'

describe('pathFromUniversalLink', () => {
  it('maps allowed https links on the official host', () => {
    expect(pathFromUniversalLink('https://wajebati.app/')).toBe('/')
    expect(pathFromUniversalLink('https://wajebati.app/archive')).toBe('/archive')
    expect(pathFromUniversalLink('https://wajebati.app/archive/')).toBe('/archive')
    expect(pathFromUniversalLink('https://wajebati.app/timetable')).toBe('/timetable')
  })

  it('drops query and fragment so tokens never reach the router', () => {
    expect(pathFromUniversalLink('https://wajebati.app/login?token=abc#x')).toBe('/login')
  })

  it('rejects other hosts, schemes and lookalike domains', () => {
    expect(pathFromUniversalLink('https://evil.example/archive')).toBeNull()
    expect(pathFromUniversalLink('https://wajebati.app.evil.example/archive')).toBeNull()
    expect(pathFromUniversalLink('http://wajebati.app/archive')).toBeNull()
    expect(pathFromUniversalLink('capacitor://localhost/archive')).toBeNull()
  })

  it('rejects paths outside the allowlist, including admin routes', () => {
    expect(pathFromUniversalLink('https://wajebati.app/admin')).toBeNull()
    expect(pathFromUniversalLink('https://wajebati.app/admin/login')).toBeNull()
    expect(pathFromUniversalLink('https://wajebati.app/anything')).toBeNull()
  })

  it('returns null for malformed input', () => {
    expect(pathFromUniversalLink('not a url')).toBeNull()
  })
})

describe('createLinkDeduper', () => {
  it('suppresses the same URL inside the window and allows it after', () => {
    let t = 0
    const isNew = createLinkDeduper(1500, () => t)
    expect(isNew('https://wajebati.app/archive')).toBe(true)
    t = 500
    expect(isNew('https://wajebati.app/archive')).toBe(false)
    t = 2000
    expect(isNew('https://wajebati.app/archive')).toBe(true)
  })

  it('does not suppress a different URL', () => {
    let t = 0
    const isNew = createLinkDeduper(1500, () => t)
    expect(isNew('https://wajebati.app/archive')).toBe(true)
    expect(isNew('https://wajebati.app/timetable')).toBe(true)
  })
})
