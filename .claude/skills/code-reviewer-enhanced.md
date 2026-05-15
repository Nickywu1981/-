---
name: code-reviewer-enhanced
description: Enhanced code reviewer — auto-detect SQL injection, hardcoded secrets, dead code, XSS vectors, naming violations
type: skill
source: community-import
---

# Enhanced Code Reviewer

## TRIGGER
When user requests "review", "code review", or pre-commit self-check.

## Detection Checklist

### 1. SQL Injection
- String concatenation SQL in DAO files
- User input spliced to SQL in Controllers
- Recommend parameterized queries or ORM

### 2. Hardcoded Secrets
- password=/secret=/apiKey=/token= patterns
- AWS/Azure/GCP key format leaks
- Replace with process.env.XXX

### 3. Dead Code
- Exported but never imported functions/classes
- Imported but unused dependencies
- Empty event handlers, unused computed/watch

### 4. XSS Vectors
- v-html usage without sanitization
- innerHTML/outerHTML/document.write calls

### 5. Naming Violations
- DAO: camelCase + Dao suffix
- Controller: kebab-case routes + Controller suffix
- Vue: PascalCase components + camelCase composable

## Acceptance Criteria
- [ ] No SQL injection vulnerabilities
- [ ] No hardcoded secrets in source
- [ ] Dead code removed or documented
- [ ] v-html sanitized or replaced
- [ ] Naming conventions compliant
