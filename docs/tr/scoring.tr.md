# ARI Skorlama Modeli

## Sabit model (değiştirilemez)
- Boyut sayısı: 5
- Ağırlıklar: `[0.30, 0.25, 0.20, 0.15, 0.10]`
- `dimension_score` aralığı: `0..200`
- `time_decay = exp(-lambda * days_since_action)`
- `volume_confidence = min(1, valid_actions_count / 100)`
- Final ARI aralığı: `0..1000`

## Engine state
Her agent için:
- `decayedSum[5]`
- `lastUpdate`
- `totalActionsCount`
- `validActionsCount`
- `firstActionAt`

## Fixed-point decay implementasyonu
- 1e18 fixed-point çarpanları kullanılır.
- Temel ufuk için `precomputedDecay[d]` kullanılır.
- Büyük `d` değerlerinde, precision kaybını ve cap hatalarını önlemek için chunked exponentiation kullanılır.
- Deterministik DoS-güvenli davranış için `daysSince`, `MAX_DAYS_SATURATION` (varsayılan 10000) ile saturate edilir.

## Güncelleme akışı
Yeni geçerli aksiyon skoru geldiğinde:
1. Geçen süre decay'ini uygulamak için `sync(agent)` çalışır.
2. Her boyutta `scores[d]`, `decayedSum[d]` üzerine eklenir.
3. `totalActionsCount` ve `validActionsCount` birlikte artar.

## Dispute düzeltme akışı
Bir aksiyon invalid edildiğinde:
1. Önce `sync(agent)` çalışır.
2. `daysSince = floor((now - actionTimestamp) / 1 day)` hesaplanır.
3. Decay faktörü chunked fixed-point matematikle tam hesaplanır.
4. Her boyutta `scores[d] * decayFactor / 1e18` kadar azaltım uygulanır; clamp-at-zero yapılır.
5. Yalnızca `validActionsCount` azaltılır.

## Normalizasyon
- Ağırlıklı boyut toplamı, 0..200 eşdeğer birim aralığında kalır.
- Düşük örneklem manipülasyonunu bastırmak için volume confidence uygulanır.
- Sonuç 0..1000 aralığına ölçeklenir ve clamp edilir.

## Tier aralıkları
- UNVERIFIED: 0-99
- PROVISIONAL: 100-299
- ESTABLISHED: 300-599
- TRUSTED: 600-849
- ELITE: 850-1000
