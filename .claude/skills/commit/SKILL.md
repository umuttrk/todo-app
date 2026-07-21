# .claude/skills/commit/SKILL.md
---
name: commit
description: Staged değişiklikleri analiz edip conventional commit mesajı önerir
argument-hint: [mesaj-notu]
disable-model-invocation: true
---

## Commit Workflow

1. `git status` ve `git diff --cached` çalıştır
2. Değişiklikleri analiz et
3. Conventional commit mesajı öner: type(scope): description
4. Kullanıcı onaylarsa commit et
5. $ARGUMENTS varsa commit mesajına not olarak ekle