---
description: Roda o pipeline completo de uma feature (planner → developer → qa → reviewer + security → correções → commits)
argument-hint: <id-da-feature, ex. F3 ou hotel-search>
---

Desenvolva a feature **$ARGUMENTS** seguindo o fluxo do `CLAUDE.md` raiz. Você é o orquestrador:
delegue aos agentes, não implemente você mesmo.

1. Confirme no `docs/TEST_MAP.md` que as dependências da feature estão prontas. Se não estiverem, pare e diga quais faltam.
2. **planner** → gera `docs/specs/<id>-<nome>.md`. Mostre ao usuário o resumo das decisões e siga.
3. **developer** → implementa a spec inteira e entrega com typecheck/lint/test verdes.
4. **qa** → escreve testes de componente/E2E e verifica a11y, mobile e cenários de erro da API.
5. **reviewer** e **security** em paralelo, sobre o mesmo diff.
6. Juntou achados bloqueantes/importantes (reviewer), crítico/alto (security) ou bugs bloqueantes (qa)?
   Mande todos de uma vez para o **developer** e repita os passos 4–5 só para o que mudou.
   Máximo 3 voltas; depois disso pare e apresente o impasse ao usuário.
7. Rode você mesmo `npm run typecheck && npm run lint && npm run test` e confira a saída.
8. Faça commits atômicos em Conventional Commits com escopo da feature (`feat(<nome>): ...`,
   `test(<nome>): ...`, `docs(<nome>): ...`) e faça push na branch de trabalho.
9. Responda com: critérios de aceite atendidos, decisões para o README, achados aceitos como dívida.
