---
description: Roda o pipeline completo de uma feature (planner → ui-designer → developer → qa → reviewer + security + ux-reviewer → correções → commits)
argument-hint: <id-da-feature, ex. F3 ou hotel-search>
---

Desenvolva a feature **$ARGUMENTS** seguindo o fluxo do `CLAUDE.md` raiz. Você é o orquestrador:
delegue aos agentes, não implemente você mesmo.

1. Confirme no `docs/TEST_MAP.md` que as dependências da feature estão prontas. Se não estiverem, pare e diga quais faltam.
2. **planner** → gera `docs/specs/<id>-<nome>.md`. Mostre ao usuário o resumo das decisões e siga.
3. **ui-designer** → escreve a seção `## UI/UX` da spec (na F1, também `docs/design/design-system.md`).
   Pule só em features sem tela (ex.: F0).
4. **developer** → implementa a spec inteira e entrega com typecheck/lint/test verdes.
5. **qa** → escreve testes de componente/E2E e verifica a11y, mobile e cenários de erro da API.
6. **reviewer**, **security** e **ux-reviewer** em paralelo, sobre o mesmo diff.
7. Juntou achados bloqueantes/importantes (reviewer, ux-reviewer), crítico/alto (security) ou bugs
   bloqueantes (qa)? Mande todos de uma vez para o **developer** e repita os passos 5–6 só para o que mudou.
   Achado do ux-reviewer que contradiz a spec de UI volta para o **ui-designer** decidir antes.
   Máximo 3 voltas; depois disso pare e apresente o impasse ao usuário.
8. Rode você mesmo `npm run typecheck && npm run lint && npm run test` e confira a saída.
9. Faça commits atômicos em Conventional Commits com escopo da feature (`feat(<nome>): ...`,
   `test(<nome>): ...`, `docs(<nome>): ...`) e faça push na branch de trabalho.
   Sem `Co-Authored-By: Claude`, `Claude-Session:` ou qualquer atribuição de IA em commits e PRs.
10. Responda com: critérios de aceite atendidos, decisões para o README, achados aceitos como dívida.
