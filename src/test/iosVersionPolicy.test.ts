import { describe, it, expect } from 'vitest'
import { compareVersions, evaluateIosPolicy, isSafeUpdateUrl } from '../services/native/iosVersionPolicy'

const URL_OK = 'https://wajebati.app/'

describe('compareVersions', () => {
  it('compares dotted versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0)
  })
})

describe('evaluateIosPolicy', () => {
  it('does not block when no minimum is configured', () => {
    expect(evaluateIosPolicy('1.0', {})).toEqual({ status: 'ok' })
  })

  it('does not block when minimum is set but update URL is missing', () => {
    expect(evaluateIosPolicy('1.0', { ios_min_version: '2.0.0' })).toEqual({ status: 'ok' })
  })

  it('does not block when update URL is not https', () => {
    expect(evaluateIosPolicy('1.0', { ios_min_version: '2.0.0', ios_update_url: 'http://wajebati.app/' })).toEqual({
      status: 'ok',
    })
  })

  it('blocks only when installed version is below the minimum and URL is valid', () => {
    expect(evaluateIosPolicy('1.0', { ios_min_version: '1.1.0', ios_update_url: URL_OK })).toEqual({
      status: 'update-required',
      minVersion: '1.1.0',
      updateUrl: URL_OK,
      currentVersion: '1.0',
    })
  })

  it('allows the installed version when it equals or exceeds the minimum', () => {
    expect(evaluateIosPolicy('1.1.0', { ios_min_version: '1.1', ios_update_url: URL_OK })).toEqual({ status: 'ok' })
    expect(evaluateIosPolicy('2.0', { ios_min_version: '1.1.0', ios_update_url: URL_OK })).toEqual({ status: 'ok' })
  })

  it('ignores malformed minimum or current versions', () => {
    expect(evaluateIosPolicy('1.0', { ios_min_version: 'latest', ios_update_url: URL_OK })).toEqual({ status: 'ok' })
    expect(evaluateIosPolicy('beta', { ios_min_version: '2.0', ios_update_url: URL_OK })).toEqual({ status: 'ok' })
  })
})

describe('isSafeUpdateUrl', () => {
  it('accepts only https URLs', () => {
    expect(isSafeUpdateUrl('https://wajebati.app/')).toBe(true)
    expect(isSafeUpdateUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUpdateUrl('not a url')).toBe(false)
  })
})
