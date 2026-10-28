// 사용법: npm run export:python
import { writeFileSync } from 'node:fs'
import { PYTHON_DATA_PATH, pythonData } from './python-data.ts'

writeFileSync(PYTHON_DATA_PATH, pythonData())
console.log(`wrote ${PYTHON_DATA_PATH}`)
