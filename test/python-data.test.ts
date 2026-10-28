import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PYTHON_DATA_PATH, pythonData } from '../scripts/python-data.ts'

describe('Python 패키지 데이터', () => {
  it('TypeScript 데이터와 같다 (다르면 npm run export:python)', () => {
    expect(readFileSync(PYTHON_DATA_PATH, 'utf8')).toBe(pythonData())
  })
})

describe('패키지 버전', () => {
  it('npm 과 PyPI 버전이 같다 (같은 Release 로 함께 배포)', () => {
    const npmVersion = JSON.parse(readFileSync('package.json', 'utf8')).version
    expect(readFileSync('python/pyproject.toml', 'utf8')).toContain(`version = "${npmVersion}"`)
    expect(readFileSync('python/src/korea_holidays/__init__.py', 'utf8')).toContain(`__version__ = "${npmVersion}"`)
  })
})
