# feature: app-shell — F7b

O "casco" do app (o que não é de uma rota): seletor de idioma, banner offline, registro do service
worker, cartão de instalação e a página offline. `app/[locale]/layout.tsx` compõe tudo por
`@/features/app-shell` (o `index.ts` é a API pública).

```
i18n/         pt-BR.ts (fonte, `AppShellMessages = typeof ptBR`) · en-US.ts (mesmo formato) · messages.ts (defineMessages)
hooks/        useAppShellMessages (dicionário do idioma da rota)
components/   LanguageSwitch (…, vão entrando OfflineBanner, ServiceWorkerRegistrar, InstallPromptCard, OfflinePage)
model/        regras puras (cache-rules, install-prompt, connectivity), 100% testáveis
```

- **Todo texto novo nasce em `i18n/`** (pt-BR é a fonte; en-US é obrigatório e a chave faltando é erro de compilação).
- **LanguageSwitch**: `<a>` (não `next/link`) com carga de documento. No servidor/hidratação o `href` é a home do outro idioma;
  depois de montar vira `switchLocalePath(target, window.location)` e é recalculado em hover/foco/toque. O clique grava o
  cookie `infotera-locale` e navega. Nada de `usePathname()` em render (rewrite do proxy ≠ pathname do navegador).
