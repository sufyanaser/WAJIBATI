import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import {
  HomeIcon,
  BookIcon,
  BellIcon,
  SchoolIcon,
  ImportIcon,
  GraduationCapIcon,
  UsersIcon,
  FamilyIcon,
  CalendarIcon,
  ShieldIcon,
  LogOutIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  UploadIcon,
  KeyIcon,
  ListIcon,
  TableIcon,
  FileTextIcon,
  ImageIcon,
  PaperclipIcon,
  SendIcon,
  RefreshIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  MenuIcon,
  SettingsIcon,
} from '../Icons'

describe('Unified Icons Component Library', () => {
  const iconList = [
    { name: 'HomeIcon', Component: HomeIcon },
    { name: 'BookIcon', Component: BookIcon },
    { name: 'BellIcon', Component: BellIcon },
    { name: 'SchoolIcon', Component: SchoolIcon },
    { name: 'ImportIcon', Component: ImportIcon },
    { name: 'GraduationCapIcon', Component: GraduationCapIcon },
    { name: 'UsersIcon', Component: UsersIcon },
    { name: 'FamilyIcon', Component: FamilyIcon },
    { name: 'CalendarIcon', Component: CalendarIcon },
    { name: 'ShieldIcon', Component: ShieldIcon },
    { name: 'LogOutIcon', Component: LogOutIcon },
    { name: 'PlusIcon', Component: PlusIcon },
    { name: 'EditIcon', Component: EditIcon },
    { name: 'TrashIcon', Component: TrashIcon },
    { name: 'CheckIcon', Component: CheckIcon },
    { name: 'CloseIcon', Component: CloseIcon },
    { name: 'DownloadIcon', Component: DownloadIcon },
    { name: 'UploadIcon', Component: UploadIcon },
    { name: 'KeyIcon', Component: KeyIcon },
    { name: 'ListIcon', Component: ListIcon },
    { name: 'TableIcon', Component: TableIcon },
    { name: 'FileTextIcon', Component: FileTextIcon },
    { name: 'ImageIcon', Component: ImageIcon },
    { name: 'PaperclipIcon', Component: PaperclipIcon },
    { name: 'SendIcon', Component: SendIcon },
    { name: 'RefreshIcon', Component: RefreshIcon },
    { name: 'ChevronLeftIcon', Component: ChevronLeftIcon },
    { name: 'ChevronRightIcon', Component: ChevronRightIcon },
    { name: 'EyeIcon', Component: EyeIcon },
    { name: 'EyeOffIcon', Component: EyeOffIcon },
    { name: 'MenuIcon', Component: MenuIcon },
    { name: 'SettingsIcon', Component: SettingsIcon },
  ]

  it('renders all 32 icons with correct SVG attributes', () => {
    for (const { name, Component } of iconList) {
      const { container } = render(<Component />)
      const svg = container.querySelector('svg')
      expect(svg, `${name} should render an svg element`).not.toBeNull()
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(svg?.getAttribute('aria-hidden')).toBe('true')
      expect(svg?.getAttribute('fill')).toBe('none')
      expect(svg?.getAttribute('stroke')).toBe('currentColor')
      expect(svg?.classList.contains('wajibati-icon')).toBe(true)
    }
  })

  it('supports custom size and additional className', () => {
    const { container } = render(<HomeIcon size={28} className="custom-test-class" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('28')
    expect(svg?.getAttribute('height')).toBe('28')
    expect(svg?.classList.contains('custom-test-class')).toBe(true)
    expect(svg?.classList.contains('wajibati-icon')).toBe(true)
  })
})
