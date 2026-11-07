import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listenForUniversalLinks } from '../services/native/links'

/** Routes Universal Link opens (native only) to in-app guardian pages. Renders nothing. */
export default function NativeLinkBridge() {
  const navigate = useNavigate()
  useEffect(() => listenForUniversalLinks(path => navigate(path)), [navigate])
  return null
}
