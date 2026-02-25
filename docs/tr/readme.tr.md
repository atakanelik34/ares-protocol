# ⚔ ARES Protocol

![CI](https://img.shields.io/github/actions/workflow/status/atakanelik34/ares-protocol/ci.yml?branch=main)
![License](https://img.shields.io/github/license/atakanelik34/ares-protocol)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)
![Node](https://img.shields.io/badge/Node-18+-green)
![Base](https://img.shields.io/badge/Network-Base-0052FF)

> Otonom AI ajanları için Base-native itibar altyapısı.

ARES (Autonomous Reputation & Evaluation Scoring), Base üzerinde çalışan AI ajanları için standart ve programlanabilir bir güven katmanı sunar.

ARES bir uygulama değildir.  
Ajan ekonomisi için bir altyapı primitifi olarak tasarlanmıştır.

---

## 🌐 Problem

Otonom AI ajanları artık:

- İşlem yürütüyor  
- Sermaye yönetiyor  
- Protokoller arası koordinasyon sağlıyor  
- Diğer ajanlarla etkileşime giriyor  

Ancak bu davranışları yöneten canonical bir itibar primitifi yok.

Protokoller şu sorulara güvenilir cevap veremiyor:

- Bu ajan güvenilir mi?
- Geçmişinde dispute var mı?
- Kötü niyetli davranış paterni gösteriyor mu?
- Bu ajana yürütme izni verilmeli mi?

Web4 için programlanabilir güven gerekiyor.

---

## 🔐 Çözüm — ARI (Agent Reputation Index)

ARES, **ARI** adı verilen 0–1000 arası bileşik bir itibar skoru getirir.

ARI hesaplamasında kullanılan başlıca sinyaller:

- Action validity ratio
- Dispute sonuçları
- Volume confidence ağırlıklandırması
- Time-decay mekanikleri
- Davranış metrikleri

ARI şunları sağlar:

- Deterministik hesaplama
- On-chain doğrulanabilirlik
- Dispute-farkındalığı
- Programlanabilir entegrasyon

Protokoller şunları yapabilir:

- Minimum ARI eşiği tanımlamak
- Solidity ile ARI sorgulamak
- REST API ile ARI sorgulamak
- Kötü niyetli ajanları otomatik engellemek

Böylece ARES programlanabilir bir itibar primitifi haline gelir.

---

## 🏗 Mimari Genel Bakış

ARES üç ana katmandan oluşur:

### 1️⃣ ARES Core

- Non-transferable canonical AgentID (`uint256`)
- Scorecard ledger
- ARI Engine (time-decay + volume confidence)
- Dispute mekanizması

### 2️⃣ ERC-8004 Adapter Layer

- Spec-accurate identity adapter
- Reputation adapter
- Validation adapter
- Snapshot-pinned interface uyumluluğu

### 3️⃣ Access & Integration Layer

- Fastify tabanlı Query Gateway
- Subgraph indexing (core + adapter event'leri)
- Paid API extension
- TypeScript ve Python SDK'lar

Mimari dokümantasyon:  
`/docs/tr/architecture.tr.md`

---

## 🌐 Canlı Linkler

- Website: https://ares-protocol.xyz  
- API: https://api.ares-protocol.xyz/v1/health  
- Docs: https://ares-protocol.xyz/docs/  
- Network: Base  

Base Batches başvurusu için execution hedef dokümanı:  
`/docs/base-batches-003-execution.md`

---

## 🎯 Base Batches 003 Başvuru Paketi

- Light paper: `/docs/submission/base-batches-003-light-paper.md`
- Demo video script: `/docs/submission/base-batches-003-demo-video-script.md`
- Link pack (contracts + API + proof): `/docs/submission/base-batches-003-link-pack.md`
- Demo hub: `/docs/demo/base-batches-003-demo.html`
- Demo proof JSON: `/docs/demo/sepolia-demo-proof.json`

---

## 💰 Ekonomik Model

`$ARES` token, protokolü şu kullanım alanlarıyla güvence altına alır:

- Agent kayıt staking'i  
- Dispute katılımı ve slashing  
- Governance parametre kontrolü  
- API access ödemeleri  

İtibar verisinin zamanla birikmesi, güçlü bir veri hendek etkisi ve ağ etkisi üretir.

---

## ⚙️ Quickstart (Local Development)

## 1. Repoyu klonla

   ```bash
   git clone https://github.com/atakanelik34/ares-protocol.git
   cd ares-protocol
```

## 2. Bağımlılıkları kur

```bash
npm install
```

## 3. Smart contract testleri

```bash
cd contracts
forge test
```

## 4. Query gateway (API) başlat

```bash
cd api/query-gateway
npm run dev
```

## 5. Subgraph build

```bash
cd subgraph
npm run codegen
npm run build
```

## 6. Base Sepolia deploy
```bash
npm run deploy:contracts:sepolia
```

---

## 🛡 Güvenlik

Governance kontrollü parametre güncellemeleri

EIP-712 signer doğrulaması

Fixed-point decay matematiği

ERC-8004 uyumluluk testleri

Güvenlik denetimleri (plan: Q3 2026)

Bug bounty (plan)

## 🗺 Yol Haritası

Q2 2026 — Base Sepolia launch

Q3 2026 — Mainnet deployment + $ARES

Q4 2026 — Dispute layer activation

2027 — Superchain expansion

## 🤝 Katkı

Pull request katkılarına açığız.
Büyük mimari değişiklikler için önce issue açarak tartışma başlatmanız önerilir.

## 📬 İletişim

contact@ares-protocol.xyz

Twitter/X: https://x.com/aresprotocol

Discord: https://discord.gg/aresprotocol

© 2026 ARES Protocol
