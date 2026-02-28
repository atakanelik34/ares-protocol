# Governance Handoff Runbook (TR)

Durum tarihi: 27 Şubat 2026

## Kapsam
Bu runbook, deployer EOA’dan Timelock/Governor modeline yetki devrini kapsar.

Kullanım:
- Base Sepolia üzerinde pre-mainnet rehearsal
- Mainnet beyanı öncesi final authority handoff

Rationale: handoff operasyonel olarak kritik; deterministik script + doğrulama çıktısı zorunlu.

---

## Ön Koşullar
- Core kontratlar deploy edilmiş olmalı (`deploy/contracts/addresses.base-sepolia.json`)
- `BASE_SEPOLIA_RPC_URL` ayarlı olmalı
- `ARES_DEPLOYER_KEY` ayarlı olmalı
- Foundry + cast kurulu olmalı

---

## Adım 1) Governance Katmanını Deploy Et
Token adresini core deployment dosyasından okuyarak Timelock + Governor deploy et:

```bash
./deploy/contracts/deploy-governance-sepolia.sh
```

Çıktılar:
- `contracts/latest-governance.json`
- `deploy/contracts/governance.base-sepolia.json`

Parametreler:
- `GOVERNANCE_MIN_DELAY` (varsayılan: `2 days`)
- `GOVERNANCE_OPEN_EXECUTOR` (varsayılan: `true`)
- `GOVERNANCE_KEEP_BOOTSTRAP_ROLES` (varsayılan: `false`)
- `GOVERNANCE_RENOUNCE_TIMELOCK_ADMIN` (varsayılan: `false`)

Rationale: varsayılanlar rehearsal’da geri dönüş imkanı bırakır, Governor’ı proposer/canceller olarak kurar.

---

## Adım 2) Role Handoff Uygula
Core + adapter + token rolleri için handoff çalıştır:

```bash
./deploy/contracts/handoff-governance-sepolia.sh
```

Varsayılan politika konservatiftir (deployer rolleri korunur).
Hard handoff (mainnet’e yakın) için:

```bash
HANDOFF_KEEP_DEPLOYER_ADMIN=false \
HANDOFF_KEEP_DEPLOYER_GOVERNANCE=false \
HANDOFF_KEEP_DEPLOYER_MINTER=false \
HANDOFF_GRANT_TIMELOCK_MINTER=true \
HANDOFF_KEEP_DEPLOYER_TIMELOCK_ADMIN=false \
HANDOFF_KEEP_DEPLOYER_TIMELOCK_PROPOSER=false \
HANDOFF_KEEP_DEPLOYER_TIMELOCK_CANCELLER=false \
./deploy/contracts/handoff-governance-sepolia.sh
```

Rationale: iki fazlı yaklaşım rehearsal’da kilitlenme riskini azaltır; finalde sıkı devir sağlar.

---

## Adım 3) Governance State Doğrulaması
Governance state raporu üret:

```bash
node deploy/contracts/verify-governance-state.mjs --strict
```

Final cutover doğrulaması:

```bash
node deploy/contracts/verify-governance-state.mjs --strict --require-deployer-revoked
```

Beklenen:
- Governor, Timelock proposer/canceller rolüne sahip
- Timelock, managed kontratlarda admin/governance rolüne sahip
- Token admin (opsiyonel minter) Timelock’a devredilmiş
- Deployer rolleri kaldırılmış (`--require-deployer-revoked` kullanıldığında)

Canlı durum (Base Sepolia, 27 Şubat 2026):
- Hard handoff çalıştırıldı
- `docs/demo/governance-state-sepolia.json` üretildi
- `docs/demo/governance-state-sepolia-revoke-check.json` üretildi (strict revoke kontrolü geçiyor)
- Governance proposal smoke test üretildi:
  - `docs/demo/governance-proposal-smoke-sepolia.json`

---

## Handoff Kapsamındaki Kontratlar
- `AresRegistry`
- `AresARIEngine`
- `AresScorecardLedger`
- `AresDispute`
- `AresApiAccess`
- `ERC8004IdentityAdapter`
- `ERC8004ReputationAdapter`
- `ERC8004ValidationAdapter`
- `AresToken` (`DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`)

---

## Rollback & Güvenlik Notları
- Governance doğrulaması geçmeden deployer rolleri kaldırılmamalı.
- Rehearsal’da deployer Timelock admin kalmalı; hard cutover’da renounce edilmeli.
- Her handoff çalıştırması için JSON rapor arşivlenmeli.

TODO (mainnet politika kararı):
- `EXECUTOR_ROLE` açık (`address(0)`) mı kalacak, kısıtlı mı olacak?
- `MINTER_ROLE` sadece timelock’ta mı kalacak, treasury modülüyle mi bölünecek?

Rationale: bunlar teknik değil governance-policy kararlarıdır.
