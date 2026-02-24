# ARES Mimarisi

ARES, Base üzerinde ajan kimliği, skorlama ve güven kararları için bir altyapı primitifi sunar.

## Core ve adapter ayrımı
- ARES core kontratları, protokolün yerel mantığını uygular: stake-gated non-transferable AgentID, scorecard'lar, ARI, dispute ve governance.
- ERC-8004 birlikte çalışabilirliği **spec-accurate adapter** katmanı üzerinden sunulur.
- Adapter sahipliği hiçbir koşulda core authority'yi geçersiz kılamaz.

## Core modülleri
- `AresRegistry`: canonical `uint256` agent ID, non-transferable kimlik, operator hesap verebilirliği, çoklu wallet bağlantısı.
- `AresScorecardLedger`: 5 boyutta (her biri 0..200) source-of-truth aksiyon skor kaydı.
- `AresARIEngine`: fixed-point decay + volume confidence ile ARI hesaplama (0..1000).
- `AresDispute`: stake-weighted itiraz ve düzeltme akışı.
- `AresApiAccess`: opsiyonel ücretli API erişim extension'ı.

## ERC-8004 adapter modülleri
- `ERC8004IdentityAdapter`
- `ERC8004ReputationAdapter`
- `ERC8004ValidationAdapter`

Bu adapter'lar, keşif/entegrasyon senaryoları için ERC-8004 arayüz şeklini uygular. Yetkili durum kaynağı her zaman core state'tir.

## Authority sözleşmesi
- Core authority = `AresRegistry.operatorOf(agentId)` + staked durum.
- Adapter transferi yalnızca keşif/discovery metadata sinyalidir.
- `isDesynced(adapterAgentId)`, adapter owner ile core operator arasındaki uyumsuzluğu gösterir.

## ERC-8004 durum dili
ERC-8004, Ağustos 2025'te yayınlandı; şu anda draft/proposed aşamasında ve ekosistemde adoption artıyor.
