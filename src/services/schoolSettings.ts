import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface SchoolSettings {
  name: string
  directorate: string
  governorate: string
  location: string
  ministry: string
  country: string
  contact: string
  logoUrl: string
  disclaimer: string
}

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  name: 'إعدادية الرميلة للبنين',
  directorate: 'المديرية العامة لتربية الأنبار',
  governorate: 'الأنبار',
  location: 'الرمادي - الرميلة',
  ministry: 'وزارة التربية',
  country: 'جمهورية العراق',
  contact: '+9647811205700',
  logoUrl: '/icon-192.png',
  disclaimer: 'مسؤول إدخال البيانات والواجبات: إدارة المدرسة',
}

const STORAGE_KEY = 'wajibati_school_settings'

let cachedSettings: SchoolSettings = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return { ...DEFAULT_SCHOOL_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {}
  return DEFAULT_SCHOOL_SETTINGS
})()

const listeners = new Set<(settings: SchoolSettings) => void>()

function notify(settings: SchoolSettings) {
  cachedSettings = settings
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {}
  listeners.forEach(fn => fn(settings))
}

export async function fetchSchoolSettings(): Promise<SchoolSettings> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'school')
      .maybeSingle()

    if (!error && data?.value && typeof data.value === 'object') {
      const merged: SchoolSettings = {
        ...DEFAULT_SCHOOL_SETTINGS,
        ...(data.value as Partial<SchoolSettings>),
      }
      notify(merged)
      return merged
    }
  } catch (err) {
    console.warn('[SchoolSettings] Fallback to cached/default settings:', err)
  }
  return cachedSettings
}

export async function saveSchoolSettings(updated: Partial<SchoolSettings>): Promise<{ success: boolean; error?: string }> {
  const merged: SchoolSettings = { ...cachedSettings, ...updated }
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'school',
        value: merged,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error
    notify(merged)
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'تعذر حفظ الإعدادات'
    return { success: false, error: msg }
  }
}

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolSettings>(cachedSettings)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listeners.add(setSettings)
    setLoading(true)
    fetchSchoolSettings().finally(() => setLoading(false))

    return () => {
      listeners.delete(setSettings)
    }
  }, [])

  return {
    settings,
    loading,
    saveSettings: saveSchoolSettings,
  }
}
