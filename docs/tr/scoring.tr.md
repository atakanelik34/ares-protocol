# ARI Skorlama Modeli (TR)

## Sabit Model
- 5 boyut, ağırlıklar: `[0.30, 0.25, 0.20, 0.15, 0.10]`
- Boyut skor aralığı: `0..200`
- `time_decay = exp(-lambda * days_since_action)`
- `volume_confidence = min(1, valid_actions_count / 100)`
- Final ARI: `0..1000`

## Engine Durumu
- `decayedSum[5]`
- `lastUpdate`
- `totalActionsCount`
- `validActionsCount`
- `firstActionAt`

## Düzeltme Akışı (Dispute)
- Invalid edilen aksiyonun etkisi fixed-point decay ile geri alınır.
- `validActionsCount` düşürülür, `totalActionsCount` audit izi olarak kalır.
- Büyük `daysSince` değerlerinde chunked decay ve saturating sınır kullanılır.

## Tier Aralıkları
- UNVERIFIED: 0-99
- PROVISIONAL: 100-299
- ESTABLISHED: 300-599
- TRUSTED: 600-849
- ELITE: 850-1000

## Tier-Stake Politika Referansı (Mainnet Hedef)
| Tier | Minimum Stake | Unstake Delay | Slash |
|---|---:|---:|---:|
| PROVISIONAL | 100 ARES | 30 gün | %10 |
| ESTABLISHED | 500 ARES | 60 gün | %20 |
| TRUSTED | 2,000 ARES | 90 gün | %30 |
| ELITE | 10,000 ARES | 180 gün | %50 |

Slash dağıtım referansı:
- %50 challenger
- %50 burn/treasury (governance parametresi)

## Not
Mainnet governance param seti bu eşikleri/slash oranlarını nihai olarak kilitleyecektir.
