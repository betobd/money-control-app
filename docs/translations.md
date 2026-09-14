# Money Control — Translations

The interface ships in six languages: English (source), Spanish, Brazilian
Portuguese, French, German and Italian.

## How it works

- `src/i18n/locales/<language>/<namespace>.ts` holds one namespace per feature.
  English is the source; every other file is typed `typeof en`, so a key added in
  English fails type checking until all five translations exist.
- Messages are strings, or functions when they take values or need a plural:
  `deleteMessage: (name: string) => \`Delete ${name}?\``. Plurals use
  `createPlural(language)` from `src/i18n/plural.ts`.
- Components read the active catalog with `useMessages()` (re-renders on a
  language change). Code outside React calls `getMessages()` **when it builds the
  text**, never at module scope.
- Dates and month names use `getIntlLocale()`. Money grouping still follows the
  currency registry, not the language.
- The language follows the device unless the user picks one in More → Language or
  on the welcome screen. The preference lives in `expo-sqlite/kv-store`, outside
  the financial database and backups.
- Not translated on purpose: CSV column headers and file names (a stable,
  machine-readable format), backup JSON, developer logs, and technical errors
  that `toUserMessage` never shows.
- Default categories are seeded in the active language. Changing the language
  renames a default category only while its name is still one of the default
  translations, so a name the user edited is never touched.

## Tone

| Language | Address | Notes |
|---|---|---|
| Spanish | tú | Neutral Latin American vocabulary ("Agregar", "Movimientos") |
| Portuguese | você | Brazilian Portuguese |
| French | vous | |
| German | du | |
| Italian | tu | |

Keep button labels short: German and French run 30–40% longer than English.

## Glossary

| English | Español | Português | Français | Deutsch | Italiano |
|---|---|---|---|---|---|
| Transaction(s) | Movimiento(s) | Transação(ões) | Transaction(s) | Buchung(en) | Movimento/i |
| Account | Cuenta | Conta | Compte | Konto | Conto |
| Budget | Presupuesto | Orçamento | Budget | Budget | Budget |
| Monthly ceiling | Tope mensual | Teto mensal | Plafond mensuel | Monatslimit | Tetto mensile |
| Category | Categoría | Categoria | Catégorie | Kategorie | Categoria |
| Subcategory | Subcategoría | Subcategoria | Sous-catégorie | Unterkategorie | Sottocategoria |
| Income | Ingreso | Receita | Revenu | Einnahme | Entrata |
| Expense | Gasto | Despesa | Dépense | Ausgabe | Uscita |
| Transfer | Transferencia | Transferência | Virement | Umbuchung | Trasferimento |
| Refund | Reembolso | Reembolso | Remboursement | Erstattung | Rimborso |
| Void (verb) / Voided | Anular / Anulado | Anular / Anulada | Annuler / Annulée | Stornieren / Storniert | Annullare / Annullato |
| Archive | Archivar | Arquivar | Archiver | Archivieren | Archiviare |
| Balance | Saldo | Saldo | Solde | Saldo | Saldo |
| Opening balance | Saldo inicial | Saldo inicial | Solde initial | Anfangssaldo | Saldo iniziale |
| Net worth | Patrimonio neto | Patrimônio líquido | Patrimoine net | Nettovermögen | Patrimonio netto |
| Credit card | Tarjeta de crédito | Cartão de crédito | Carte de crédit | Kreditkarte | Carta di credito |
| Statement | Extracto | Fatura | Relevé | Abrechnung | Estratto conto |
| Minimum payment | Pago mínimo | Pagamento mínimo | Paiement minimum | Mindestzahlung | Pagamento minimo |
| Due date | Fecha de pago | Vencimento | Échéance | Fälligkeit | Scadenza |
| Current debt | Deuda actual | Dívida atual | Dette actuelle | Aktuelle Schuld | Debito attuale |
| Credit balance | Saldo a favor | Saldo credor | Solde créditeur | Guthaben | Saldo a credito |
| Recurring | Recurrente | Recorrente | Récurrent | Wiederkehrend | Ricorrente |
| Rule | Regla | Regra | Règle | Regel | Regola |
| Due (to post) | Pendiente | Pendente | À traiter | Fällig | Da registrare |
| Post (an occurrence) | Registrar | Lançar | Enregistrer | Buchen | Registrare |
| Skip | Omitir | Pular | Ignorer | Überspringen | Salta |
| Investment | Inversión | Investimento | Placement | Geldanlage | Investimento |
| Valuation | Valoración | Avaliação | Valorisation | Bewertung | Valutazione |
| Contribution | Aporte | Aporte | Versement | Einzahlung | Versamento |
| Withdrawal | Retiro | Resgate | Retrait | Auszahlung | Prelievo |
| Main (base) currency | Moneda principal | Moeda principal | Devise principale | Hauptwährung | Valuta principale |
| Exchange rate | Tasa de cambio | Taxa de câmbio | Taux de change | Wechselkurs | Tasso di cambio |
| Report | Informe | Relatório | Rapport | Bericht | Report |
| Backup | Copia de seguridad | Backup | Sauvegarde | Backup | Backup |
| Restore | Restaurar | Restaurar | Restaurer | Wiederherstellen | Ripristina |
| Export | Exportar | Exportar | Exporter | Exportieren | Esporta |
| App Lock | Bloqueo de la app | Bloqueio do app | Verrouillage de l'app | App-Sperre | Blocco app |
| PIN | PIN | PIN | code PIN | PIN | PIN |
| Notifications | Notificaciones | Notificações | Notifications | Mitteilungen | Notifiche |
