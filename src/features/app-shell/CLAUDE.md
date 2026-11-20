# feature: app-shell — F7b

O "casco" do app (o que não é de uma rota): seletor de idioma, banner offline, registro do service
worker, cartão de instalação e a página offline. `app/[locale]/layout.tsx` compõe tudo por
`@/features/app-shell` (o `index.ts` é a API pública).

```
i18n/         pt-BR.ts (fonte, `AppShellMessages = typeof ptBR`) · en-US.ts (mesmo formato) · messages.ts (defineMessages)
hooks/        useAppShellMessages (dicionário do idioma da rota)
components/   LanguageSwitch · OfflineBanner · ServiceWorkerRegistrar · InstallPromptCard · OfflinePage
hooks/        useAppShellMessages · useConnectivityView · useInstallPrompt
model/        regras puras (cache-rules, install-prompt, connectivity), 100% testáveis
store/        install-store (evento `beforeinstallprompt` + `installed`)
worker/       sw.ts (service worker; só importa `model/cache-rules` e `shared/i18n/paths`)
```

- **Todo texto novo nasce em `i18n/`** (pt-BR é a fonte; en-US é obrigatório e a chave faltando é erro de compilação).
- **LanguageSwitch**: `<a>` (não `next/link`) com carga de documento. No servidor/hidratação o `href` é a home do outro idioma;
  depois de montar vira `switchLocalePath(target, window.location)` e é recalculado em hover/foco/toque. O clique grava o
  cookie `infotera-locale` e navega. Nada de `usePathname()` em render (rewrite do proxy ≠ pathname do navegador).
- **OfflineBanner**: `useConnectivityView` (`connectivityView(prev, online)` + 4 s de "Conexão restabelecida."); região `role="status"` sempre montada, em fluxo
  abaixo do header (nunca sticky).
- **Service worker**: `worker/sw.ts` (Serwist; compilado por esbuild em `app/serwist/[path]/route.ts`, servido em `/serwist/sw.js` com `no-cache` e
  `Service-Worker-Allowed: /`). A estratégia de cada request vem de `model/cache-rules.ts` (`cacheRuleFor`, allowlist de rotas): rotas privadas
  (`/checkout`, `/confirmation/*`, `/my-bookings`, com ou sem `/en`) **nunca** gravam; a API fica fora (o dado offline vem do persister do TanStack).
  Caches `pages-*`/`pages-rsc-*`/`static-*` levam o build no nome e o `activate` apaga os antigos. `skipWaiting: false`.
- **ServiceWorkerRegistrar** (só em produção): registra, avisa "Nova versão disponível." (toast `persistent`, chave `app-update`; **não aparece em `/checkout`**: fica pendente até a próxima rota, `canShowUpdateToast`) e "Atualizar agora" manda `SKIP_WAITING` e recarrega no
  `controlling`. Também importa `store/install-store` (o listener de `beforeinstallprompt`/`appinstalled` fica no escopo do módulo) e mostra "App instalado.".
- **InstallPromptCard** (home): `installPromptView` (`show` só com evento, fora do standalone e sem dispensa nos últimos 30 dias); "Agora não" grava
  `infotera:install-dismissed-at` (ISO).
- **OfflinePage** (`variant`: `public` · `checkout` · `bookings`; rotas `/offline`, `/offline/checkout`, `/offline/bookings` e as de `/en`): estáticas, as seis
  no precache (`OFFLINE_PATHS` em `shared/i18n/paths`); o SW escolhe pela rota com `offlinePathFor` (checkout → `checkout`, confirmação e histórico → `bookings`, o resto → `public`).
  O h1 nunca repete o banner. O proxy não aplica o cookie de idioma nessas rotas (o precache usa a URL pt-BR).
- **InstallPromptCard**: "Instalar app" é `secondary`; qualquer saída do cartão (`useFocusSearchOnExit`, efeito de layout) leva o foco a "Buscar hotéis"; a região `role="status"`
  fica sempre montada fora do cartão e anuncia a dispensa; `dismissed` do prompt nativo vale como "Agora não".
- **Header**: breakpoint `xs` = 25rem; abaixo dele o logo é só "Infotera" e o seletor mostra "EN"/"PT" (nome acessível "EN English", sem `aria-label`).
