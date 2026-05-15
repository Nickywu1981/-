---
name: test-generator
description: Read source file → auto-generate unit test skeleton with edge case coverage
type: skill
source: community-import
---

# Test Generator

> 读取源文件自动生成单元测试骨架，覆盖正常路径 + 边界值 + 错误路径。

## TRIGGER
当用户请求 "generate tests"、"生成测试"、"补测试"、或新增 Service/Util/Store/Composable 时。

## 生成规则

### Service 测试
```typescript
// 每个 public 方法生成 3 类测试：
describe('serviceName', () => {
  it('should return expected result given valid input')
  it('should throw/handle error when dependency fails')
  it('should handle edge case: null/undefined/empty input')
})
```

### Store 测试 (Pinia)
```typescript
describe('storeName', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('should initialize with default state')
  it('should update state when action succeeds')
  it('should handle error state when action fails')
  it('getter should derive correct value')
})
```

### Utils 测试
```typescript
describe('utilFunction', () => {
  it('should return expected output for normal input')
  it('should return default/fallback for edge input')
  it('should not throw for unexpected input types')
})
```

### Composable 测试 (Vue)
```typescript
describe('useComposable', () => {
  it('should return reactive refs')
  it('should update refs when parameters change (watchEffect)')
  it('should cleanup on unmount')
})
```

## 执行步骤
1. 读取源文件 → 识别 `export function` / `export class` / `useXxxStore` / `useXxx` 模式
2. 根据类型选择对应的测试模板
3. 生成 `__tests__/fileName.test.ts`
4. 填充正常输入/边界值/错误路径三个场景
5. `npm run test -- fileName.test.ts` 确认通过

## 验收标准
- [ ] 每个 public 函数/方法至少有 1 个 happy-path 测试
- [ ] 每个有参数验证的函数有边界值测试
- [ ] 每个有异步调用的函数有 error 路径测试
- [ ] `npm run test` 全部通过
