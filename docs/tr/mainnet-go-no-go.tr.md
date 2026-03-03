# ARES Mainnet Go/No-Go Checklist (TR)

Durum tarihi: 2 Mart 2026  
Mevcut aşama: Base Sepolia üzerinde testnet-live altyapı

## Amaç
Bu checklist, Base mainnet çıkışı için zorunlu kapıları tanımlar.  
Herhangi bir **Kritik Kapı** tamamlanmadan durum **No-Go**’dur.

Rationale: “özellik var” yaklaşımı yerine governance + security + operasyon kanıtı ile çıkış.

---

## Kapı 1: Governance Otoritesi (Kritik)
- [ ] Timelock + Governor deploy/verify tamam.
- [ ] Conservative governance profili deploy edildi (`proposalThreshold=1,000,000 ARES`, `quorum=6%`, `timelock>=48h`).
- [ ] Core/admin kontratlarda yetki Timelock’a devredildi (`DEFAULT_ADMIN_ROLE` + `GOVERNANCE_ROLE`).
- [ ] Token admin yetkisi Timelock’a devredildi.
- [ ] Timelock proposer/canceller rolleri Governor’a verildi.
- [ ] Bootstrap deployer yetkileri launch politikasına göre kaldırıldı.
- [ ] Governance state raporu üretildi ve arşivlendi.

Kanıt:
- `deploy/contracts/governance.base-sepolia.json`
- `deploy/contracts/verify-governance-state.mjs` çıktısı

Rationale: mainnet kontrolü deployer EOA’da değil, timelock’lu governance executor’da olmalı.

---

## Kapı 2: Security Hazırlığı (Kritik)
- [ ] Harici audit tamamlandı.
- [ ] High/Critical bulgular tamamen kapatıldı.
- [ ] Foundry testleri tam yeşil (`forge test`) (adapter + dispute + ARI correction dahil).
- [ ] Kritik modüllerde fuzz/invariant kapsamı tamamlandı.
- [ ] API replay koruması doğrulandı (nonce TTL + tek kullanımlık).

Rationale: mainnet riski en çok yetki ve ekonomik saldırı yüzeyinden gelir.

---

## Kapı 3: Operasyon & Güvenilirlik (Kritik)
- [ ] Production runbook’lar final (incident, rollback, key compromise).
- [ ] Monitoring + alerting aktif (API, explorer, chain RPC, DB).
- [ ] Backup/restore tatbikatı yapıldı.
- [ ] Rate limit + abuse kontrolleri production konfigürasyonunda doğrulandı.

Rationale: launch riski sadece kontrat hatası değil, operasyonel kırılmalar da içerir.

---

## Kapı 4: Data Plane Bütünlüğü (Kritik)
- [ ] Subgraph ve API çıktıları leaderboard/score/actions/disputes için tutarlı.
- [ ] Explorer canlı + geçmiş veriyi canonical pipeline’dan gösteriyor.
- [ ] Demo/test veri ile production policy ayrımı net.

Rationale: trust protokolü tüm entegrasyon yüzeylerinde tutarlı veri vermelidir.

---

## Kapı 5: Token/TGE Finalizasyonu (Mainnet Öncesi Kritik)
- [ ] Mainnet supply + distribution politikası kilitlendi.
- [ ] Single-vault launch topolojisi kilitlendi ve kanıtlandı.
- [ ] Vesting/distributor kontratları final (kullanılıyorsa).
- [ ] Governance onaylı fee policy (burn/treasury/validator split) doğrulandı.
- [ ] Public dokümanlar on-chain parametrelerle birebir hizalı.

Rationale: belirsiz token ekonomisi ile mainnet çıkışı yapılmamalı.

---

## Base Batches Başvurusu Öncesi Kapsam
9 Mart 2026 başvuru penceresi için hedef:
- **Testnet-live kanıtta Go**.
- **Mainnet launch’ta No-Go** (Kapı 1–5 tamamlanana kadar).

Rationale: en güçlü pozisyon, kanıtlanmış testnet traction + mainnet’e gated geçiş planıdır.

---

## Güncel Snapshot (2 Mart 2026)
- Testnet altyapı: **Live**
- Base Sepolia kontratlar: **Live**
- Base Sepolia governance katmanı: **Timelock + Governor deploy/verify tamam**
- Uygulanan handoff modu: **Hard handoff tamam** (deployer rolleri kaldırıldı; strict `--require-deployer-revoked` doğrulaması geçiyor)
- Governance smoke test: **On-chain proposal oluşturuldu** (kanıt private operational records içinde arşivlenmiştir)
- Demo dataset: **40 agent / 500 action / 20 dispute**
- Production recovery project: **`<YOUR_GCP_PROJECT>`**
- Production recovery VM: **`ares-vm-01`**
- DNS/SSL cutover: **Tamam**
- Legacy compromise olmuş projeler: **Silindi**
- Monitoring/alerting: **Konfigüre edildi** (notification email verification bekliyor)
- Secret rotation: **Production host üzerinde tamamlandı**
- Kabul edilen mainnet governance hedefi: **Conservative (`1M threshold / 6% quorum / 48h timelock`)**
- Kabul edilen mainnet dispute window hedefi: **14 gün**
- Mainnet beyanı: **No-Go** (external audit, final authority freeze, token finality execution proof seti ve launch signoff bekliyor)
