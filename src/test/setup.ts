import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { Blob, File } from 'node:buffer'

Object.defineProperty(globalThis, 'Blob', { configurable: true, value: Blob })
Object.defineProperty(globalThis, 'File', { configurable: true, value: File })
