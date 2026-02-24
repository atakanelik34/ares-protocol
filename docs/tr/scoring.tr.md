# ARI Skorlama Modeli

## Sabit model (degistirilemez)
- Boyut sayisi: 5
- Agirliklar: `[0.30, 0.25, 0.20, 0.15, 0.10]`
- `dimension_score` araligi: `0..200`
- `time_decay = exp(-lambda * days_since_action)`
- `volume_confidence = min(1, valid_actions_count / 100)`
- Final ARI araligi: `0..1000`

## Engine state
Her agent icin:
- `decayedSum[5]`
- `lastUpdate`
- `totalActionsCount`
- `validActionsCount`
- `firstActionAt`

## Fixed-point decay uygulamasi
- 1e18 fixed-point faktorler kullanilir.
- Temel ufuk icin `precomputedDecay[d]` tablosu kullanilir.
- Buyuk `d` degerlerinde precision kaybi ve cap riskini azaltmak icin chunked exponentiation kullanilir.
- Deterministik DoS guvenligi icin `daysSince`, `MAX_DAYS_SATURATION` (varsayilan 10000) ile saturate edilir.

## Guncelleme akisi
Yeni gecerli aksiyon skoru geldiginde:
1. Gecen sureyi decay etmek icin `sync(agent)` calisir.
2. Her boyut icin `scores[d]`, `decayedSum[d]` uzerine eklenir.
3. `totalActionsCount` ve `validActionsCount` birlikte artar.

## Dispute duzeltme akisi
Bir aksiyon invalid oldugunda:
1. Once `sync(agent)` calisir.
2. `daysSince = floor((now - actionTimestamp) / 1 day)` hesaplanir.
3. Decay faktoru chunked fixed-point ile tam hesaplanir.
4. Her boyutta `scores[d] * decayFactor / 1e18` kadar azaltim yapilir, clamp-at-zero uygulanir.
5. Yalnizca `validActionsCount` azaltilir.

## Normalizasyon
- Agirlikli boyut toplami 0..200 esdeger birime sinirlanir.
- Dusuk orneklem manipulasyonunu bastirmak icin volume confidence uygulanir.
- Sonuc 0..1000 araligina olceklenir ve clamp edilir.

## Tier araliklari
- UNVERIFIED: 0-99
- PROVISIONAL: 100-299
- ESTABLISHED: 300-599
- TRUSTED: 600-849
- ELITE: 850-1000
