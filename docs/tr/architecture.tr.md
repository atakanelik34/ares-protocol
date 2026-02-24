# ARES Mimarisi

ARES, Base uzerinde agent kimligi, skorlama ve guven kararlarina odaklanan bir altyapi primitifi sunar.

## Core ve adapter ayrimi
- ARES core kontratlari protokolun yerel mantigini uygular: stake-gated non-transferable AgentID, scorecard, ARI, dispute ve governance.
- ERC-8004 birlikte calisabilirligi **spec-accurate adapter** katmani ile sunulur.
- Adapter sahipligi hicbir kosulda core authority'yi gecersiz kilmaz.

## Core modulleri
- `AresRegistry`: canonical `uint256` agent ID, non-transferable kimlik, operator hesap verebilirligi, coklu wallet baglantisi.
- `AresScorecardLedger`: 5 boyutta (her biri 0..200) source-of-truth aksiyon skor kaydi.
- `AresARIEngine`: fixed-point decay + volume confidence ile ARI hesaplama (0..1000).
- `AresDispute`: stake-weighted itiraz ve duzeltme akisi.
- `AresApiAccess`: opsiyonel ucretli API erisim extension'i.

## ERC-8004 adapter modulleri
- `ERC8004IdentityAdapter`
- `ERC8004ReputationAdapter`
- `ERC8004ValidationAdapter`

Bu adapter'lar, kesif/entegrasyon senaryolari icin ERC-8004 arayuz seklini uygular. Yetkili durum kaynagi her zaman core state'tir.

## Authority sozlesmesi
- Core authority = `AresRegistry.operatorOf(agentId)` + stake durumu.
- Adapter transferi sadece kesif/discovery metadata sinyalidir.
- `isDesynced(adapterAgentId)` ile adapter owner ve core operator farki gorulebilir.

## ERC-8004 status dili
ERC-8004, Agustos 2025'te yayinlandi. Su anda draft/proposed asamasinda ve ekosistemde adoption artmaktadir.
